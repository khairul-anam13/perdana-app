import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // `prisma generate` (saat build di Vercel) tidak butuh database, jadi jangan gagal bila kosong.
  // Perintah yang benar-benar butuh database (migrate) tetap gagal dengan pesan Prisma sendiri.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
