import { describe, expect, it } from "vitest";
import type { Member } from "../anggota/schema";
import { labelPeriode, susunStruktur } from "./susun";

const m = (fullName: string, position: string, status: Member["status"] = "aktif"): Member => ({
  id: fullName,
  organizationId: "o",
  fullName,
  nickname: null,
  gender: "L",
  birthDate: null,
  phone: null,
  address: null,
  dusun: null,
  position,
  status,
  joinedAt: "2024-01-01",
  createdBy: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  deletedAt: null,
});

describe("susunStruktur", () => {
  it("jabatan inti selalu ada, kosong bila belum terisi, urutan tetap", () => {
    const { inti } = susunStruktur([m("Budi", "Ketua"), m("Sari", "bendahara")]);
    expect(inti.map((k) => k.jabatan)).toEqual(["Ketua", "Wakil Ketua", "Sekretaris", "Bendahara"]);
    expect(inti.map((k) => k.pemegang.map((x) => x.fullName))).toEqual([
      ["Budi"],
      [],
      [],
      ["Sari"],
    ]);
  });

  it("anggota biasa, nonaktif, dan alumni tidak masuk bagan", () => {
    const { inti, seksi } = susunStruktur([
      m("A", "Anggota"),
      m("B", "Ketua", "nonaktif"),
      m("C", "Seksi Denda", "alumni"),
    ]);
    expect(inti.every((k) => k.pemegang.length === 0)).toBe(true);
    expect(seksi).toEqual([]);
  });

  it("seksi dikelompokkan per nama jabatan (tak peduli huruf besar), urut abjad", () => {
    const { seksi } = susunStruktur([
      m("A", "Seksi Kelistrikan"),
      m("B", "seksi kelistrikan"),
      m("C", "Seksi Denda"),
    ]);
    expect(seksi.map((k) => [k.jabatan, k.pemegang.length])).toEqual([
      ["Seksi Denda", 1],
      ["Seksi Kelistrikan", 2],
    ]);
  });
});

describe("labelPeriode", () => {
  it("masa jabatan 2 tahun", () => {
    expect(labelPeriode(2024)).toBe("2024–2026");
  });
});
