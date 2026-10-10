import bcrypt from "bcryptjs";
import { z } from "zod";
import { canAssignRole, canManageUsers, ROLES } from "@/lib/auth/permissions";
import { newId } from "@/lib/id";
import { requireUser } from "@/server/auth";
import { prisma, prismaCode } from "@/server/db";
import { handle, HttpError, json, readJson } from "@/server/http";

/** Pengelola akun: Sup Admin dan Ketua. */
const requireManager = async () => {
  const me = await requireUser();
  if (!canManageUsers(me.role)) throw new HttpError(403, "Peran Anda tidak boleh mengelola akun");
  return me;
};

const userSelect = {
  id: true,
  username: true,
  role: true,
  active: true,
  memberId: true,
  member: { select: { fullName: true } },
} as const;

/** Daftar akun (Sup Admin dan Ketua). */
export function GET() {
  return handle(async () => {
    const me = await requireManager();
    const users = await prisma.user.findMany({
      where: {
        organizationId: me.organizationId,
        deletedAt: null,
        // Ketua tidak melihat akun Sup Admin.
        ...(me.role !== "admin" && { role: { not: "admin" } }),
      },
      select: userSelect,
      orderBy: { username: "asc" },
    });
    return json({
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        active: u.active,
        memberId: u.memberId,
        memberName: u.member?.fullName ?? null,
      })),
    });
  });
}

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,30}$/, "Username 3-30 karakter: huruf kecil, angka, titik, strip"),
  pin: z.string().regex(/^\d{6}$/, "PIN harus 6 angka"),
  role: z.enum(ROLES),
  memberId: z.uuid().nullable(),
});

/** Buat akun (Sup Admin dan Ketua). Akun Sup Admin hanya bisa dibuat Sup Admin. */
export function POST(req: Request) {
  return handle(async () => {
    const me = await requireManager();
    const body = createSchema.parse(await readJson(req));
    if (!canAssignRole(me.role, body.role))
      throw new HttpError(403, "Hanya Sup Admin yang boleh membuat akun Sup Admin");
    if (body.memberId) {
      const m = await prisma.member.findFirst({
        where: { id: body.memberId, organizationId: me.organizationId },
      });
      if (!m) throw new HttpError(400, "Anggota tidak ditemukan");
    }
    try {
      const u = await prisma.user.create({
        data: {
          id: newId(),
          organizationId: me.organizationId,
          memberId: body.memberId,
          username: body.username,
          credentialHash: await bcrypt.hash(body.pin, 10),
          role: body.role,
          createdBy: me.id,
        },
        select: { id: true },
      });
      return json({ id: u.id }, 201);
    } catch (e) {
      if (prismaCode(e) === "P2002")
        throw new HttpError(409, "Username atau anggota ini sudah punya akun");
      throw e;
    }
  });
}
