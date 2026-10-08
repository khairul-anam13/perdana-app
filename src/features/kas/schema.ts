import { z } from "zod";
import { isoDate, rowBase, uuid } from "../../lib/schema-common";

export const TX_TYPES = ["pemasukan", "pengeluaran"] as const;
export type TxType = (typeof TX_TYPES)[number];
export const TX_LABEL: Record<TxType, string> = {
  pemasukan: "Pemasukan",
  pengeluaran: "Pengeluaran",
};

export const INCOME_CATEGORIES = ["Iuran", "Donasi", "Kas kegiatan", "Lainnya"] as const;
export const EXPENSE_CATEGORIES = [
  "Konsumsi",
  "Perlengkapan",
  "Transportasi",
  "Sewa tempat",
  "Lainnya",
] as const;
export const CATEGORY_IURAN = "Iuran";

/** Batas Int 32-bit di PostgreSQL. */
export const MAX_AMOUNT = 2_000_000_000;

export const transactionSchema = z.object({
  ...rowBase,
  type: z.enum(TX_TYPES),
  amount: z
    .number()
    .int("Nominal harus bilangan bulat")
    .positive("Nominal harus lebih dari 0")
    .max(MAX_AMOUNT, "Nominal terlalu besar"),
  category: z.string().trim().min(1, "Pilih kategori").max(40),
  note: z.string().trim().max(200).nullable(),
  transactionDate: isoDate,
  activityId: uuid.nullable(),
  memberId: uuid.nullable(),
  reversesTransactionId: uuid.nullable(),
  receiptId: uuid.nullable(),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const transactionFormSchema = transactionSchema.pick({
  type: true,
  amount: true,
  category: true,
  note: true,
  transactionDate: true,
  activityId: true,
  memberId: true,
});
export type TransactionForm = z.input<typeof transactionFormSchema>;

/** Metadata nota. File-nya (blob) hanya ada di perangkat yang memotretnya. */
export type Receipt = {
  id: string;
  organizationId: string;
  status: "menunggu" | "terunggah";
  mime: string;
  size: number;
  blob?: Blob;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};
