export const ROLES = ["ketua", "sekretaris", "bendahara", "anggota"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ketua: "Ketua",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  anggota: "Anggota",
};

export type SyncEntity = "member" | "activity" | "attendance" | "transaction";
export type SyncOp = "create" | "update" | "delete";

const KAS: Role[] = ["ketua", "bendahara"];
const PENGURUS: Role[] = ["ketua", "sekretaris"];

/**
 * Satu-satunya sumber aturan hak tulis. Dipakai server (penegakan) dan UI (menyembunyikan tombol).
 * Absensi: anggota biasa boleh menulis, tetapi hanya untuk dirinya sendiri (dicek terpisah di server).
 */
export function canWrite(role: Role, entity: SyncEntity, op: SyncOp = "create"): boolean {
  switch (entity) {
    case "transaction":
      return op === "create" && KAS.includes(role); // append-only: tidak ada update/hapus
    case "member":
    case "activity":
      return PENGURUS.includes(role);
    case "attendance":
      return op !== "delete";
  }
}

export const canManageUsers = (role: Role) => role === "ketua";
export const canSeeMemberContacts = (role: Role) => role !== "anggota";
