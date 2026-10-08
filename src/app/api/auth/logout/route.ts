import { clearSessionCookie } from "@/server/auth";
import { handle, json } from "@/server/http";

export function POST() {
  return handle(async () => {
    await clearSessionCookie();
    return json({ ok: true });
  });
}
