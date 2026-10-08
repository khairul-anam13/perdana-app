import { pushRequestSchema } from "@/lib/sync/protocol";
import { requireUser } from "@/server/auth";
import { handle, json, readJson } from "@/server/http";
import { applyChanges } from "@/server/sync/push";

/** Terima batch perubahan dari klien. Tiap item divalidasi, dicek hak akses, lalu diterapkan secara idempoten. */
export function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { changes } = pushRequestSchema.parse(await readJson(req));
    return json(await applyChanges(user, changes));
  });
}
