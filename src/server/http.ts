import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Bungkus handler route: ubah error terduga jadi JSON ramah, tanpa membocorkan detail/data sensitif ke log. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof ZodError)
      return json({ error: e.issues[0]?.message ?? "Data tidak valid" }, 400);
    console.error("[api] error tak terduga:", e instanceof Error ? e.name : typeof e);
    return json({ error: "Terjadi kesalahan di server. Coba lagi nanti." }, 500);
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Permintaan tidak valid");
  }
}
