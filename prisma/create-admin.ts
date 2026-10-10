import "dotenv/config";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { v7 as uuid } from "uuid";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Buat akun Sup Admin pertama. Aman dijalankan di produksi: tidak menimpa apa pun.
 * Bila database belum punya organisasi, dibuat satu dari data AD/ART (Karang Taruna Perdana, Blorong).
 *
 *   pnpm db:admin [username]          # PIN diacak, dicetak sekali
 *   ADMIN_PIN=123456 pnpm db:admin    # atau tentukan PIN sendiri
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const username = (process.argv[2] ?? "supadmin1").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username))
    throw new Error("Username 3-30 karakter: huruf kecil, angka, titik, strip");

  const given = process.env.ADMIN_PIN;
  if (given !== undefined && !/^\d{6}$/.test(given)) throw new Error("ADMIN_PIN harus 6 angka");
  const pin = given ?? String(randomInt(0, 1_000_000)).padStart(6, "0");

  const org =
    (await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } })) ??
    (await prisma.organization.create({
      data: {
        name: "Karang Taruna Perdana",
        village: "Blorong",
        subdistrict: "Jumantono",
        regency: "Karanganyar",
      },
    }));

  const exists = await prisma.user.findFirst({
    where: { organizationId: org.id, username, deletedAt: null },
  });
  if (exists)
    throw new Error(`Akun "${username}" sudah ada. Atur ulang PIN lewat Kelola pengguna.`);

  await prisma.user.create({
    data: {
      id: uuid(),
      organizationId: org.id,
      username,
      credentialHash: await bcrypt.hash(pin, 10),
      role: "admin",
    },
  });

  console.log(`Sup Admin dibuat di "${org.name}".`);
  console.log(`  username: ${username}`);
  console.log(
    given ? "  PIN: sesuai ADMIN_PIN" : `  PIN: ${pin}  (dicetak sekali, ganti setelah masuk)`,
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
