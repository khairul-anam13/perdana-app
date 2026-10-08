import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

// Halaman cangkang yang harus bisa dibuka offline sejak pemasangan pertama.
const shellRoutes = [
  "/",
  "/login",
  "/beranda",
  "/kas",
  "/kas/baru",
  "/kas/laporan",
  "/kas/iuran",
  "/anggota",
  "/kegiatan",
  "/kegiatan/detail",
  "/akun",
  "/akun/pengguna",
  "/~offline",
];
const revision = randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // Pendaftaran dilakukan sendiri di SwRegister; jangan muat ulang halaman saat kembali online
  // (akan membuang isian formulir yang sedang diketik).
  register: false,
  reloadOnOnline: false,
  cacheOnNavigation: false,
  additionalPrecacheEntries: shellRoutes.map((url) => ({ url, revision })),
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {}, // dev memakai Turbopack; build produksi memakai webpack karena Serwist
  poweredByHeader: false,
};

export default withSerwist(nextConfig);
