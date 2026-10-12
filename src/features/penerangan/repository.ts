import { db } from "@/lib/db/local";
import type { SessionUser } from "@/lib/auth/session";
import { nowISO, todayISO } from "@/lib/format/tanggal";
import { newId } from "@/lib/id";
import { writeAndEnqueue } from "@/lib/sync/outbox";
import type { IssueForm, LightingIssue } from "./schema";

export const listIssues = (): Promise<LightingIssue[]> =>
  db.lightingIssues.filter((i) => !i.deletedAt).toArray();

export async function saveIssue(
  form: IssueForm,
  user: SessionUser,
  existing?: LightingIssue,
): Promise<string> {
  const now = nowISO();
  const values = {
    location: form.location.trim(),
    kind: form.kind,
    condition: form.condition,
    note: form.note?.trim() || null,
    reportedDate: form.reportedDate,
  };
  const row: LightingIssue = existing
    ? { ...existing, ...values, updatedAt: now }
    : {
        id: newId(),
        organizationId: user.organizationId,
        ...values,
        status: "terbuka",
        fixedDate: null,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
  return writeAndEnqueue("lightingIssue", existing ? "update" : "create", row);
}

/** Tandai sudah diperbaiki (tanggal hari ini) atau buka lagi bila rusak kembali / salah tandai. */
export function setFixed(issue: LightingIssue, fixed: boolean): Promise<string> {
  return writeAndEnqueue("lightingIssue", "update", {
    ...issue,
    status: fixed ? "diperbaiki" : "terbuka",
    fixedDate: fixed ? todayISO() : null,
    updatedAt: nowISO(),
  });
}

export function deleteIssue(issue: LightingIssue): Promise<string> {
  const now = nowISO();
  return writeAndEnqueue("lightingIssue", "delete", { ...issue, deletedAt: now, updatedAt: now });
}

/** Sudah berapa hari sejak tanggal (keduanya "YYYY-MM-DD"). */
export const hariSejak = (date: string, today = todayISO()): number =>
  Math.max(0, Math.round((Date.parse(today) - Date.parse(date)) / 86_400_000));
