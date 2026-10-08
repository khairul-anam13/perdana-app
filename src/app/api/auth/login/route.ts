import bcrypt from "bcryptjs";
import { z } from "zod";
import { issueSessionCookie, toAuthUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { handle, HttpError, json, readJson } from "@/server/http";

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Isi username").max(40),
  pin: z.string().regex(/^\d{6}$/, "PIN harus 6 angka"),
});

// Dipakai agar waktu respons tidak membedakan username yang ada dan yang tidak.
const DUMMY_HASH = bcrypt.hashSync("000000", 10);

export function POST(req: Request) {
  return handle(async () => {
    const { username, pin } = loginSchema.parse(await readJson(req));
    // MVP satu organisasi: username unik per organisasi, cukup dicari langsung.
    const user = await prisma.user.findFirst({
      where: { username, deletedAt: null },
      include: { member: { select: { fullName: true, nickname: true } } },
    });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new HttpError(429, `Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`);
    }

    const ok = await bcrypt.compare(pin, user?.credentialHash ?? DUMMY_HASH);
    if (!user || !user.active || !ok) {
      if (user) {
        const fails = user.failedLogins + 1;
        await prisma.user.update({
          where: { id: user.id },
          data:
            fails >= MAX_FAILS
              ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
              : { failedLogins: fails },
        });
      }
      throw new HttpError(401, "Username atau PIN salah.");
    }

    if (user.failedLogins > 0 || user.lockedUntil)
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: null },
      });

    const expiresAt = await issueSessionCookie(user.id);
    return json({ user: toAuthUser(user), expiresAt });
  });
}
