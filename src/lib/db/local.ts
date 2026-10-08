import Dexie, { type EntityTable } from "dexie";
import type { Activity, Attendance } from "../../features/kegiatan/schema";
import type { Member } from "../../features/anggota/schema";
import type { Receipt, Transaction } from "../../features/kas/schema";
import type { SyncEntity, SyncOp } from "../auth/permissions";

/** Satu perubahan menunggu dikirim ke server. */
export type OutboxItem = {
  /** ID perubahan (UUID v7, terurut waktu => urutan kirim) */
  id: string;
  entity: SyncEntity;
  /** ID baris yang diubah (dipakai untuk idempotensi di server) */
  entityId: string;
  op: SyncOp;
  payload: unknown;
  clientUpdatedAt: string;
  /** menunggu = akan dikirim/dicoba ulang; ditolak = server menolak, butuh tindakan pengguna */
  status: "menunggu" | "ditolak";
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
};

export type MetaRow = { key: string; value: unknown };

export type LocalDB = Dexie & {
  members: EntityTable<Member, "id">;
  activities: EntityTable<Activity, "id">;
  attendances: EntityTable<Attendance, "id">;
  transactions: EntityTable<Transaction, "id">;
  receipts: EntityTable<Receipt, "id">;
  outbox: EntityTable<OutboxItem, "id">;
  meta: EntityTable<MetaRow, "key">;
};

export const db = new Dexie("perdana") as LocalDB;

/**
 * MIGRASI: jangan ubah version(1). Untuk mengubah skema, tambahkan blok version(n+1) baru
 * (lengkap dengan .upgrade() bila perlu mengubah data lama). Dexie menjalankan migrasi berurutan
 * dan data lokal (termasuk antrean outbox) tetap utuh saat aplikasi diperbarui.
 */
db.version(1).stores({
  members: "id, status, fullName",
  activities: "id, startDate, status",
  attendances: "id, activityId, memberId, [activityId+memberId]",
  transactions: "id, transactionDate, type, category, activityId, memberId, reversesTransactionId",
  receipts: "id, status",
  outbox: "id, status, entityId, createdAt",
  meta: "key",
});

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

/** Hapus semua data lokal (dipakai saat akun lain masuk dan tidak ada antrean tertunda). */
export async function wipeLocalData(): Promise<void> {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}
