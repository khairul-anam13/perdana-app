import { formatRupiah } from "@/lib/format/rupiah";
import { formatBulan } from "@/lib/format/tanggal";
import type { Summary } from "./ledger";

/** Teks ringkas laporan kas bulanan untuk dibagikan ke WhatsApp. Murni, mudah diuji. */
export function whatsappReport(opts: {
  orgName: string;
  month: string;
  openingBalance: number;
  summary: Summary;
  closingBalance: number;
  income: { category: string; total: number }[];
  expense: { category: string; total: number }[];
}): string {
  const { orgName, month, openingBalance, summary, closingBalance, income, expense } = opts;
  const lines: string[] = [
    `*LAPORAN KAS ${orgName.toUpperCase()}*`,
    `Bulan ${formatBulan(month)}`,
    "",
    `Saldo awal: ${formatRupiah(openingBalance)}`,
    `Pemasukan: ${formatRupiah(summary.income)}`,
    ...income.map((r) => `  • ${r.category}: ${formatRupiah(r.total)}`),
    `Pengeluaran: ${formatRupiah(summary.expense)}`,
    ...expense.map((r) => `  • ${r.category}: ${formatRupiah(r.total)}`),
    "",
    `*Saldo akhir: ${formatRupiah(closingBalance)}*`,
    "",
    "Dibuat dari aplikasi Perdana.",
  ];
  return lines.join("\n");
}

export const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
