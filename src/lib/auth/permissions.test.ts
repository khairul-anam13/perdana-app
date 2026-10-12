import { describe, expect, it } from "vitest";
import { INCOME_CATEGORIES } from "../../features/kas/schema";
import {
  canEditOrgSetting,
  canAssignRole,
  canManageUsers,
  canWrite,
  ROLES,
  seksiKategori,
  type Role,
  type SyncEntity,
} from "./permissions";

describe("hak tulis per peran", () => {
  const writers = (entity: SyncEntity, op = "create" as const): Role[] =>
    ROLES.filter((r) => canWrite(r, entity, op));

  it("kas: Ketua, Bendahara, dan dua Seksi (Seksi dibatasi satu kategori)", () => {
    expect(writers("transaction")).toEqual(["ketua", "bendahara", "kelistrikan", "denda"]);
  });

  it("kas append-only: tak ada yang boleh mengubah atau menghapus transaksi", () => {
    for (const r of ROLES) {
      expect(canWrite(r, "transaction", "update")).toBe(false);
      expect(canWrite(r, "transaction", "delete")).toBe(false);
    }
  });

  it("anggota dan kegiatan hanya Ketua dan Sekretaris", () => {
    expect(writers("member")).toEqual(["ketua", "sekretaris"]);
    expect(writers("activity")).toEqual(["ketua", "sekretaris"]);
  });

  it("absensi boleh ditulis semua peran (selain pengurus hanya untuk dirinya, dicek di server), tapi tak boleh dihapus", () => {
    expect(writers("attendance")).toEqual([...ROLES]);
    expect(canWrite("ketua", "attendance", "delete")).toBe(false);
  });

  it("Sup Admin tidak menulis data organisasi (kas, anggota, kegiatan)", () => {
    for (const e of ["transaction", "member", "activity"] as const)
      expect(canWrite("admin", e)).toBe(false);
  });
});

describe("penerangan dan pengaturan organisasi", () => {
  it("siapa pun boleh melapor lampu; hanya Ketua dan S. Kelistrikan yang menindaklanjuti", () => {
    expect(ROLES.filter((r) => canWrite(r, "lightingIssue", "create"))).toEqual([...ROLES]);
    for (const op of ["update", "delete"] as const)
      expect(ROLES.filter((r) => canWrite(r, "lightingIssue", op))).toEqual([
        "ketua",
        "kelistrikan",
      ]);
  });

  it("periode: Ketua dan Sekretaris; tarif denda: Ketua dan S. Denda", () => {
    expect(ROLES.filter((r) => canEditOrgSetting(r, "termStart"))).toEqual(["ketua", "sekretaris"]);
    expect(ROLES.filter((r) => canEditOrgSetting(r, "fineAbsent"))).toEqual(["ketua", "denda"]);
  });
});

describe("kelola akun", () => {
  it("hanya Sup Admin dan Ketua", () => {
    expect(ROLES.filter(canManageUsers)).toEqual(["admin", "ketua"]);
  });

  it("hanya Sup Admin yang boleh menunjuk atau mengubah Sup Admin", () => {
    expect(canAssignRole("admin", "admin")).toBe(true);
    expect(canAssignRole("ketua", "admin")).toBe(false);
    expect(canAssignRole("ketua", "bendahara")).toBe(true);
  });
});

describe("kategori Seksi", () => {
  it("Kelistrikan dan Denda masing-masing satu kategori, dan kategori itu ada di pilihan pemasukan", () => {
    expect(seksiKategori("kelistrikan")).toBe("Listrik");
    expect(seksiKategori("denda")).toBe("Denda");
    for (const r of ROLES.filter((r) => seksiKategori(r)))
      expect(INCOME_CATEGORIES as readonly string[]).toContain(seksiKategori(r));
    expect(seksiKategori("bendahara")).toBeUndefined();
  });
});
