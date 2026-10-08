import { ageOn, todayISO } from "../../lib/format/tanggal";
import { MAX_AGE } from "./schema";

export type AgeFlag = "lewat" | "mendekati";

/**
 * Batas usia Karang Taruna: 13-45 tahun.
 * "lewat"     = sudah 46 tahun atau lebih.
 * "mendekati" = usia 44-45 (dua tahun terakhir sebelum lewat).
 */
export function ageFlag(birthDate: string | null, today = todayISO()): AgeFlag | null {
  if (!birthDate) return null;
  const age = ageOn(birthDate, today);
  if (age > MAX_AGE) return "lewat";
  if (age >= MAX_AGE - 1) return "mendekati";
  return null;
}
