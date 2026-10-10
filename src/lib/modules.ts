export type ModuleKey = "beranda" | "kas" | "anggota" | "kegiatan" | "akun";

export const MODULES: Record<ModuleKey, { label: string; href: string }> = {
  beranda: { label: "Beranda", href: "/beranda" },
  kas: { label: "Kas", href: "/kas" },
  anggota: { label: "Anggota", href: "/anggota" },
  kegiatan: { label: "Kegiatan", href: "/kegiatan" },
  akun: { label: "Akun", href: "/akun" },
};
