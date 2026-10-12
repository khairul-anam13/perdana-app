import { z } from "zod";
import type { Role, SyncEntity } from "../auth/permissions";
import type { Member } from "../../features/anggota/schema";
import type { Activity, Attendance } from "../../features/kegiatan/schema";
import type { Transaction } from "../../features/kas/schema";
import type { LightingIssue } from "../../features/penerangan/schema";
import { isoDateTime, uuid } from "../schema-common";

/** Kontrak API sinkronisasi (dipakai klien dan server). */

export const SYNC_ENTITIES = [
  "member",
  "activity",
  "attendance",
  "transaction",
  "lightingIssue",
] as const satisfies readonly SyncEntity[];

export const changeSchema = z.object({
  /** ID perubahan di antrean klien; kunci hasil per item */
  changeId: uuid,
  /** ID baris yang diubah; kunci idempotensi */
  id: uuid,
  entity: z.enum(SYNC_ENTITIES),
  op: z.enum(["create", "update", "delete"]),
  payload: z.unknown(),
  clientUpdatedAt: isoDateTime,
});
export type Change = z.infer<typeof changeSchema>;

export const MAX_PUSH_BATCH = 50;
export const pushRequestSchema = z.object({
  changes: z.array(changeSchema).min(1).max(MAX_PUSH_BATCH),
});

export type PushResult = {
  changeId: string;
  status: "ok" | "duplikat" | "ditolak";
  reason?: string;
};
export type PushResponse = { results: PushResult[]; serverSeq: number };

export type ReceiptMeta = {
  id: string;
  organizationId: string;
  mime: string;
  size: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SessionUserWire = {
  id: string;
  username: string;
  name: string;
  role: Role;
  memberId: string | null;
  organizationId: string;
};

export type PullResponse = {
  changes: {
    members: Member[];
    activities: Activity[];
    attendances: Attendance[];
    transactions: Transaction[];
    lightingIssues: LightingIssue[];
    receipts: ReceiptMeta[];
  };
  cursor: number;
  hasMore: boolean;
  me: SessionUserWire;
  organization: {
    id: string;
    name: string;
    village: string;
    subdistrict: string;
    regency: string;
    termStart: number | null;
    fineAbsent: number | null;
  };
};

export const PULL_LIMIT = 200;
