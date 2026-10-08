import { z } from "zod";
import { isoDate, isoDateTime, rowBase, uuid } from "../../lib/schema-common";

export const ACTIVITY_STATUSES = ["rencana", "berjalan", "selesai"] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];
export const ACTIVITY_STATUS_LABEL: Record<ActivityStatus, string> = {
  rencana: "Rencana",
  berjalan: "Berjalan",
  selesai: "Selesai",
};

export const activitySchema = z.object({
  ...rowBase,
  title: z.string().trim().min(3, "Judul minimal 3 huruf").max(120),
  description: z.string().trim().max(1000).nullable(),
  startDate: isoDate,
  endDate: isoDate.nullable(),
  location: z.string().trim().max(120).nullable(),
  status: z.enum(ACTIVITY_STATUSES),
  leaderId: uuid.nullable(),
});
export type Activity = z.infer<typeof activitySchema>;

export const activityFormSchema = activitySchema
  .pick({
    title: true,
    description: true,
    startDate: true,
    endDate: true,
    location: true,
    status: true,
    leaderId: true,
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
    path: ["endDate"],
  });
export type ActivityForm = z.input<typeof activityFormSchema>;

export const ATTENDANCE_STATUSES = ["hadir", "izin", "alpa"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  hadir: "Hadir",
  izin: "Izin",
  alpa: "Alpa",
};

export const attendanceSchema = z.object({
  ...rowBase,
  activityId: uuid,
  memberId: uuid,
  status: z.enum(ATTENDANCE_STATUSES),
  recordedAt: isoDateTime,
  recordedBy: uuid.nullable(),
});
export type Attendance = z.infer<typeof attendanceSchema>;
