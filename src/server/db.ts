import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diatur");
  // Serverless (Vercel): tiap instance cukup beberapa koneksi; pooler Supabase yang membagi ke Postgres.
  const max = process.env.VERCEL ? 3 : undefined;
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max }) });
}

export const prisma = globalForPrisma.prisma ?? create();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type Tx = Prisma.TransactionClient;

/** Kode error Prisma yang dikenal (P2002 = unik bentrok, P2003 = FK gagal). */
export const prismaCode = (e: unknown): string | null =>
  e instanceof Prisma.PrismaClientKnownRequestError ? e.code : null;

/**
 * Semua tulis per organisasi diserialkan dengan advisory lock selama transaksi.
 * Akibatnya server_seq terbit dan ter-commit berurutan, sehingga kursor pull tidak pernah melewatkan baris.
 */
export function withOrgLock<T>(organizationId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${organizationId}))`;
      return fn(tx);
    },
    { timeout: 15_000 },
  );
}

/** Nomor urut berikutnya dari sequence bersama (kursor pull). */
export async function nextSeq(tx: Tx): Promise<bigint> {
  const rows = await tx.$queryRaw<{ n: bigint }[]>`select nextval('server_seq') as n`;
  return rows[0].n;
}
