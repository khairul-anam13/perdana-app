import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { v7 as uuid } from "uuid";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Data contoh untuk pengembangan lokal. JANGAN dijalankan di produksi:
 * semua akun contoh memakai PIN 123456.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEMO_PIN = "123456";
const d = (s: string) => new Date(s);
const daysFromNow = (n: number) => {
  const x = new Date();
  x.setUTCHours(0, 0, 0, 0);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};

async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Seed contoh tidak boleh dijalankan di produksi");
  if ((await prisma.organization.count()) > 0) {
    console.log(
      "Database sudah berisi data. Seed dilewati (jalankan `pnpm db:reset` untuk mengulang).",
    );
    return;
  }

  const org = await prisma.organization.create({
    data: {
      name: "Karang Taruna Tunas Mekar",
      village: "Sukamaju",
      subdistrict: "Cibadak",
      regency: "Sukabumi",
    },
  });

  const people: [string, string | null, "L" | "P", string, string, string, string][] = [
    // nama, panggilan, jk, lahir, dusun, jabatan, status
    ["Rizky Pratama", "Rizky", "L", "1999-03-14", "Dusun Kaler", "Ketua", "aktif"],
    ["Siti Nurhaliza", "Siti", "P", "2000-07-21", "Dusun Kidul", "Sekretaris", "aktif"],
    ["Dimas Anggara", "Dimas", "L", "1998-11-02", "Dusun Wetan", "Bendahara", "aktif"],
    ["Ayu Lestari", "Ayu", "P", "2003-01-30", "Dusun Kaler", "Anggota", "aktif"],
    ["Fajar Nugroho", "Fajar", "L", "2001-05-09", "Dusun Kidul", "Anggota", "aktif"],
    ["Dewi Anjani", "Dewi", "P", "2004-09-17", "Dusun Wetan", "Anggota", "aktif"],
    ["Bagas Setiawan", "Bagas", "L", "2005-12-25", "Dusun Kaler", "Anggota", "aktif"],
    ["Lina Marlina", "Lina", "P", "1982-04-11", "Dusun Kidul", "Seksi", "aktif"], // melewati usia 45
    ["Hendra Wijaya", "Hendra", "L", "1981-10-20", "Dusun Wetan", "Anggota", "aktif"], // mendekati batas usia
    ["Putri Rahayu", "Putri", "P", "2002-02-08", "Dusun Kaler", "Anggota", "aktif"],
    ["Eko Saputra", "Eko", "L", "2000-06-30", "Dusun Kidul", "Anggota", "nonaktif"],
    ["Wahyu Hidayat", "Wahyu", "L", "1995-08-19", "Dusun Wetan", "Anggota", "alumni"],
  ];
  const members = [];
  for (const [fullName, nickname, gender, birth, dusun, position, status] of people) {
    members.push(
      await prisma.member.create({
        data: {
          id: uuid(),
          organizationId: org.id,
          fullName,
          nickname,
          gender,
          birthDate: d(birth),
          phone: "0812" + Math.floor(10000000 + Math.random() * 89999999),
          address: `${dusun}, RT 0${1 + (members.length % 4)}/RW 0${1 + (members.length % 2)}`,
          dusun,
          position,
          status,
          joinedAt: d("2023-01-15"),
        },
      }),
    );
  }

  // Satu akun per peran (anggota biasa = Ayu).
  const hash = await bcrypt.hash(DEMO_PIN, 10);
  const accounts: [string, string, number][] = [
    ["ketua", "ketua", 0],
    ["sekretaris", "sekretaris", 1],
    ["bendahara", "bendahara", 2],
    ["anggota", "ayu", 3],
  ];
  for (const [role, username, idx] of accounts) {
    await prisma.user.create({
      data: {
        id: uuid(),
        organizationId: org.id,
        memberId: members[idx].id,
        username,
        credentialHash: hash,
        role,
      },
    });
  }

  const [kerjaBakti, malam17, rapat] = await Promise.all([
    prisma.activity.create({
      data: {
        id: uuid(),
        organizationId: org.id,
        title: "Kerja Bakti Bersih Desa",
        description: "Membersihkan selokan dan balai dusun.",
        startDate: daysFromNow(-12),
        location: "Balai Dusun Kaler",
        status: "selesai",
        leaderId: members[0].id,
      },
    }),
    prisma.activity.create({
      data: {
        id: uuid(),
        organizationId: org.id,
        title: "Malam Tirakatan 17 Agustus",
        description: "Panggung hiburan dan lomba warga.",
        startDate: daysFromNow(9),
        endDate: daysFromNow(9),
        location: "Lapangan Desa Sukamaju",
        status: "rencana",
        leaderId: members[1].id,
      },
    }),
    prisma.activity.create({
      data: {
        id: uuid(),
        organizationId: org.id,
        title: "Rapat Bulanan Pengurus",
        startDate: daysFromNow(3),
        location: "Rumah Ketua",
        status: "rencana",
        leaderId: members[0].id,
      },
    }),
  ]);
  void rapat;

  for (const [i, m] of members.slice(0, 7).entries()) {
    await prisma.attendance.create({
      data: {
        id: uuid(),
        organizationId: org.id,
        activityId: kerjaBakti.id,
        memberId: m.id,
        status: i === 5 ? "izin" : i === 6 ? "alpa" : "hadir",
        recordedAt: kerjaBakti.startDate,
      },
    });
  }

  // Kas: iuran bulan ini dan beberapa transaksi.
  const today = new Date();
  const monthStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
  const tx = (
    type: "pemasukan" | "pengeluaran",
    amount: number,
    category: string,
    note: string,
    date: Date,
    extra: { memberId?: string; activityId?: string } = {},
  ) =>
    prisma.transaction.create({
      data: {
        id: uuid(),
        organizationId: org.id,
        type,
        amount,
        category,
        note,
        transactionDate: date,
        ...extra,
      },
    });

  await tx("pemasukan", 500000, "Donasi", "Saldo awal dari kas lama", daysFromNow(-40));
  for (const m of members.slice(0, 6))
    await tx("pemasukan", 20000, "Iuran", "Iuran bulanan", monthStart, { memberId: m.id });
  await tx("pengeluaran", 150000, "Konsumsi", "Konsumsi kerja bakti", daysFromNow(-12), {
    activityId: kerjaBakti.id,
  });
  await tx("pengeluaran", 85000, "Perlengkapan", "Beli sapu dan kantong sampah", daysFromNow(-13), {
    activityId: kerjaBakti.id,
  });
  await tx(
    "pemasukan",
    300000,
    "Kas kegiatan",
    "Sumbangan warga untuk tirakatan",
    daysFromNow(-2),
    { activityId: malam17.id },
  );

  console.log(
    `Seed selesai. Akun contoh (PIN ${DEMO_PIN}): ketua, sekretaris, bendahara, ayu (anggota).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
