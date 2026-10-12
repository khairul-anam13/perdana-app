import { z } from "zod";
import { isoDate, rowBase } from "../../lib/schema-common";

export const ISSUE_KINDS = ["jalan", "gang", "balai", "lainnya"] as const;
export type IssueKind = (typeof ISSUE_KINDS)[number];
export const KIND_LABEL: Record<IssueKind, string> = {
  jalan: "Lampu jalan",
  gang: "Lampu gang",
  balai: "Balai atau lapangan",
  lainnya: "Lainnya",
};

export const ISSUE_CONDITIONS = ["mati", "redup", "rusak"] as const;
export type IssueCondition = (typeof ISSUE_CONDITIONS)[number];
export const CONDITION_LABEL: Record<IssueCondition, string> = {
  mati: "Mati",
  redup: "Redup",
  rusak: "Rusak",
};
export const CONDITION_HINT =
  "Mati = tidak menyala. Redup = redup atau berkedip. Rusak = tiang, kabel, atau kap pecah.";

export const ISSUE_STATUSES = ["terbuka", "diperbaiki"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const lightingIssueSchema = z.object({
  ...rowBase,
  location: z.string().trim().min(3, "Lokasi minimal 3 huruf").max(120),
  kind: z.enum(ISSUE_KINDS),
  condition: z.enum(ISSUE_CONDITIONS),
  note: z.string().trim().max(300).nullable(),
  /** tanggal rusak/mati pertama kali terlihat; dipakai menghitung sudah berapa hari */
  reportedDate: isoDate,
  status: z.enum(ISSUE_STATUSES),
  fixedDate: isoDate.nullable(),
});
export type LightingIssue = z.infer<typeof lightingIssueSchema>;

export const issueFormSchema = lightingIssueSchema.pick({
  location: true,
  kind: true,
  condition: true,
  note: true,
  reportedDate: true,
});
export type IssueForm = z.input<typeof issueFormSchema>;
