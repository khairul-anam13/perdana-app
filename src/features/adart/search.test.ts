import { describe, expect, it } from "vitest";
import { BAB } from "./data";
import { cariBelumTertulis, cariPasal, nomorPasal } from "./search";

const nomor = (q: string) => cariPasal(q).flatMap((h) => h.pasal.map((p) => p.no));

describe("naskah AD/ART", () => {
  it("pasal 1 sampai 13 lengkap, berurutan, tanpa ganda", () => {
    const semua = BAB.flatMap((b) => b.pasal.map((p) => p.no));
    expect(semua).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
  });

  it("setiap pasal punya isi (teks atau ayat)", () => {
    for (const p of BAB.flatMap((b) => b.pasal))
      expect(p.teks || p.ayat?.length, `Pasal ${p.no}`).toBeTruthy();
  });
});

describe("cari pasal", () => {
  it("kosong = semua pasal", () => {
    expect(nomor("")).toHaveLength(13);
    expect(nomor("   ")).toHaveLength(13);
  });

  it("cocok per kata, tak peduli huruf besar dan urutan", () => {
    expect(nomor("DENDA")).toEqual([9]);
    expect(nomor("iuran tahunan")).toEqual([9, 12]);
    expect(nomor("tahunan iuran")).toEqual([9, 12]);
  });

  it("nominal tebal (**) tetap bisa dicari tanpa tanda bintang", () => {
    expect(nomor("3.000.000")).toEqual([9]);
  });

  it('"pasal 9" lompat ke pasal 9 saja, bukan semua yang memuat angka 9', () => {
    expect(nomorPasal("Pasal 9")).toBe(9);
    expect(nomorPasal("ps. 12")).toBe(12);
    expect(nomorPasal("pasal sembilan")).toBeNull();
    expect(nomor("pasal 1")).toEqual([1]);
  });

  it("bisa dicari lewat judul bab dan label belum diatur", () => {
    expect(nomor("sumber dana")).toContain(12);
    // Pasal 4 ditandai belum diatur; Pasal 13 memuat frasa "yang belum diatur" di isinya.
    expect(nomor("belum diatur")).toEqual([4, 13]);
  });

  it("tidak ketemu = kosong", () => {
    expect(nomor("xyzzy")).toEqual([]);
  });

  it("baris belum tertulis ikut dicari", () => {
    expect(cariBelumTertulis("jumlah iuran")).toHaveLength(2);
    expect(cariBelumTertulis("")).toHaveLength(7);
  });
});
