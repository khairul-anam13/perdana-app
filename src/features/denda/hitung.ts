import { CATEGORY_DENDA } from "@/lib/auth/permissions";
import type { Member } from "../anggota/schema";
import { iuranPaid } from "../kas/ledger";
import type { Transaction } from "../kas/schema";
import type { Activity, Attendance } from "../kegiatan/schema";

export type BarisDenda = {
  member: Member;
  /** kegiatan yang membuatnya alpa (tidak hadir tanpa keterangan), terbaru dulu */
  alpa: { date: string; title: string }[];
  /** total kas kategori Denda atas nama anggota (sudah memperhitungkan koreksi) */
  dibayar: number;
  terutang: number;
  sisa: number;
};

/**
 * Denda ketertiban dihitung dari data yang sudah ada, tanpa tabel baru:
 *   terutang = jumlah absensi "alpa" x tarif;  dibayar = kas kategori Denda per anggota.
 * Hanya "alpa" yang ditulis eksplisit yang dihitung; anggota yang belum diabsen tidak didenda.
 * ponytail: satu tarif berlaku surut untuk semua alpa; simpan nominal per kejadian bila tarif sering berubah.
 */
export function hitungDenda(args: {
  members: readonly Member[];
  activities: readonly Activity[];
  attendances: readonly Attendance[];
  txs: readonly Transaction[];
  tarif: number | null;
}): BarisDenda[] {
  const { members, activities, attendances, txs, tarif } = args;
  const kegiatan = new Map(activities.filter((a) => !a.deletedAt).map((a) => [a.id, a]));
  const alpaBy = new Map<string, BarisDenda["alpa"]>();
  for (const a of attendances) {
    const k = kegiatan.get(a.activityId);
    if (a.deletedAt || a.status !== "alpa" || !k) continue;
    alpaBy.set(a.memberId, [
      ...(alpaBy.get(a.memberId) ?? []),
      { date: k.startDate, title: k.title },
    ]);
  }
  const dibayarBy = iuranPaid(txs, txs, CATEGORY_DENDA);

  return members
    .map((member): BarisDenda => {
      const alpa = (alpaBy.get(member.id) ?? []).sort((a, b) => b.date.localeCompare(a.date));
      const dibayar = dibayarBy.get(member.id) ?? 0;
      const terutang = alpa.length * (tarif ?? 0);
      return { member, alpa, dibayar, terutang, sisa: Math.max(0, terutang - dibayar) };
    })
    .filter((r) => r.alpa.length > 0 || r.dibayar > 0)
    .sort(
      (a, b) =>
        b.sisa - a.sisa ||
        b.alpa.length - a.alpa.length ||
        a.member.fullName.localeCompare(b.member.fullName, "id"),
    );
}
