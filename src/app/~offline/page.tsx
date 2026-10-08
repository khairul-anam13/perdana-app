import type { Metadata } from "next";
import { BrandMark } from "@/components/app/brand";

export const metadata: Metadata = { title: "Tidak ada koneksi" };

/** Cadangan bila sebuah halaman belum tersimpan di HP dan internet mati. */
export default function OfflinePage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm place-items-center px-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <BrandMark className="size-16" />
        <h1 className="text-2xl font-bold tracking-tight">Halaman ini belum tersimpan di HP</h1>
        <p className="text-tinta-lembut">
          Sambungkan internet sekali agar halaman ini tersimpan. Setelah itu bisa dibuka tanpa
          internet.
        </p>
        <a
          href="/beranda"
          className="inline-flex min-h-12 items-center rounded-xl bg-daun-700 px-5 font-semibold text-white"
        >
          Ke Beranda
        </a>
      </div>
    </main>
  );
}
