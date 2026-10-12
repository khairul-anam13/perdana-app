export const ROLES = [
  "admin",
  "ketua",
  "sekretaris",
  "bendahara",
  "kelistrikan",
  "denda",
  "anggota",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Sup Admin",
  ketua: "Ketua",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  kelistrikan: "S. Kelistrikan",
  denda: "S. Denda",
  anggota: "Anggota",
};

export type SyncEntity = "member" | "activity" | "attendance" | "transaction" | "lightingIssue";
export type SyncOp = "create" | "update" | "delete";

export const CATEGORY_LISTRIK = "Listrik";
export const CATEGORY_DENDA = "Denda";

const KAS: Role[] = ["ketua", "bendahara"];
const PENGURUS: Role[] = ["ketua", "sekretaris"];
/** Yang menindaklanjuti laporan penerangan (tandai diperbaiki, ubah, hapus). */
const PENERANGAN: Role[] = ["ketua", "kelistrikan"];

/**
 * Seksi hanya boleh mencatat pemasukan di satu kategori miliknya (AD/ART Pasal 12 huruf c: rekening
 * listrik; Pasal 9: denda). Server menolak kategori lain; UI mengunci pilihan ke kategori ini.
 */
const SEKSI: Partial<Record<Role, string>> = {
  kelistrikan: CATEGORY_LISTRIK,
  denda: CATEGORY_DENDA,
};
export const seksiKategori = (role: Role): string | undefined => SEKSI[role];

/**
 * Satu-satunya sumber aturan hak tulis. Dipakai server (penegakan) dan UI (menyembunyikan tombol).
 * Absensi: selain Ketua/Sekretaris, hanya boleh untuk dirinya sendiri (dicek terpisah di server).
 * Sup Admin tidak menulis data organisasi: tugasnya mengelola akun (lihat canManageUsers).
 */
export function canWrite(role: Role, entity: SyncEntity, op: SyncOp = "create"): boolean {
  switch (entity) {
    case "transaction":
      // append-only: tidak ada update/hapus
      return op === "create" && (KAS.includes(role) || seksiKategori(role) !== undefined);
    case "member":
    case "activity":
      return PENGURUS.includes(role);
    case "attendance":
      return op !== "delete";
    case "lightingIssue":
      // Siapa pun boleh melapor; menindaklanjuti hanya Ketua dan S. Kelistrikan.
      return op === "create" || PENERANGAN.includes(role);
  }
}

/** Pengaturan organisasi yang bisa diubah dari aplikasi (PATCH /api/organization) dan siapa yang boleh. */
const ORG_SETTING_ROLES = {
  termStart: ["ketua", "sekretaris"],
  fineAbsent: ["ketua", "denda"],
} as const satisfies Record<string, readonly Role[]>;
export type OrgSetting = keyof typeof ORG_SETTING_ROLES;
export const canEditOrgSetting = (role: Role, key: OrgSetting) =>
  (ORG_SETTING_ROLES[key] as readonly Role[]).includes(role);

export const canManageUsers = (role: Role) => role === "admin" || role === "ketua";
/** Akun Sup Admin hanya boleh dibuat/diubah oleh Sup Admin, supaya Ketua tidak bisa menaikkan diri. */
export const canAssignRole = (actor: Role, target: Role) => target !== "admin" || actor === "admin";
export const canSeeMemberContacts = (role: Role) => role !== "anggota";
