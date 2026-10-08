import { db } from "@/lib/db/local";
import type { SessionUser } from "@/lib/auth/session";
import { nowISO } from "@/lib/format/tanggal";
import { newId } from "@/lib/id";
import { writeAndEnqueue } from "@/lib/sync/outbox";
import type { Activity, ActivityForm, Attendance, AttendanceStatus } from "./schema";

export async function listActivities(): Promise<Activity[]> {
  return db.activities.filter((a) => !a.deletedAt).toArray();
}

export async function saveActivity(
  form: ActivityForm,
  user: SessionUser,
  existing?: Activity,
): Promise<string> {
  const now = nowISO();
  const values = {
    title: form.title.trim(),
    description: form.description?.trim() || null,
    startDate: form.startDate,
    endDate: form.endDate || null,
    location: form.location?.trim() || null,
    status: form.status,
    leaderId: form.leaderId || null,
  };
  const row: Activity = existing
    ? { ...existing, ...values, updatedAt: now }
    : {
        id: newId(),
        organizationId: user.organizationId,
        ...values,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
  return writeAndEnqueue("activity", existing ? "update" : "create", row);
}

export async function deleteActivity(a: Activity): Promise<string> {
  const now = nowISO();
  return writeAndEnqueue("activity", "delete", { ...a, deletedAt: now, updatedAt: now });
}

export async function listAttendances(activityId: string): Promise<Attendance[]> {
  return db.attendances
    .where("activityId")
    .equals(activityId)
    .filter((a) => !a.deletedAt)
    .toArray();
}

/**
 * Catat/ubah absensi. Satu baris per (kegiatan, anggota): bila sudah ada, baris itu diperbarui
 * (ID sama) sehingga absen ganda tidak mungkin terjadi, juga setelah sinkronisasi.
 */
export async function setAttendance(
  activityId: string,
  memberId: string,
  status: AttendanceStatus,
  user: SessionUser,
): Promise<string> {
  const now = nowISO();
  const existing = await db.attendances
    .where("[activityId+memberId]")
    .equals([activityId, memberId])
    .first();
  const row: Attendance = existing
    ? { ...existing, status, recordedAt: now, recordedBy: user.id, updatedAt: now, deletedAt: null }
    : {
        id: newId(),
        organizationId: user.organizationId,
        activityId,
        memberId,
        status,
        recordedAt: now,
        recordedBy: user.id,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
  return writeAndEnqueue("attendance", existing ? "update" : "create", row);
}
