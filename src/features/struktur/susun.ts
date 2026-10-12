import type { Member } from "../anggota/schema";

/** Jabatan inti menurut AD/ART Pasal 11 ayat 1; selebihnya dianggap seksi atau bidang. */
export const JABATAN_INTI = ["Ketua", "Wakil Ketua", "Sekretaris", "Bendahara"] as const;

/** Masa jabatan satu periode: 2 tahun (Pasal 11 ayat 3). */
export const MASA_JABATAN = 2;

export type Kotak = { jabatan: string; pemegang: Member[] };

/**
 * Bagan dari data anggota: jabatan = kolom `position` anggota aktif. Satu sumber kebenaran,
 * jadi mengubah jabatan di daftar anggota otomatis mengubah bagan.
 * Pemegang jabatan bisa lebih dari satu (mis. dua anggota di satu seksi).
 */
export function susunStruktur(members: readonly Member[]): { inti: Kotak[]; seksi: Kotak[] } {
  const byKey = new Map<string, Kotak>();
  for (const m of members) {
    const jabatan = m.position.trim();
    const key = jabatan.toLowerCase();
    if (m.status !== "aktif" || !key || key === "anggota") continue;
    const kotak = byKey.get(key) ?? { jabatan, pemegang: [] };
    kotak.pemegang.push(m);
    byKey.set(key, kotak);
  }
  const inti = JABATAN_INTI.map((j) => {
    const k = byKey.get(j.toLowerCase());
    byKey.delete(j.toLowerCase());
    return { jabatan: j, pemegang: k?.pemegang ?? [] };
  });
  const seksi = [...byKey.values()].sort((a, b) => a.jabatan.localeCompare(b.jabatan, "id"));
  return { inti, seksi };
}

/** "2024-2026" untuk periode yang dimulai tahun 2024. */
export const labelPeriode = (start: number) => `${start}–${start + MASA_JABATAN}`;
