import { describe, expect, it } from "vitest";
import { newId } from "../../lib/id";
import {
  balance,
  buildReversal,
  byCategory,
  canReverse,
  iuranPaid,
  reversedIds,
  summarize,
} from "./ledger";
import type { Transaction } from "./schema";

const ORG = newId();
const USER = newId();

function tx(p: Partial<Transaction> & Pick<Transaction, "type" | "amount">): Transaction {
  return {
    id: newId(),
    organizationId: ORG,
    category: "Lainnya",
    note: null,
    transactionDate: "2026-10-05",
    activityId: null,
    memberId: null,
    reversesTransactionId: null,
    receiptId: null,
    createdBy: USER,
    createdAt: "2026-10-05T01:00:00.000Z",
    updatedAt: "2026-10-05T01:00:00.000Z",
    deletedAt: null,
    ...p,
  };
}

const reverse = (o: Transaction) =>
  buildReversal(o, {
    id: newId(),
    now: "2026-10-06T01:00:00.000Z",
    today: "2026-10-06",
    userId: USER,
  });

describe("saldo", () => {
  it("dihitung dari penjumlahan transaksi", () => {
    expect(balance([])).toBe(0);
    expect(
      balance([
        tx({ type: "pemasukan", amount: 100_000 }),
        tx({ type: "pengeluaran", amount: 30_000 }),
      ]),
    ).toBe(70_000);
  });

  it("bisa negatif bila pengeluaran lebih besar", () => {
    expect(balance([tx({ type: "pengeluaran", amount: 5_000 })])).toBe(-5_000);
  });
});

describe("transaksi pembalik (koreksi)", () => {
  it("membatalkan efek ke saldo tanpa mengubah transaksi asal", () => {
    const original = tx({
      type: "pengeluaran",
      amount: 80_000,
      category: "Konsumsi",
      note: "Nasi kotak",
    });
    const snapshot = structuredClone(original);
    const reversal = reverse(original);

    expect(original).toEqual(snapshot); // asal tidak disentuh
    expect(reversal.type).toBe("pemasukan");
    expect(reversal.amount).toBe(80_000);
    expect(reversal.reversesTransactionId).toBe(original.id);
    expect(balance([tx({ type: "pemasukan", amount: 200_000 }), original, reversal])).toBe(200_000);
  });

  it("hanya boleh dikoreksi sekali, dan koreksi tidak bisa dikoreksi lagi", () => {
    const original = tx({ type: "pemasukan", amount: 10_000 });
    const reversal = reverse(original);
    const all = [original, reversal];
    const reversed = reversedIds(all);

    expect(canReverse(original, new Set())).toBe(true);
    expect(canReverse(original, reversed)).toBe(false);
    expect(canReverse(reversal, reversed)).toBe(false);
  });

  it("ringkasan bulanan tidak membengkak: koreksi mengurangi pos asalnya", () => {
    const income = tx({ type: "pemasukan", amount: 50_000 });
    const wrong = tx({ type: "pemasukan", amount: 20_000 });
    const all = [income, wrong, reverse(wrong)];

    const s = summarize(all, all);
    expect(s.income).toBe(50_000); // 50.000 + 20.000 - 20.000
    expect(s.expense).toBe(0);
    expect(s.net).toBe(balance(all));
  });

  it("koreksi lintas bulan tetap benar bila transaksi asal dicari dari seluruh data", () => {
    const wrong = tx({ type: "pengeluaran", amount: 40_000, transactionDate: "2026-09-28" });
    const reversal = reverse(wrong); // dicatat Oktober
    const s = summarize([reversal], [wrong, reversal]);
    expect(s.expense).toBe(-40_000);
    expect(s.income).toBe(0);
  });

  it("total per kategori memperhitungkan koreksi", () => {
    const a = tx({ type: "pengeluaran", amount: 70_000, category: "Konsumsi" });
    const b = tx({ type: "pengeluaran", amount: 30_000, category: "Sewa tempat" });
    const all = [a, b, reverse(a)];
    expect(byCategory(all, all, "pengeluaran")).toEqual([
      { category: "Sewa tempat", total: 30_000 },
    ]);
  });
});

describe("iuran", () => {
  it("lunas bila ada iuran bulan itu, dan batal bila dikoreksi", () => {
    const m1 = newId();
    const m2 = newId();
    const paid1 = tx({ type: "pemasukan", amount: 20_000, category: "Iuran", memberId: m1 });
    const paid2 = tx({ type: "pemasukan", amount: 20_000, category: "Iuran", memberId: m2 });
    const all = [paid1, paid2, reverse(paid2)];

    const paid = iuranPaid(all, all, "Iuran");
    expect(paid.get(m1)).toBe(20_000);
    expect(paid.get(m2)).toBe(0);
  });
});
