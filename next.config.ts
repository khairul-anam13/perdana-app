import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
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
  "/adart",
  "/~offline",
];
const revision = randomUUID();
// Logo organisasi dipakai di header dan halaman masuk: harus ada di HP sejak pemasangan pertama.
const logo = {
  url: "/logo-karang-taruna.svg",
  revision: createHash("md5").update(readFileSync("public/logo-karang-taruna.svg")).digest("hex"),
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // Pendaftaran dilakukan sendiri di SwRegister; jangan muat ulang halaman saat kembali online
  // (akan membuang isian formulir yang sedang diketik).
  register: false,
  reloadOnOnline: false,
  cacheOnNavigation: false,
  additionalPrecacheEntries: [...shellRoutes.map((url) => ({ url, revision })), logo],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {}, // dev memakai Turbopack; build produksi memakai webpack karena Serwist
  poweredByHeader: false,
};

export default withSerwist(nextConfig);
