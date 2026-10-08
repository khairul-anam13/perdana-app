import { describe, expect, it } from "vitest";
import { canWrite, ROLES, type Role, type SyncEntity } from "./permissions";

describe("hak tulis per peran", () => {
  const writers = (entity: SyncEntity, op = "create" as const): Role[] =>
    ROLES.filter((r) => canWrite(r, entity, op));

  it("kas hanya Ketua dan Bendahara", () => {
    expect(writers("transaction")).toEqual(["ketua", "bendahara"]);
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

  it("absensi boleh ditulis semua peran (anggota hanya untuk dirinya, dicek di server), tapi tak boleh dihapus", () => {
    expect(writers("attendance")).toEqual([...ROLES]);
    expect(canWrite("ketua", "attendance", "delete")).toBe(false);
  });
});
