import bcrypt from "bcryptjs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Member } from "@/features/anggota/schema";
import type { Activity, Attendance } from "@/features/kegiatan/schema";
import type { Transaction } from "@/features/kas/schema";
import { ROLES, type Role } from "@/lib/auth/permissions";
import { newId } from "@/lib/id";
import type { Change } from "@/lib/sync/protocol";
import type { AuthUser } from "../auth";
import { prisma } from "../db";
import { pullChanges } from "./pull";
import { applyChange, applyChanges } from "./push";

/** Tes integrasi ke PostgreSQL asli (database `perdana_test`). */

const T = (sec: number) => new Date(Date.UTC(2026, 9, 3, 0, 0, sec)).toISOString();

let org: string;
let users: Record<Role, AuthUser>;
let ownMemberId: string;

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    "TRUNCATE receipts, attendances, transactions, activities, users, members, organizations RESTART IDENTITY CASCADE",
  );
  org = (
    await prisma.organization.create({
      data: { name: "KT Uji", village: "V", subdistrict: "K", regency: "B" },
    })
  ).id;
  ownMemberId = newId();
  await prisma.member.create({
    data: {
      id: ownMemberId,
      organizationId: org,
      fullName: "Ayu Anggota",
      gender: "P",
      birthDate: new Date("2003-01-01"),
      phone: "0811",
      joinedAt: new Date("2024-01-01"),
    },
  });
  const hash = await bcrypt.hash("123456", 4);
  users = {} as Record<Role, AuthUser>;
  for (const role of ROLES) {
    const id = newId();
    const memberId = role === "anggota" ? ownMemberId : null;
    await prisma.user.create({
      data: { id, organizationId: org, memberId, username: role, credentialHash: hash, role },
    });
    users[role] = { id, username: role, name: role, role, memberId, organizationId: org };
  }
});

afterAll(() => prisma.$disconnect());

function member(o: Partial<Member> = {}): Member {
  return {
    id: newId(),
    organizationId: org,
    fullName: "Budi Santoso",
    nickname: null,
    gender: "L",
    birthDate: "2000-01-01",
    phone: "0812345",
    address: "Jl. Mawar",
    dusun: "Dusun A",
    position: "Anggota",
    status: "aktif",
    joinedAt: "2024-01-01",
    createdBy: null,
    createdAt: T(0),
    updatedAt: T(1),
    deletedAt: null,
    ...o,
  };
}
function activity(o: Partial<Activity> = {}): Activity {
  return {
    id: newId(),
    organizationId: org,
    title: "Kerja Bakti",
    description: null,
    startDate: "2026-10-10",
    endDate: null,
    location: null,
    status: "rencana",
    leaderId: null,
    createdBy: null,
    createdAt: T(0),
    updatedAt: T(1),
    deletedAt: null,
    ...o,
  };
}
function attendance(activityId: string, memberId: string, o: Partial<Attendance> = {}): Attendance {
  return {
    id: newId(),
    organizationId: org,
    activityId,
    memberId,
    status: "hadir",
    recordedAt: T(2),
    recordedBy: null,
    createdBy: null,
    createdAt: T(2),
    updatedAt: T(2),
    deletedAt: null,
    ...o,
  };
}
function tx(o: Partial<Transaction> = {}): Transaction {
  return {
    id: newId(),
    organizationId: org,
    type: "pemasukan",
    amount: 50_000,
    category: "Donasi",
    note: null,
    transactionDate: "2026-10-03",
    activityId: null,
    memberId: null,
    reversesTransactionId: null,
    receiptId: null,
    createdBy: null,
    createdAt: T(3),
    updatedAt: T(3),
    deletedAt: null,
    ...o,
  };
}
const change = <T extends { id: string; updatedAt: string }>(
  entity: Change["entity"],
  op: Change["op"],
  payload: T,
): Change => ({
  changeId: newId(),
  id: payload.id,
  entity,
  op,
  payload,
  clientUpdatedAt: payload.updatedAt,
});

describe("idempotensi push", () => {
  it("mengirim batch yang sama berulang kali tidak menggandakan data", async () => {
    const batch = [
      change("transaction", "create", tx({ amount: 20_000 })),
      change("transaction", "create", tx({ amount: 35_000 })),
    ];

    const first = await applyChanges(users.bendahara, batch);
    expect(first.results.map((r) => r.status)).toEqual(["ok", "ok"]);

    for (let i = 0; i < 3; i++) {
      const again = await applyChanges(users.bendahara, batch);
      expect(again.results.map((r) => r.status)).toEqual(["duplikat", "duplikat"]);
    }
    expect(await prisma.transaction.count()).toBe(2);
  });

  it("ID baris sama dengan ID perubahan baru (respons hilang lalu klien kirim ulang) tetap duplikat", async () => {
    const t = tx();
    expect((await applyChange(users.bendahara, change("transaction", "create", t))).status).toBe(
      "ok",
    );
    expect((await applyChange(users.bendahara, change("transaction", "create", t))).status).toBe(
      "duplikat",
    );
    expect(await prisma.transaction.count()).toBe(1);
  });

  it("dua pengiriman bersamaan untuk data yang sama hanya menyimpan satu", async () => {
    const c = change("transaction", "create", tx());
    const results = await Promise.all([
      applyChange(users.bendahara, c),
      applyChange(users.bendahara, c),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["duplikat", "ok"]);
    expect(await prisma.transaction.count()).toBe(1);
  });

  it("absensi: dua baris berbeda untuk (kegiatan, anggota) yang sama menjadi satu baris", async () => {
    const a = activity();
    await applyChange(users.sekretaris, change("activity", "create", a));
    const first = attendance(a.id, ownMemberId, { status: "hadir", updatedAt: T(5) });
    const second = attendance(a.id, ownMemberId, { status: "izin", updatedAt: T(9) }); // ID lain, lebih baru

    expect(
      (await applyChange(users.sekretaris, change("attendance", "create", first))).status,
    ).toBe("ok");
    expect((await applyChange(users.ketua, change("attendance", "create", second))).status).toBe(
      "ok",
    );

    const rows = await prisma.attendance.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("izin");
    expect(rows[0].id).toBe(first.id); // baris pertama dipertahankan
  });
});

describe("kas append-only dan transaksi pembalik", () => {
  it("menolak update dan hapus transaksi", async () => {
    const t = tx();
    await applyChange(users.bendahara, change("transaction", "create", t));
    for (const op of ["update", "delete"] as const) {
      const r = await applyChange(
        users.bendahara,
        change("transaction", op, { ...t, updatedAt: T(20) }),
      );
      expect(r.status).toBe("ditolak");
    }
    expect(
      (await prisma.transaction.findUniqueOrThrow({ where: { id: t.id } })).updatedAt.toISOString(),
    ).toBe(T(3));
  });

  it("menerima koreksi yang sah, menolak koreksi kedua", async () => {
    const original = tx({ type: "pengeluaran", amount: 75_000, category: "Konsumsi" });
    await applyChange(users.bendahara, change("transaction", "create", original));

    const reversal = tx({
      type: "pemasukan",
      amount: 75_000,
      category: "Konsumsi",
      reversesTransactionId: original.id,
    });
    expect(
      (await applyChange(users.bendahara, change("transaction", "create", reversal))).status,
    ).toBe("ok");

    const second = tx({
      type: "pemasukan",
      amount: 75_000,
      category: "Konsumsi",
      reversesTransactionId: original.id,
    });
    const r = await applyChange(users.ketua, change("transaction", "create", second));
    expect(r.status).toBe("ditolak");
    expect(r.reason).toMatch(/sudah dikoreksi/i);
  });

  it("menolak koreksi dengan tipe/nominal tidak cocok, atau koreksi atas koreksi", async () => {
    const original = tx({ type: "pengeluaran", amount: 10_000 });
    await applyChange(users.bendahara, change("transaction", "create", original));

    const wrongAmount = tx({
      type: "pemasukan",
      amount: 9_000,
      reversesTransactionId: original.id,
    });
    expect(
      (await applyChange(users.bendahara, change("transaction", "create", wrongAmount))).status,
    ).toBe("ditolak");

    const sameType = tx({
      type: "pengeluaran",
      amount: 10_000,
      reversesTransactionId: original.id,
    });
    expect(
      (await applyChange(users.bendahara, change("transaction", "create", sameType))).status,
    ).toBe("ditolak");

    const good = tx({ type: "pemasukan", amount: 10_000, reversesTransactionId: original.id });
    await applyChange(users.bendahara, change("transaction", "create", good));
    const reversalOfReversal = tx({
      type: "pengeluaran",
      amount: 10_000,
      reversesTransactionId: good.id,
    });
    const r = await applyChange(
      users.bendahara,
      change("transaction", "create", reversalOfReversal),
    );
    expect(r.status).toBe("ditolak");
    expect(r.reason).toMatch(/tidak bisa dikoreksi/i);
  });

  it("menolak nominal nol/negatif/desimal", async () => {
    for (const amount of [0, -5, 12.5]) {
      const r = await applyChange(users.bendahara, change("transaction", "create", tx({ amount })));
      expect(r.status).toBe("ditolak");
    }
    expect(await prisma.transaction.count()).toBe(0);
  });
});

describe("otorisasi peran di server", () => {
  it("setiap peran hanya bisa menulis entitas miliknya", async () => {
    const cases: [Role, Change["entity"], boolean][] = [
      ["bendahara", "transaction", true],
      ["ketua", "transaction", true],
      ["sekretaris", "transaction", false],
      ["admin", "transaction", false],
      ["admin", "member", false],
      ["admin", "activity", false],
      ["kelistrikan", "member", false],
      ["denda", "activity", false],
      ["anggota", "transaction", false],
      ["sekretaris", "member", true],
      ["ketua", "member", true],
      ["bendahara", "member", false],
      ["anggota", "member", false],
      ["sekretaris", "activity", true],
      ["bendahara", "activity", false],
      ["anggota", "activity", false],
    ];
    for (const [role, entity, allowed] of cases) {
      const payload = entity === "transaction" ? tx() : entity === "member" ? member() : activity();
      const r = await applyChange(users[role], change(entity, "create", payload));
      expect(r.status, `${role} -> ${entity}`).toBe(allowed ? "ok" : "ditolak");
    }
  });

  it("Seksi hanya mencatat pemasukan di kategorinya sendiri", async () => {
    const ok = (r: { status: string }) => r.status;
    const cases: [Role, Partial<Transaction>, string][] = [
      ["kelistrikan", { category: "Listrik", type: "pemasukan" }, "ok"],
      ["kelistrikan", { category: "Denda", type: "pemasukan" }, "ditolak"],
      ["kelistrikan", { category: "Listrik", type: "pengeluaran" }, "ditolak"],
      ["denda", { category: "Denda", type: "pemasukan" }, "ok"],
      ["denda", { category: "Iuran", type: "pemasukan" }, "ditolak"],
    ];
    for (const [role, o, want] of cases) {
      const r = await applyChange(users[role], change("transaction", "create", tx(o)));
      expect(ok(r), `${role} ${JSON.stringify(o)}`).toBe(want);
    }
  });

  it("Seksi hanya mengoreksi transaksi di kategorinya", async () => {
    const listrik = tx({ category: "Listrik", type: "pemasukan", amount: 7_000 });
    const donasi = tx({ category: "Donasi", type: "pemasukan", amount: 9_000 });
    await applyChange(users.bendahara, change("transaction", "create", listrik));
    await applyChange(users.bendahara, change("transaction", "create", donasi));
    const reverse = (o: Transaction): Transaction =>
      tx({
        category: o.category,
        type: "pengeluaran",
        amount: o.amount,
        reversesTransactionId: o.id,
      });
    const bad = await applyChange(
      users.kelistrikan,
      change("transaction", "create", reverse(donasi)),
    );
    expect(bad.status).toBe("ditolak");
    const good = await applyChange(
      users.kelistrikan,
      change("transaction", "create", reverse(listrik)),
    );
    expect(good.status).toBe("ok");
  });

  it("selain Ketua dan Sekretaris hanya boleh mengisi absensi dirinya sendiri", async () => {
    const a = activity();
    await applyChange(users.sekretaris, change("activity", "create", a));
    const other = member();
    await applyChange(users.sekretaris, change("member", "create", other));
    for (const role of ["bendahara", "kelistrikan", "denda", "admin"] as const) {
      const r = await applyChange(
        users[role],
        change("attendance", "create", attendance(a.id, other.id)),
      );
      expect(r.status, role).toBe("ditolak");
    }
  });

  it("anggota biasa hanya boleh mengisi absensi dirinya sendiri", async () => {
    const a = activity();
    await applyChange(users.sekretaris, change("activity", "create", a));
    const other = member();
    await applyChange(users.sekretaris, change("member", "create", other));

    const forOther = await applyChange(
      users.anggota,
      change("attendance", "create", attendance(a.id, other.id)),
    );
    expect(forOther.status).toBe("ditolak");

    const forSelf = await applyChange(
      users.anggota,
      change("attendance", "create", attendance(a.id, ownMemberId)),
    );
    expect(forSelf.status).toBe("ok");
  });

  it("menolak data milik organisasi lain", async () => {
    const otherOrg = await prisma.organization.create({
      data: { name: "Lain", village: "V", subdistrict: "K", regency: "B" },
    });
    const foreign = member();
    await prisma.member.create({
      data: {
        id: foreign.id,
        organizationId: otherOrg.id,
        fullName: "Orang Lain",
        gender: "L",
        birthDate: new Date("2000-01-01"),
        joinedAt: new Date("2024-01-01"),
      },
    });
    const r = await applyChange(
      users.sekretaris,
      change("member", "update", { ...foreign, updatedAt: T(50) }),
    );
    expect(r.status).toBe("ditolak");
    expect((await prisma.member.findUniqueOrThrow({ where: { id: foreign.id } })).fullName).toBe(
      "Orang Lain",
    );
  });
});

describe("last-write-wins untuk data biasa", () => {
  it("versi lebih baru menang, versi lebih lama diabaikan", async () => {
    const m = member({ fullName: "Awal", updatedAt: T(10) });
    await applyChange(users.sekretaris, change("member", "create", m));

    const newer = await applyChange(
      users.sekretaris,
      change("member", "update", { ...m, fullName: "Baru", updatedAt: T(30) }),
    );
    expect(newer.status).toBe("ok");
    const older = await applyChange(
      users.ketua,
      change("member", "update", { ...m, fullName: "Basi", updatedAt: T(20) }),
    );
    expect(older.status).toBe("duplikat");

    expect((await prisma.member.findUniqueOrThrow({ where: { id: m.id } })).fullName).toBe("Baru");
  });

  it("hapus = soft delete dan ikut tersinkron sebagai tombstone", async () => {
    const m = member();
    await applyChange(users.sekretaris, change("member", "create", m));
    await applyChange(
      users.sekretaris,
      change("member", "delete", { ...m, deletedAt: T(40), updatedAt: T(40) }),
    );

    const row = await prisma.member.findUniqueOrThrow({ where: { id: m.id } });
    expect(row.deletedAt).not.toBeNull();
    const pulled = await pullChanges(users.sekretaris, 0n, 100);
    expect(pulled.changes.members.find((x) => x.id === m.id)?.deletedAt).toBe(T(40));
  });
});

describe("pull", () => {
  it("paginasi dengan kursor, tanpa baris terlewat atau ganda", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const m = member({ fullName: `Anggota ${i}` });
      ids.push(m.id);
      await applyChange(users.sekretaris, change("member", "create", m));
    }

    const seen: string[] = [];
    let cursor = 0;
    for (let guard = 0; guard < 10; guard++) {
      const page = await pullChanges(users.sekretaris, BigInt(cursor), 2);
      seen.push(...page.changes.members.map((m) => m.id));
      cursor = page.cursor;
      if (!page.hasMore) break;
    }
    // 5 anggota buatan tes + 1 anggota awal (Ayu) = 6 baris
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toEqual(expect.arrayContaining(ids));
    expect(seen).toHaveLength(6);
  });

  it("perubahan baru muncul di tarikan berikutnya (kursor naik)", async () => {
    const m = member();
    await applyChange(users.sekretaris, change("member", "create", m));
    const first = await pullChanges(users.ketua, 0n, 100);

    await applyChange(
      users.sekretaris,
      change("member", "update", { ...m, fullName: "Diubah", updatedAt: T(60) }),
    );
    const next = await pullChanges(users.ketua, BigInt(first.cursor), 100);
    expect(next.changes.members.map((x) => x.fullName)).toEqual(["Diubah"]);
    expect(next.cursor).toBeGreaterThan(first.cursor);
  });

  it("anggota biasa tidak menerima nomor HP, alamat, dan tanggal lahir orang lain", async () => {
    const other = member({ phone: "0899", address: "Rahasia" });
    await applyChange(users.sekretaris, change("member", "create", other));

    const asAnggota = await pullChanges(users.anggota, 0n, 100);
    const seenOther = asAnggota.changes.members.find((m) => m.id === other.id)!;
    expect(seenOther.fullName).toBe("Budi Santoso");
    expect(seenOther.phone).toBeNull();
    expect(seenOther.address).toBeNull();
    expect(seenOther.birthDate).toBeNull();
    expect(seenOther.dusun).toBe("Dusun A"); // dusun boleh terlihat
    expect(asAnggota.changes.members.find((m) => m.id === ownMemberId)?.phone).toBe("0811"); // data sendiri utuh

    const asPengurus = await pullChanges(users.sekretaris, 0n, 100);
    expect(asPengurus.changes.members.find((m) => m.id === other.id)?.phone).toBe("0899");
  });
});
