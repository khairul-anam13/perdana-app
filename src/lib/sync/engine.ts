import type { EntityTable } from "dexie";
import { db, getMeta, setMeta, wipeLocalData, type OutboxItem } from "../db/local";
import { getSession, markSessionExpired, saveSession } from "../auth/session";
import { nowISO } from "../format/tanggal";
import { emitSyncDone, setSyncState } from "./status";
import {
  MAX_PUSH_BATCH,
  PULL_LIMIT,
  type PullResponse,
  type PushResponse,
  type ReceiptMeta,
} from "./protocol";

/**
 * Mesin sinkronisasi. Urutan satu putaran: push antrean -> unggah nota -> pull perubahan.
 * Aman dijalankan dobel (halaman + service worker): server idempoten, dan Web Locks mencegah tumpang tindih.
 * Tidak memakai React/DOM supaya bisa dipanggil dari service worker (Background Sync).
 */

export type SyncOutcome = { ok: boolean; error?: string; skipped?: boolean };

class NetworkError extends Error {}
class AuthError extends Error {}

const MAX_BACKOFF_MS = 5 * 60_000;
/** Jeda coba ulang: 2s, 4s, 8s, ... maksimal 5 menit, dengan sedikit acak. */
export const backoffMs = (attempts: number): number =>
  Math.min(MAX_BACKOFF_MS, 2000 * 2 ** attempts) * (0.75 + Math.random() * 0.5);

const laterISO = (ms: number) => new Date(Date.now() + ms).toISOString();

async function api(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", cache: "no-store", ...init });
  } catch {
    throw new NetworkError("Tidak bisa terhubung ke server");
  }
  if (res.status === 401) {
    markSessionExpired();
    throw new AuthError("Sesi habis. Masuk lagi saat online.");
  }
  return res;
}

async function failItems(items: OutboxItem[], message: string): Promise<void> {
  await db.transaction("rw", db.outbox, async () => {
    for (const it of items) {
      const attempts = it.attempts + 1;
      await db.outbox.update(it.id, {
        attempts,
        lastError: message,
        nextAttemptAt: laterISO(backoffMs(attempts)),
      });
    }
  });
}

async function pushOutbox(manual: boolean): Promise<void> {
  for (;;) {
    const now = nowISO();
    const pending = await db.outbox.where("status").equals("menunggu").sortBy("id"); // UUID v7 => urutan buat
    const items = pending
      .filter((i) => manual || !i.nextAttemptAt || i.nextAttemptAt <= now)
      .slice(0, MAX_PUSH_BATCH);
    if (items.length === 0) return;

    let res: Response;
    try {
      res = await api("/api/sync/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changes: items.map((i) => ({
            changeId: i.id,
            id: i.entityId,
            entity: i.entity,
            op: i.op,
            payload: i.payload,
            clientUpdatedAt: i.clientUpdatedAt,
          })),
        }),
      });
    } catch (e) {
      if (e instanceof NetworkError) await failItems(items, e.message);
      throw e;
    }
    if (!res.ok) {
      await failItems(items, `Server bermasalah (${res.status})`);
      throw new NetworkError(`Server bermasalah (${res.status})`);
    }

    const body = (await res.json()) as PushResponse;
    const results = new Map(body.results.map((r) => [r.changeId, r]));
    const unanswered: OutboxItem[] = [];
    await db.transaction("rw", db.outbox, async () => {
      for (const it of items) {
        const r = results.get(it.id);
        if (!r) unanswered.push(it);
        else if (r.status === "ditolak")
          await db.outbox.update(it.id, {
            status: "ditolak",
            lastError: r.reason ?? "Ditolak server",
            attempts: it.attempts + 1,
            nextAttemptAt: null,
          });
        else await db.outbox.delete(it.id); // ok / duplikat: server sudah punya
      }
    });
    if (unanswered.length) {
      await failItems(unanswered, "Server tidak menjawab item ini");
      throw new NetworkError("Jawaban server tidak lengkap");
    }
  }
}

async function uploadReceipts(manual: boolean): Promise<void> {
  const now = nowISO();
  const rows = await db.receipts.where("status").equals("menunggu").toArray();
  for (const r of rows) {
    if (!r.blob) continue;
    if (!manual && r.nextAttemptAt && r.nextAttemptAt > now) continue;
    const res = await api(`/api/receipts/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": r.mime },
      body: r.blob,
    });
    if (res.ok) {
      await db.receipts.update(r.id, { status: "terunggah", lastError: null, nextAttemptAt: null });
      continue;
    }
    const attempts = r.attempts + 1;
    const msg =
      res.status >= 500 ? `Server bermasalah (${res.status})` : `Nota ditolak (${res.status})`;
    await db.receipts.update(r.id, {
      attempts,
      lastError: msg,
      nextAttemptAt: laterISO(backoffMs(attempts)),
    });
    if (res.status >= 500) throw new NetworkError(msg);
  }
}

type LwwRow = { id: string; updatedAt: string };

/** Last-write-wins: terima baris server kecuali ada perubahan lokal yang menunggu atau lokal lebih baru. */
async function mergeLww<T extends LwwRow>(
  table: EntityTable<T, "id">,
  rows: T[],
  pending: Set<string>,
): Promise<void> {
  if (rows.length === 0) return;
  const locals = await table.bulkGet(rows.map((r) => r.id) as never);
  const accept = rows.filter((r, i) => {
    const local = locals[i];
    return !pending.has(r.id) && !(local && local.updatedAt > r.updatedAt);
  });
  await table.bulkPut(accept as never);
}

async function applyPull(data: PullResponse): Promise<void> {
  await db.transaction(
    "rw",
    [db.members, db.activities, db.attendances, db.transactions, db.receipts, db.outbox, db.meta],
    async () => {
      const pendingItems = await db.outbox.where("status").equals("menunggu").toArray();
      const pending = new Set(pendingItems.map((i) => i.entityId));
      const { changes } = data;

      await mergeLww(db.members, changes.members, pending);
      await mergeLww(db.activities, changes.activities, pending);
      await mergeLww(db.transactions, changes.transactions, pending);

      // Absensi: satu baris per (kegiatan, anggota). Jika server punya baris lain untuk pasangan yang sama,
      // buang duplikat lokal (kecuali yang masih menunggu dikirim).
      for (const a of changes.attendances) {
        const dups = await db.attendances
          .where("[activityId+memberId]")
          .equals([a.activityId, a.memberId])
          .filter((x) => x.id !== a.id && !pending.has(x.id))
          .primaryKeys();
        if (dups.length) await db.attendances.bulkDelete(dups);
      }
      await mergeLww(db.attendances, changes.attendances, pending);

      for (const m of changes.receipts as ReceiptMeta[]) {
        const local = await db.receipts.get(m.id);
        if (local?.status === "menunggu" && local.blob) continue; // masih akan diunggah
        await db.receipts.put({
          id: m.id,
          organizationId: m.organizationId,
          status: "terunggah",
          mime: m.mime,
          size: m.size,
          blob: local?.blob,
          attempts: 0,
          lastError: null,
          nextAttemptAt: null,
          createdBy: m.createdBy,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        });
      }

      await setMeta("cursor", data.cursor);
      await setMeta("organization", data.organization);
    },
  );
  const session = getSession();
  if (session) {
    // Peran bisa berubah di server. Server menyaring kontak anggota menurut peran, jadi ambil ulang
    // semua data pada putaran berikutnya agar isinya sesuai peran baru.
    if (session.user.role !== data.me.role) await setMeta("cursor", 0);
    saveSession({ ...session, user: data.me });
  }
}

async function pullChanges(): Promise<void> {
  for (;;) {
    const since = (await getMeta<number>("cursor")) ?? 0;
    const res = await api(`/api/sync/pull?since=${since}&limit=${PULL_LIMIT}`);
    if (!res.ok) throw new NetworkError(`Server bermasalah (${res.status})`);
    const data = (await res.json()) as PullResponse;
    await applyPull(data);
    if (!data.hasMore || data.cursor <= since) return;
  }
}

async function doSync(manual: boolean): Promise<SyncOutcome> {
  if (!getSession() && typeof localStorage !== "undefined")
    return { ok: false, error: "Belum masuk" };
  setSyncState({ syncing: true });
  try {
    await pushOutbox(manual);
    await uploadReceipts(manual);
    await pullChanges();
    await setMeta("lastSyncAt", nowISO());
    setSyncState({ lastError: null });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Sinkronisasi gagal";
    setSyncState({ lastError: error });
    return { ok: false, error };
  } finally {
    setSyncState({ syncing: false });
    emitSyncDone();
  }
}

let running: Promise<SyncOutcome> | null = null;

/**
 * Jalankan satu putaran sinkronisasi. `manual` mengabaikan jeda backoff (tombol "Sinkronkan sekarang").
 * Pemanggilan ganda digabung; Web Locks mencegah jendela/service worker lain berjalan bersamaan.
 */
export function syncNow(opts: { manual?: boolean } = {}): Promise<SyncOutcome> {
  if (running) return running;
  if (typeof navigator !== "undefined" && navigator.onLine === false)
    return Promise.resolve({ ok: false, error: "Sedang offline" });
  const run = async (): Promise<SyncOutcome> => {
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
    if (!locks) return doSync(!!opts.manual);
    const out = await locks.request("perdana-sync", { ifAvailable: true }, async (lock) =>
      lock ? doSync(!!opts.manual) : ({ ok: true, skipped: true } satisfies SyncOutcome),
    );
    return out;
  };
  running = run().finally(() => {
    running = null;
  });
  return running;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Jadwalkan sinkronisasi sebentar lagi (menggabungkan banyak simpanan beruntun). */
export function syncSoon(delayMs = 400): void {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delayMs);
  void registerBackgroundSync();
}

type SyncCapableRegistration = ServiceWorkerRegistration & {
  sync?: { register(tag: string): Promise<void> };
};
export const BACKGROUND_SYNC_TAG = "perdana-sync";

/** Opsional: iOS Safari tidak mendukung, jadi jangan bergantung padanya. */
async function registerBackgroundSync(): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const reg = (await navigator.serviceWorker.ready) as SyncCapableRegistration;
    await reg.sync?.register(BACKGROUND_SYNC_TAG);
  } catch {
    /* tidak didukung / ditolak */
  }
}

/** Buang perubahan yang ditolak server. Baris lokalnya dihapus agar tidak jadi "data hantu". */
export async function discardRejected(item: OutboxItem): Promise<void> {
  const table = {
    member: db.members,
    activity: db.activities,
    attendance: db.attendances,
    transaction: db.transactions,
  }[item.entity] as EntityTable<LwwRow, "id">;
  await db.transaction("rw", [table, db.outbox, db.meta], async () => {
    await db.outbox.delete(item.id);
    await table.delete(item.entityId);
    if (item.op !== "create") await setMeta("cursor", 0); // ambil ulang versi server
  });
  syncSoon(0);
}

export async function resetLocalForNewUser(): Promise<void> {
  await wipeLocalData();
}
