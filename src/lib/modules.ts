/**
 * Warna penanda tiap modul. Kelas ditulis utuh (bukan dirangkai) supaya Tailwind menemukannya.
 */
export type ModuleKey = "beranda" | "kas" | "anggota" | "kegiatan" | "akun";

export const MODULES: Record<
  ModuleKey,
  {
    label: string;
    href: string;
    /** latar lembut + teks gelap */
    soft: string;
    /** warna garis/penanda */
    rail: string;
    /** teks aksen yang terbaca di latar terang */
    text: string;
    /** tombol/ikon aktif di navigasi */
    active: string;
  }
> = {
  beranda: {
    label: "Beranda",
    href: "/beranda",
    soft: "bg-daun-100 text-daun-800",
    rail: "bg-daun-600",
    text: "text-daun-700",
    active: "bg-daun-700 text-white",
  },
  kas: {
    label: "Kas",
    href: "/kas",
    soft: "bg-padi-100 text-padi-800",
    rail: "bg-padi-400",
    text: "text-padi-800",
    active: "bg-padi-300 text-tinta",
  },
  anggota: {
    label: "Anggota",
    href: "/anggota",
    soft: "bg-air-100 text-air-700",
    rail: "bg-air-600",
    text: "text-air-700",
    active: "bg-air-600 text-white",
  },
  kegiatan: {
    label: "Kegiatan",
    href: "/kegiatan",
    soft: "bg-terong-100 text-terong-700",
    rail: "bg-terong-600",
    text: "text-terong-700",
    active: "bg-terong-600 text-white",
  },
  akun: {
    label: "Akun",
    href: "/akun",
    soft: "bg-daun-100 text-daun-800",
    rail: "bg-daun-600",
    text: "text-daun-700",
    active: "bg-daun-700 text-white",
  },
};
