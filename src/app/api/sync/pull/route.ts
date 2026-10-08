import { PULL_LIMIT } from "@/lib/sync/protocol";
import { requireUser } from "@/server/auth";
import { handle, HttpError, json } from "@/server/http";
import { pullChanges } from "@/server/sync/pull";

/** Perubahan sejak kursor `since` (server_seq). Mendukung paginasi lewat `limit` + `hasMore`. */
export function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const sinceRaw = url.searchParams.get("since") ?? "0";
    if (!/^\d{1,15}$/.test(sinceRaw)) throw new HttpError(400, "Kursor tidak valid");
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || PULL_LIMIT, 1), 500);
    return json(await pullChanges(user, BigInt(sinceRaw), limit));
  });
}
