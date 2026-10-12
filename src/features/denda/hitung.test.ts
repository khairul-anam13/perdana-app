import { describe, expect, it } from "vitest";
import type { Member } from "../anggota/schema";
import type { Transaction } from "../kas/schema";
import type { Activity, Attendance } from "../kegiatan/schema";
import { hitungDenda } from "./hitung";

const T = "2026-01-01T00:00:00.000Z";
const member = (id: string, fullName: string): Member => ({
  id,
  organizationId: "o",
  fullName,
  nickname: null,
  gender: "L",
  birthDate: null,
  phone: null,
  address: null,
  dusun: null,
  position: "Anggota",
  status: "aktif",
  joinedAt: "2024-01-01",
  createdBy: null,
  createdAt: T,
  updatedAt: T,
  deletedAt: null,
});
const activity = (id: string, startDate: string, deletedAt: string | null = null): Activity => ({
  id,
  organizationId: "o",
  title: `Kegiatan ${id}`,
  description: null,
  startDate,
  endDate: null,
  location: null,
  status: "selesai",
  leaderId: null,
  createdBy: null,
  createdAt: T,
  updatedAt: T,
  deletedAt,
});
const absen = (activityId: string, memberId: string, status: Attendance["status"]): Attendance => ({
  id: `${activityId}-${memberId}`,
  organizationId: "o",
  activityId,
  memberId,
  status,
  recordedAt: T,
  recordedBy: null,
  createdBy: null,
  createdAt: T,
  updatedAt: T,
  deletedAt: null,
});
const bayar = (
  id: string,
  memberId: string,
  amount: number,
  o: Partial<Transaction> = {},
): Transaction => ({
  id,
  organizationId: "o",
  type: "pemasukan",
  amount,
  category: "Denda",
  note: null,
  transactionDate: "2026-02-01",
  activityId: null,
  memberId,
  reversesTransactionId: null,
  receiptId: null,
  createdBy: null,
  createdAt: T,
  updatedAt: T,
  deletedAt: null,
  ...o,
});

const members = [member("a", "Ayu"), member("b", "Budi"), member("c", "Citra")];
const activities = [
  activity("k1", "2026-01-10"),
  activity("k2", "2026-01-20"),
  activity("k3", "2026-01-30", T),
];

describe("hitungDenda", () => {
  it("hanya alpa yang didenda; izin, hadir, dan kegiatan terhapus tidak dihitung", () => {
    const rows = hitungDenda({
      members,
      activities,
      attendances: [
        absen("k1", "a", "alpa"),
        absen("k2", "a", "alpa"),
        absen("k1", "b", "izin"),
        absen("k3", "c", "alpa"),
      ],
      txs: [],
      tarif: 5_000,
    });
    expect(rows.map((r) => [r.member.fullName, r.alpa.length, r.terutang, r.sisa])).toEqual([
      ["Ayu", 2, 10_000, 10_000],
    ]);
    expect(rows[0].alpa[0].date).toBe("2026-01-20"); // terbaru dulu
  });

  it("dibayar mengurangi sisa, tak pernah negatif, dan koreksi membatalkan pembayaran", () => {
    const rows = hitungDenda({
      members,
      activities,
      attendances: [absen("k1", "a", "alpa"), absen("k2", "a", "alpa"), absen("k1", "b", "alpa")],
      txs: [
        bayar("t1", "a", 4_000),
        bayar("t2", "b", 9_000), // lebih bayar
        bayar("t3", "b", 9_000),
        bayar("t4", "b", 9_000, { type: "pengeluaran", reversesTransactionId: "t3" }), // koreksi t3
      ],
      tarif: 5_000,
    });
    const by = Object.fromEntries(rows.map((r) => [r.member.fullName, r]));
    expect(by.Ayu.sisa).toBe(6_000);
    expect(by.Budi.dibayar).toBe(9_000);
    expect(by.Budi.sisa).toBe(0);
  });

  it("tarif belum diatur: alpa dan pembayaran tetap tampil, terutang 0", () => {
    const rows = hitungDenda({
      members,
      activities,
      attendances: [absen("k1", "a", "alpa")],
      txs: [bayar("t1", "c", 3_000)],
      tarif: null,
    });
    expect(rows.map((r) => [r.member.fullName, r.alpa.length, r.terutang, r.dibayar])).toEqual([
      ["Ayu", 1, 0, 0],
      ["Citra", 0, 0, 3_000],
    ]);
  });
});
