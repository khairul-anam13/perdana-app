import { z } from "zod";
import { canEditOrgSetting, type OrgSetting } from "@/lib/auth/permissions";
import { requireUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { handle, HttpError, json, readJson } from "@/server/http";

const patchSchema = z
  .object({
    termStart: z.number().int().min(2000).max(2100).nullable(),
    fineAbsent: z.number().int().min(0).max(10_000_000).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Tidak ada yang diubah");

/**
 * Ubah pengaturan organisasi: periode kepengurusan (Ketua, Sekretaris) dan tarif denda alpa
 * (Ketua, S. Denda). Jarang berubah, jadi sengaja hanya online dan tanpa antrean offline.
 */
export function PATCH(req: Request) {
  return handle(async () => {
    const me = await requireUser();
    const body = patchSchema.parse(await readJson(req));
    for (const key of Object.keys(body) as OrgSetting[])
      if (!canEditOrgSetting(me.role, key))
        throw new HttpError(403, "Peran Anda tidak boleh mengubah pengaturan ini");

    const org = await prisma.organization.update({
      where: { id: me.organizationId },
      data: body,
      select: { termStart: true, fineAbsent: true },
    });
    return json(org);
  });
}
