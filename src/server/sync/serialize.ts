import type {
  Activity as DbActivity,
  Attendance as DbAttendance,
  Member as DbMember,
  LightingIssue as DbLightingIssue,
  Transaction as DbTransaction,
} from "@/generated/prisma/client";
import type { Member } from "@/features/anggota/schema";
import type { Activity, Attendance } from "@/features/kegiatan/schema";
import type { Transaction } from "@/features/kas/schema";
import type { LightingIssue } from "@/features/penerangan/schema";
import { canSeeMemberContacts } from "@/lib/auth/permissions";
import type { AuthUser } from "../auth";

/** Baris database -> bentuk kawat (tanggal sebagai string). */

const day = (d: Date) => d.toISOString().slice(0, 10);
const time = (d: Date) => d.toISOString();
const timeOrNull = (d: Date | null) => (d ? d.toISOString() : null);
const dayOrNull = (d: Date | null) => (d ? day(d) : null);

export const memberToWire = (r: DbMember): Member => ({
  id: r.id,
  organizationId: r.organizationId,
  fullName: r.fullName,
  nickname: r.nickname,
  gender: r.gender as Member["gender"],
  birthDate: dayOrNull(r.birthDate),
  phone: r.phone,
  address: r.address,
  dusun: r.dusun,
  position: r.position,
  status: r.status as Member["status"],
  joinedAt: day(r.joinedAt),
  createdBy: r.createdBy,
  createdAt: time(r.createdAt),
  updatedAt: time(r.updatedAt),
  deletedAt: timeOrNull(r.deletedAt),
});

/** Anggota biasa hanya melihat nama, jabatan, dusun; kontak dan tanggal lahir hanya untuk pengurus (dan diri sendiri). */
export function redactMember(m: Member, viewer: AuthUser): Member {
  if (canSeeMemberContacts(viewer.role) || m.id === viewer.memberId) return m;
  return { ...m, phone: null, address: null, birthDate: null };
}

export const activityToWire = (r: DbActivity): Activity => ({
  id: r.id,
  organizationId: r.organizationId,
  title: r.title,
  description: r.description,
  startDate: day(r.startDate),
  endDate: dayOrNull(r.endDate),
  location: r.location,
  status: r.status as Activity["status"],
  leaderId: r.leaderId,
  createdBy: r.createdBy,
  createdAt: time(r.createdAt),
  updatedAt: time(r.updatedAt),
  deletedAt: timeOrNull(r.deletedAt),
});

export const attendanceToWire = (r: DbAttendance): Attendance => ({
  id: r.id,
  organizationId: r.organizationId,
  activityId: r.activityId,
  memberId: r.memberId,
  status: r.status as Attendance["status"],
  recordedAt: time(r.recordedAt),
  recordedBy: r.recordedBy,
  createdBy: r.createdBy,
  createdAt: time(r.createdAt),
  updatedAt: time(r.updatedAt),
  deletedAt: timeOrNull(r.deletedAt),
});

export const lightingIssueToWire = (r: DbLightingIssue): LightingIssue => ({
  id: r.id,
  organizationId: r.organizationId,
  location: r.location,
  kind: r.kind as LightingIssue["kind"],
  condition: r.condition as LightingIssue["condition"],
  note: r.note,
  reportedDate: day(r.reportedDate),
  status: r.status as LightingIssue["status"],
  fixedDate: dayOrNull(r.fixedDate),
  createdBy: r.createdBy,
  createdAt: time(r.createdAt),
  updatedAt: time(r.updatedAt),
  deletedAt: timeOrNull(r.deletedAt),
});

export const transactionToWire = (r: DbTransaction): Transaction => ({
  id: r.id,
  organizationId: r.organizationId,
  type: r.type as Transaction["type"],
  amount: r.amount,
  category: r.category,
  note: r.note,
  transactionDate: day(r.transactionDate),
  activityId: r.activityId,
  memberId: r.memberId,
  reversesTransactionId: r.reversesTransactionId,
  receiptId: r.receiptId,
  createdBy: r.createdBy,
  createdAt: time(r.createdAt),
  updatedAt: time(r.updatedAt),
  deletedAt: timeOrNull(r.deletedAt),
});
