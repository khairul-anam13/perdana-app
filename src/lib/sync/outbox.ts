import type { Activity, Attendance } from "../../features/kegiatan/schema";
import type { Member } from "../../features/anggota/schema";
import type { Transaction } from "../../features/kas/schema";
import type { SyncEntity, SyncOp } from "../auth/permissions";
import { db } from "../db/local";
import { newId } from "../id";
import { nowISO } from "../format/tanggal";
import { syncSoon } from "./engine";

type RowOf = {
  member: Member;
  activity: Activity;
  attendance: Attendance;
  transaction: Transaction;
};

const TABLE: Record<SyncEntity, string> = {
  member: "members",
  activity: "activities",
  attendance: "attendances",
  transaction: "transactions",
};

/**
 * Satu-satunya pintu tulis dari UI: simpan baris ke IndexedDB DAN masukkan ke antrean (outbox)
 * dalam satu transaksi lokal. UI langsung terbarui dari data lokal; jaringan menyusul.
 * Mengembalikan ID perubahan untuk melacak status sinkron.
 */
export async function writeAndEnqueue<E extends SyncEntity>(
  entity: E,
  op: SyncOp,
  row: RowOf[E],
  extra?: { alsoWrite?: () => Promise<unknown>; tables?: string[] },
): Promise<string> {
  const changeId = newId();
  const table = db.table(TABLE[entity]);
  await db.transaction("rw", [table, db.outbox, ...(extra?.tables ?? [])], async () => {
    await extra?.alsoWrite?.();
    await table.put(row);
    await db.outbox.add({
      id: changeId,
      entity,
      entityId: row.id,
      op,
      payload: row,
      clientUpdatedAt: row.updatedAt,
      status: "menunggu",
      attempts: 0,
      lastError: null,
      nextAttemptAt: null,
      createdAt: nowISO(),
    });
  });
  syncSoon();
  return changeId;
}

/** Apakah perubahan ini sudah tidak ada di antrean (artinya sudah diterima server)? */
export async function isSynced(changeId: string): Promise<boolean> {
  return (await db.outbox.get(changeId)) === undefined;
}
