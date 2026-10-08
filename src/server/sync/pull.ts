import type { PullResponse } from "@/lib/sync/protocol";
import type { AuthUser } from "../auth";
import { prisma } from "../db";
import {
  activityToWire,
  attendanceToWire,
  memberToWire,
  redactMember,
  transactionToWire,
} from "./serialize";

type Tagged =
  | { seq: number; kind: "members"; row: PullResponse["changes"]["members"][number] }
  | { seq: number; kind: "activities"; row: PullResponse["changes"]["activities"][number] }
  | { seq: number; kind: "attendances"; row: PullResponse["changes"]["attendances"][number] }
  | { seq: number; kind: "transactions"; row: PullResponse["changes"]["transactions"][number] }
  | { seq: number; kind: "receipts"; row: PullResponse["changes"]["receipts"][number] };

/**
 * Perubahan sejak kursor `since` (server_seq global), maksimal `limit` baris, urut naik.
 * Baris yang dihapus ikut dikirim dengan deletedAt terisi (tombstone).
 */
export async function pullChanges(
  user: AuthUser,
  since: bigint,
  limit: number,
): Promise<PullResponse> {
  const take = limit + 1; // +1 untuk tahu apakah masih ada halaman berikutnya
  const where = { organizationId: user.organizationId, serverSeq: { gt: since } };
  const orderBy = { serverSeq: "asc" as const };

  const [members, activities, attendances, transactions, receipts, org] = await Promise.all([
    prisma.member.findMany({ where, orderBy, take }),
    prisma.activity.findMany({ where, orderBy, take }),
    prisma.attendance.findMany({ where, orderBy, take }),
    prisma.transaction.findMany({ where, orderBy, take }),
    prisma.receipt.findMany({
      where,
      orderBy,
      take,
      select: {
        id: true,
        organizationId: true,
        mime: true,
        size: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        serverSeq: true,
      },
    }),
    prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } }),
  ]);

  const all: Tagged[] = [
    ...members.map((r): Tagged => ({
      seq: Number(r.serverSeq),
      kind: "members",
      row: redactMember(memberToWire(r), user),
    })),
    ...activities.map((r): Tagged => ({
      seq: Number(r.serverSeq),
      kind: "activities",
      row: activityToWire(r),
    })),
    ...attendances.map((r): Tagged => ({
      seq: Number(r.serverSeq),
      kind: "attendances",
      row: attendanceToWire(r),
    })),
    ...transactions.map((r): Tagged => ({
      seq: Number(r.serverSeq),
      kind: "transactions",
      row: transactionToWire(r),
    })),
    ...receipts.map((r): Tagged => ({
      seq: Number(r.serverSeq),
      kind: "receipts",
      row: {
        id: r.id,
        organizationId: r.organizationId,
        mime: r.mime,
        size: r.size,
        createdBy: r.createdBy,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
      },
    })),
  ].sort((a, b) => a.seq - b.seq);

  const page = all.slice(0, limit);
  const changes: PullResponse["changes"] = {
    members: [],
    activities: [],
    attendances: [],
    transactions: [],
    receipts: [],
  };
  for (const t of page) (changes[t.kind] as (typeof t.row)[]).push(t.row);

  return {
    changes,
    cursor: page.length ? page[page.length - 1].seq : Number(since),
    hasMore: all.length > limit,
    me: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      memberId: user.memberId,
      organizationId: user.organizationId,
    },
    organization: {
      id: org.id,
      name: org.name,
      village: org.village,
      subdistrict: org.subdistrict,
      regency: org.regency,
    },
  };
}
