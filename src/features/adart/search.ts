import { BAB, BELUM_TERTULIS, type Bab, type Pasal } from "./data";

const strip = (s: string) => s.replaceAll("**", "");

/** Kata kunci dari kotak cari: huruf kecil, dipisah spasi. */
export const tokenize = (q: string): string[] => q.toLowerCase().split(/\s+/).filter(Boolean);

/** Semua kata kunci harus ada di teks (urutan bebas). */
export const cocok = (tokens: readonly string[], text: string): boolean => {
  const t = strip(text).toLowerCase();
  return tokens.every((k) => t.includes(k));
};

/** Teks yang dicari untuk satu pasal: nomor, judul bab, judul pasal, dan semua ayat. */
export function teksPasal(bab: Bab, p: Pasal): string {
  return [
    `pasal ${p.no}`,
    `bab ${bab.no}`,
    bab.judul,
    p.judul,
    p.pengantar,
    p.teks,
    p.belumDiatur ? "belum diatur" : undefined,
    ...(p.ayat ?? []).flatMap((a) => [a.teks, ...(a.sub ?? [])]),
  ]
    .filter(Boolean)
    .join(" ");
}

/** "pasal 9" atau "ps 9" = lompat ke pasal itu (bukan semua teks yang memuat angka 9). */
export function nomorPasal(q: string): number | null {
  const m = q
    .trim()
    .toLowerCase()
    .match(/^(?:pasal|ps\.?)\s*(\d{1,2})$/);
  return m ? Number(m[1]) : null;
}

export type HasilBab = { bab: Bab; pasal: Pasal[] };

/** Pasal yang cocok, dikelompokkan per bab (urutan naskah). Kosong = semua pasal. */
export function cariPasal(q: string, daftar: readonly Bab[] = BAB): HasilBab[] {
  const tokens = tokenize(q);
  const no = nomorPasal(q);
  const out: HasilBab[] = [];
  for (const bab of daftar) {
    const pasal = bab.pasal.filter((p) =>
      no !== null ? p.no === no : cocok(tokens, teksPasal(bab, p)),
    );
    if (pasal.length) out.push({ bab, pasal });
  }
  return out;
}

/** Baris "belum tertulis" yang cocok dengan kata kunci. */
export const cariBelumTertulis = (q: string) => {
  const tokens = tokenize(q);
  return BELUM_TERTULIS.filter((r) =>
    cocok(tokens, `${r.pasal} ${r.hal} ${r.isi ?? "belum tertulis"}`),
  );
};
