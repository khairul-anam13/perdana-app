import { z } from "zod";
import { isoDate, rowBase } from "../../lib/schema-common";

export const GENDERS = ["L", "P"] as const;
export const MEMBER_STATUSES = ["aktif", "nonaktif", "alumni"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const STATUS_LABEL: Record<MemberStatus, string> = {
  aktif: "Aktif",
  nonaktif: "Nonaktif",
  alumni: "Alumni",
};

export const POSITIONS = [
  "Anggota",
  "Ketua",
  "Wakil Ketua",
  "Sekretaris",
  "Bendahara",
  "Seksi Kelistrikan",
  "Seksi Denda",
  "Seksi",
] as const;

export const memberSchema = z.object({
  ...rowBase,
  fullName: z.string().trim().min(2, "Nama minimal 2 huruf").max(100),
  nickname: z.string().trim().max(50).nullable(),
  gender: z.enum(GENDERS),
  /** null = disembunyikan dari anggota biasa (server menyaring) */
  birthDate: isoDate.nullable(),
  phone: z.string().trim().max(20).nullable(),
  address: z.string().trim().max(200).nullable(),
  dusun: z.string().trim().max(60).nullable(),
  position: z.string().trim().min(1).max(60),
  status: z.enum(MEMBER_STATUSES),
  joinedAt: isoDate,
});
export type Member = z.infer<typeof memberSchema>;

/** Isian formulir (tanpa kolom sistem). */
export const memberFormSchema = memberSchema.pick({
  fullName: true,
  nickname: true,
  gender: true,
  birthDate: true,
  phone: true,
  address: true,
  dusun: true,
  position: true,
  status: true,
  joinedAt: true,
});
export type MemberForm = z.infer<typeof memberFormSchema>;

export const MIN_AGE = 13;
export const MAX_AGE = 45;
