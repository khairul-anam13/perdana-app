import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@/lib/auth/permissions";
import { prisma } from "./db";
import { HttpError } from "./http";

export const SESSION_COOKIE = "perdana_session";
export const SESSION_DAYS = 30;

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  role: Role;
  memberId: string | null;
  organizationId: string;
};

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET belum diatur (minimal 32 karakter)");
  return new TextEncoder().encode(s);
}

export async function issueSessionCookie(userId: string): Promise<number> {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
  return expiresAt;
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Pengguna dari cookie. Peran SELALU dibaca dari database (bukan dari token),
 * sehingga perubahan peran/penonaktifan langsung berlaku.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  let sub: string | undefined;
  try {
    sub = (await jwtVerify(token, secret())).payload.sub;
  } catch {
    return null;
  }
  if (!sub) return null;
  const u = await prisma.user.findFirst({
    where: { id: sub, active: true, deletedAt: null },
    include: { member: { select: { fullName: true, nickname: true } } },
  });
  return u ? toAuthUser(u) : null;
}

export function toAuthUser(u: {
  id: string;
  username: string;
  role: string;
  memberId: string | null;
  organizationId: string;
  member: { fullName: string; nickname: string | null } | null;
}): AuthUser {
  return {
    id: u.id,
    username: u.username,
    name: u.member?.nickname || u.member?.fullName || u.username,
    role: u.role as Role,
    memberId: u.memberId,
    organizationId: u.organizationId,
  };
}

export async function requireUser(roles?: readonly Role[]): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) throw new HttpError(401, "Sesi habis. Masuk lagi.");
  if (roles && !roles.includes(user.role))
    throw new HttpError(403, "Peran Anda tidak boleh melakukan ini");
  return user;
}
