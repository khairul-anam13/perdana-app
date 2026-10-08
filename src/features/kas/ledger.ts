import type { Transaction, TxType } from "./schema";

/**
 * Logika kas murni (tanpa I/O) supaya mudah diuji.
 * Kas append-only: saldo selalu dihitung dari penjumlahan transaksi, tidak pernah disimpan.
 * Koreksi = transaksi pembalik bertipe berlawanan dengan nominal sama yang merujuk transaksi asal.
 */

export const opposite = (t: TxType): TxType => (t === "pemasukan" ? "pengeluaran" : "pemasukan");

type Amounted = Pick<Transaction, "type" | "amount">;

/** Saldo = total pemasukan - total pengeluaran (transaksi pembalik ikut dihitung apa adanya). */
export function balance(txs: readonly Amounted[]): number {
  let sum = 0;
  for (const t of txs) sum += t.type === "pemasukan" ? t.amount : -t.amount;
  return sum;
}

export const byIdMap = (txs: readonly Transaction[]) => new Map(txs.map((t) => [t.id, t]));

/** ID transaksi asal yang sudah pernah dikoreksi. */
export function reversedIds(txs: readonly Transaction[]): Set<string> {
  const out = new Set<string>();
  for (const t of txs) if (t.reversesTransactionId) out.add(t.reversesTransactionId);
  return out;
}

export const isReversal = (t: Transaction) => t.reversesTransactionId !== null;

/** Transaksi asal boleh dikoreksi sekali, dan pembalik tidak boleh dikoreksi lagi. */
export const canReverse = (t: Transaction, reversed: ReadonlySet<string>) =>
  !isReversal(t) && !reversed.has(t.id);

/**
 * Pos laporan sebuah transaksi: pembalik dihitung sebagai pengurang pos transaksi asalnya,
 * sehingga "pemasukan bulan ini" tidak membengkak oleh koreksi.
 * Jika asal tidak diketahui, dianggap pos berlawanan dari tipe pembalik.
 */
function signedInBucket(
  t: Transaction,
  byId: Map<string, Transaction>,
): { type: TxType; amount: number } {
  if (!t.reversesTransactionId) return { type: t.type, amount: t.amount };
  const origin = byId.get(t.reversesTransactionId);
  return { type: origin?.type ?? opposite(t.type), amount: -t.amount };
}

export type Summary = { income: number; expense: number; net: number };

/** Ringkasan pemasukan/pengeluaran untuk sekumpulan transaksi (mis. satu bulan). */
export function summarize(subset: readonly Transaction[], all: readonly Transaction[]): Summary {
  const byId = byIdMap(all);
  let income = 0;
  let expense = 0;
  for (const t of subset) {
    const s = signedInBucket(t, byId);
    if (s.type === "pemasukan") income += s.amount;
    else expense += s.amount;
  }
  return { income, expense, net: income - expense };
}

/** Total per kategori dalam satu pos, urut dari terbesar. */
export function byCategory(
  subset: readonly Transaction[],
  all: readonly Transaction[],
  type: TxType,
): { category: string; total: number }[] {
  const byId = byIdMap(all);
  const totals = new Map<string, number>();
  for (const t of subset) {
    const s = signedInBucket(t, byId);
    if (s.type !== type) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + s.amount);
  }
  return [...totals]
    .map(([category, total]) => ({ category, total }))
    .filter((r) => r.total !== 0)
    .sort((a, b) => b.total - a.total);
}

/** Bentuk transaksi pembalik dari transaksi asal. Pemanggil memastikan canReverse() lebih dulu. */
export function buildReversal(
  original: Transaction,
  ctx: { id: string; now: string; today: string; userId: string; note?: string | null },
): Transaction {
  return {
    id: ctx.id,
    organizationId: original.organizationId,
    type: opposite(original.type),
    amount: original.amount,
    category: original.category,
    note: ctx.note?.trim() ? ctx.note.trim() : `Koreksi: ${original.note ?? original.category}`,
    transactionDate: ctx.today,
    activityId: original.activityId,
    memberId: original.memberId,
    reversesTransactionId: original.id,
    receiptId: null,
    createdBy: ctx.userId,
    createdAt: ctx.now,
    updatedAt: ctx.now,
    deletedAt: null,
  };
}

/** Status iuran per anggota untuk satu bulan: total iuran (setelah koreksi) per memberId. */
export function iuranPaid(
  monthTxs: readonly Transaction[],
  all: readonly Transaction[],
  category: string,
) {
  const byId = byIdMap(all);
  const paid = new Map<string, number>();
  for (const t of monthTxs) {
    if (t.category !== category || !t.memberId) continue;
    const s = signedInBucket(t, byId);
    if (s.type !== "pemasukan") continue;
    paid.set(t.memberId, (paid.get(t.memberId) ?? 0) + s.amount);
  }
  return paid;
}
