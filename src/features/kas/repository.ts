import { db } from "@/lib/db/local";
import type { SessionUser } from "@/lib/auth/session";
import { nowISO, todayISO } from "@/lib/format/tanggal";
import { newId } from "@/lib/id";
import { writeAndEnqueue } from "@/lib/sync/outbox";
import { buildReversal } from "./ledger";
import type { Transaction, TransactionForm } from "./schema";

export async function listTransactions(): Promise<Transaction[]> {
  // Kas append-only: tidak ada baris terhapus, tapi tetap saring demi keamanan.
  const rows = await db.transactions.filter((t) => !t.deletedAt).toArray();
  return rows.sort((a, b) =>
    a.transactionDate === b.transactionDate
      ? b.createdAt.localeCompare(a.createdAt)
      : b.transactionDate.localeCompare(a.transactionDate),
  );
}

/** Catat transaksi baru, dengan foto nota opsional (sudah dikompres). Mengembalikan ID perubahan. */
export async function saveTransaction(
  form: TransactionForm,
  user: SessionUser,
  receipt?: Blob | null,
): Promise<string> {
  const now = nowISO();
  const receiptId = receipt ? newId() : null;
  const row: Transaction = {
    id: newId(),
    organizationId: user.organizationId,
    type: form.type,
    amount: form.amount,
    category: form.category,
    note: form.note?.trim() || null,
    transactionDate: form.transactionDate,
    activityId: form.activityId ?? null,
    memberId: form.memberId ?? null,
    reversesTransactionId: null,
    receiptId,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  return writeAndEnqueue("transaction", "create", row, {
    tables: receipt ? ["receipts"] : [],
    alsoWrite: receipt
      ? () =>
          db.receipts.put({
            id: receiptId!,
            organizationId: user.organizationId,
            status: "menunggu",
            mime: receipt.type || "image/jpeg",
            size: receipt.size,
            blob: receipt,
            attempts: 0,
            lastError: null,
            nextAttemptAt: null,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now,
          })
      : undefined,
  });
}

/** Koreksi = transaksi pembalik. Mengembalikan null bila transaksi sudah pernah dikoreksi / sudah berupa koreksi. */
export async function reverseTransaction(
  original: Transaction,
  user: SessionUser,
  note?: string,
): Promise<string | null> {
  if (original.reversesTransactionId) return null;
  const already = await db.transactions.where("reversesTransactionId").equals(original.id).count();
  if (already > 0) return null;
  const reversal = buildReversal(original, {
    id: newId(),
    now: nowISO(),
    today: todayISO(),
    userId: user.id,
    note,
  });
  return writeAndEnqueue("transaction", "create", reversal);
}
