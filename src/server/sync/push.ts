import { ZodError } from "zod";
import { memberSchema } from "@/features/anggota/schema";
import { activitySchema, attendanceSchema } from "@/features/kegiatan/schema";
import { opposite } from "@/features/kas/ledger";
import { transactionSchema } from "@/features/kas/schema";
import { canWrite } from "@/lib/auth/permissions";
import type { Change, PushResponse, PushResult } from "@/lib/sync/protocol";
import type { AuthUser } from "../auth";
import { nextSeq, prisma, prismaCode, withOrgLock, type Tx } from "../db";

/**
 * Menerapkan perubahan dari klien. Setiap item = satu transaksi DB (dengan kunci per organisasi).
 * IDEMPOTEN: ID baris dibuat di klien, jadi pengiriman ulang item yang sama hanya menghasilkan "duplikat".
 * - Kas (transaksi): append-only. Sudah ada => duplikat. Tidak ada update/hapus.
 * - Lainnya: last-write-wins berdasarkan updatedAt; yang lebih lama/sama diabaikan (duplikat).
 */

class Reject extends Error {}
const reject = (msg: string): never => {
  throw new Reject(msg);
};

type Outcome = "ok" | "duplikat";
type Handler = (tx: Tx, user: AuthUser, change: Change) => Promise<Outcome>;

const toDate = (s: string) => new Date(s);
const toDateOrNull = (s: string | null) => (s ? new Date(s) : null);

async function ensureInOrg(
  found: { organizationId: string } | null | undefined,
  user: AuthUser,
  what: string,
): Promise<void> {
  if (!found || found.organizationId !== user.organizationId) reject(`${what} tidak ditemukan`);
}

const memberHandler: Handler = async (tx, user, c) => {
  const p = memberSchema.parse(c.payload);
  if (p.id !== c.id) reject("ID tidak cocok");
  const existing = await tx.member.findUnique({ where: { id: p.id } });
  if (existing) await ensureInOrg(existing, user, "Anggota");
  const updatedAt = toDate(p.updatedAt);
  if (existing && existing.updatedAt >= updatedAt) return "duplikat";
  if (!p.birthDate) reject("Tanggal lahir wajib diisi");

  const data = {
    fullName: p.fullName,
    nickname: p.nickname,
    gender: p.gender,
    birthDate: toDateOrNull(p.birthDate),
    phone: p.phone,
    address: p.address,
    dusun: p.dusun,
    position: p.position,
    status: p.status,
    joinedAt: toDate(p.joinedAt),
    updatedAt,
    deletedAt: toDateOrNull(p.deletedAt),
    serverSeq: await nextSeq(tx),
  };
  if (existing) await tx.member.update({ where: { id: p.id }, data });
  else
    await tx.member.create({
      data: {
        id: p.id,
        organizationId: user.organizationId,
        createdBy: user.id,
        createdAt: toDate(p.createdAt),
        ...data,
      },
    });
  return "ok";
};

const activityHandler: Handler = async (tx, user, c) => {
  const p = activitySchema.parse(c.payload);
  if (p.id !== c.id) reject("ID tidak cocok");
  const existing = await tx.activity.findUnique({ where: { id: p.id } });
  if (existing) await ensureInOrg(existing, user, "Kegiatan");
  const updatedAt = toDate(p.updatedAt);
  if (existing && existing.updatedAt >= updatedAt) return "duplikat";

  const data = {
    title: p.title,
    description: p.description,
    startDate: toDate(p.startDate),
    endDate: toDateOrNull(p.endDate),
    location: p.location,
    status: p.status,
    leaderId: p.leaderId,
    updatedAt,
    deletedAt: toDateOrNull(p.deletedAt),
    serverSeq: await nextSeq(tx),
  };
  if (existing) await tx.activity.update({ where: { id: p.id }, data });
  else
    await tx.activity.create({
      data: {
        id: p.id,
        organizationId: user.organizationId,
        createdBy: user.id,
        createdAt: toDate(p.createdAt),
        ...data,
      },
    });
  return "ok";
};

const attendanceHandler: Handler = async (tx, user, c) => {
  const p = attendanceSchema.parse(c.payload);
  if (p.id !== c.id) reject("ID tidak cocok");
  if (user.role === "anggota" && p.memberId !== user.memberId)
    reject("Anggota hanya boleh mengisi absensi dirinya sendiri");

  await ensureInOrg(
    await tx.activity.findUnique({ where: { id: p.activityId } }),
    user,
    "Kegiatan",
  );
  await ensureInOrg(await tx.member.findUnique({ where: { id: p.memberId } }), user, "Anggota");

  // Satu baris per (kegiatan, anggota): jika sudah ada baris lain untuk pasangan ini, gabungkan ke baris itu.
  const existing =
    (await tx.attendance.findUnique({ where: { id: p.id } })) ??
    (await tx.attendance.findUnique({
      where: { activityId_memberId: { activityId: p.activityId, memberId: p.memberId } },
    }));
  if (existing) await ensureInOrg(existing, user, "Absensi");
  const updatedAt = toDate(p.updatedAt);
  if (existing && existing.updatedAt >= updatedAt) return "duplikat";

  const data = {
    status: p.status,
    recordedAt: toDate(p.recordedAt),
    recordedBy: user.id,
    updatedAt,
    deletedAt: toDateOrNull(p.deletedAt),
    serverSeq: await nextSeq(tx),
  };
  if (existing) await tx.attendance.update({ where: { id: existing.id }, data });
  else
    await tx.attendance.create({
      data: {
        id: p.id,
        organizationId: user.organizationId,
        activityId: p.activityId,
        memberId: p.memberId,
        createdBy: user.id,
        createdAt: toDate(p.createdAt),
        ...data,
      },
    });
  return "ok";
};

const transactionHandler: Handler = async (tx, user, c) => {
  if (c.op !== "create") reject("Kas tidak boleh diubah atau dihapus. Gunakan koreksi.");
  const p = transactionSchema.parse(c.payload);
  if (p.id !== c.id) reject("ID tidak cocok");
  if (p.deletedAt) reject("Kas tidak boleh dihapus. Gunakan koreksi.");

  const existing = await tx.transaction.findUnique({ where: { id: p.id } });
  if (existing) {
    await ensureInOrg(existing, user, "Transaksi");
    return "duplikat"; // append-only: yang sudah ada tidak pernah ditimpa
  }

  if (p.activityId)
    await ensureInOrg(
      await tx.activity.findUnique({ where: { id: p.activityId } }),
      user,
      "Kegiatan",
    );
  if (p.memberId)
    await ensureInOrg(await tx.member.findUnique({ where: { id: p.memberId } }), user, "Anggota");

  if (p.reversesTransactionId) {
    const origin = await tx.transaction.findUnique({ where: { id: p.reversesTransactionId } });
    await ensureInOrg(origin, user, "Transaksi yang dikoreksi");
    if (!origin) return reject("Transaksi yang dikoreksi tidak ditemukan");
    if (origin.reversesTransactionId) reject("Transaksi koreksi tidak bisa dikoreksi lagi");
    if (origin.type !== opposite(p.type) || origin.amount !== p.amount)
      reject("Koreksi harus berlawanan tipe dengan nominal yang sama");
    const already = await tx.transaction.findFirst({ where: { reversesTransactionId: origin.id } });
    if (already) reject("Transaksi ini sudah dikoreksi");
  }

  await tx.transaction.create({
    data: {
      id: p.id,
      organizationId: user.organizationId,
      type: p.type,
      amount: p.amount,
      category: p.category,
      note: p.note,
      transactionDate: toDate(p.transactionDate),
      activityId: p.activityId,
      memberId: p.memberId,
      reversesTransactionId: p.reversesTransactionId,
      receiptId: p.receiptId,
      createdBy: user.id,
      createdAt: toDate(p.createdAt),
      updatedAt: toDate(p.updatedAt),
      deletedAt: null,
      serverSeq: await nextSeq(tx),
    },
  });
  return "ok";
};

const handlers: Record<Change["entity"], Handler> = {
  member: memberHandler,
  activity: activityHandler,
  attendance: attendanceHandler,
  transaction: transactionHandler,
};

export async function applyChange(user: AuthUser, change: Change): Promise<PushResult> {
  const base = { changeId: change.changeId };
  if (!canWrite(user.role, change.entity, change.op))
    return { ...base, status: "ditolak", reason: "Peran Anda tidak boleh melakukan ini" };
  try {
    const status = await withOrgLock(user.organizationId, (tx) =>
      handlers[change.entity](tx, user, change),
    );
    return { ...base, status };
  } catch (e) {
    if (e instanceof Reject) return { ...base, status: "ditolak", reason: e.message };
    if (e instanceof ZodError)
      return { ...base, status: "ditolak", reason: e.issues[0]?.message ?? "Data tidak valid" };
    const code = prismaCode(e);
    if (code === "P2003")
      return { ...base, status: "ditolak", reason: "Data terkait tidak ditemukan" };
    if (code === "P2002") return { ...base, status: "duplikat" };
    throw e; // kesalahan sementara (mis. DB): klien akan mencoba ulang dengan backoff
  }
}

/** Terapkan batch secara berurutan. */
export async function applyChanges(user: AuthUser, changes: Change[]): Promise<PushResponse> {
  const results: PushResult[] = [];
  for (const c of changes) results.push(await applyChange(user, c));
  const rows = await prisma.$queryRaw<
    { n: bigint | null }[]
  >`select last_value as n from pg_sequences where sequencename = 'server_seq'`;
  return { results, serverSeq: Number(rows[0]?.n ?? 0) };
}
