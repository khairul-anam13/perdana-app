import bcrypt from "bcryptjs";
import { z } from "zod";
import { canAssignRole, canManageUsers, ROLES, type Role } from "@/lib/auth/permissions";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { handle, HttpError, json, readJson } from "@/server/http";

const patchSchema = z.object({
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  pin: z
    .string()
    .regex(/^\d{6}$/, "PIN harus 6 angka")
    .optional(),
});

/**
 * Ubah peran, aktif/nonaktif, atau reset PIN (Sup Admin dan Ketua). Tidak bisa mengubah peran/status
 * akun sendiri. Akun Sup Admin hanya bisa diubah Sup Admin, dan hanya Sup Admin yang bisa menunjuk Sup Admin.
 */
export function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const me = await requireUser();
    if (!canManageUsers(me.role)) throw new HttpError(403, "Peran Anda tidak boleh mengelola akun");
    const id = z.uuid().parse((await ctx.params).id);
    const body = patchSchema.parse(await readJson(req));
    if (id === me.id && (body.role !== undefined || body.active !== undefined))
      throw new HttpError(400, "Peran dan status akun sendiri tidak bisa diubah");
    const target = await prisma.user.findFirst({
      where: { id, organizationId: me.organizationId, deletedAt: null },
    });
    if (!target) throw new HttpError(404, "Akun tidak ditemukan");
    if (
      !canAssignRole(me.role, target.role as Role) ||
      (body.role && !canAssignRole(me.role, body.role))
    )
      throw new HttpError(403, "Hanya Sup Admin yang boleh mengubah akun Sup Admin");

    await prisma.user.update({
      where: { id },
      data: {
        ...(body.role !== undefined && { role: body.role }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.pin !== undefined && {
          credentialHash: await bcrypt.hash(body.pin, 10),
          failedLogins: 0,
          lockedUntil: null,
        }),
      },
    });
    return json({ ok: true });
  });
}
