import { z } from "zod";
import { canWrite } from "@/lib/auth/permissions";
import { requireUser } from "@/server/auth";
import { nextSeq, prisma, withOrgLock } from "@/server/db";
import { handle, HttpError, json } from "@/server/http";

const MAX_BYTES = 1_000_000; // target klien < 300 KB; batas server lebih longgar
const MIME = ["image/jpeg", "image/png", "image/webp"];
type Ctx = { params: Promise<{ id: string }> };

async function idOf(ctx: Ctx): Promise<string> {
  return z.uuid().parse((await ctx.params).id);
}

/** Unggah nota (antrean terpisah dari batch data). Idempoten: ID yang sama tidak ditimpa. */
export function PUT(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    if (!canWrite(user.role, "transaction"))
      throw new HttpError(403, "Peran Anda tidak boleh mengunggah nota");
    const id = await idOf(ctx);
    const mime = (req.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!MIME.includes(mime)) throw new HttpError(415, "Format nota harus JPEG, PNG, atau WebP");
    const data = Buffer.from(await req.arrayBuffer());
    if (data.length === 0 || data.length > MAX_BYTES)
      throw new HttpError(413, "Ukuran nota tidak valid");

    const status = await withOrgLock(user.organizationId, async (tx) => {
      const existing = await tx.receipt.findUnique({
        where: { id },
        select: { organizationId: true },
      });
      if (existing) {
        if (existing.organizationId !== user.organizationId)
          throw new HttpError(404, "Nota tidak ditemukan");
        return "duplikat" as const;
      }
      await tx.receipt.create({
        data: {
          id,
          organizationId: user.organizationId,
          mime,
          size: data.length,
          data,
          createdBy: user.id,
          serverSeq: await nextSeq(tx),
        },
      });
      return "ok" as const;
    });
    return json({ status });
  });
}

/** Ambil gambar nota (semua anggota yang sudah masuk boleh melihat: kas transparan). */
export function GET(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const id = await idOf(ctx);
    const r = await prisma.receipt.findFirst({
      where: { id, organizationId: user.organizationId, deletedAt: null },
    });
    if (!r) throw new HttpError(404, "Nota tidak ditemukan");
    return new Response(new Uint8Array(r.data), {
      headers: { "Content-Type": r.mime, "Cache-Control": "private, max-age=31536000, immutable" },
    });
  });
}
