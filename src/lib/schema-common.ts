import { z } from "zod";

export const uuid = z.uuid();
/** "YYYY-MM-DD" */
export const isoDate = z.iso.date();
/** ISO UTC, mis. "2026-10-03T07:05:09.123Z" */
export const isoDateTime = z.iso.datetime();

/** Kolom standar yang ada di semua tabel data. */
export const rowBase = {
  id: uuid,
  organizationId: uuid,
  createdBy: uuid.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTime.nullable(),
};
