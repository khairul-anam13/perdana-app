"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/empty-state";
import { IconWhatsapp } from "@/components/ui/icons";
import { MonthNav } from "@/components/ui/month-nav";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { getMeta } from "@/lib/db/local";
import { formatRupiah } from "@/lib/format/rupiah";
import { formatBulan, formatTanggal, monthKey, todayISO } from "@/lib/format/tanggal";
import { balance, byCategory, summarize } from "@/features/kas/ledger";
import { whatsappLink, whatsappReport } from "@/features/kas/report";
import { useLedger } from "@/features/kas/use-ledger";

export default function LaporanKasPage() {
  const { txs, loading } = useLedger();
  const toast = useToast();
  const org = useLiveQuery(() => getMeta<{ name: string }>("organization"), []);
  const [month, setMonth] = useState(() => monthKey(todayISO()));

  const report = useMemo(() => {
    const inMonth = txs.filter((t) => monthKey(t.transactionDate) === month);
    const before = txs.filter((t) => monthKey(t.transactionDate) < month);
    const upTo = txs.filter((t) => monthKey(t.transactionDate) <= month);
    return {
      inMonth: [...inMonth].sort((a, b) => a.transactionDate.localeCompare(b.transactionDate)),
      opening: balance(before),
      closing: balance(upTo),
      summary: summarize(inMonth, txs),
      income: byCategory(inMonth, txs, "pemasukan"),
      expense: byCategory(inMonth, txs, "pengeluaran"),
    };
  }, [txs, month]);

  const text = whatsappReport({
    orgName: org?.name ?? "Karang Taruna",
    month,
    openingBalance: report.opening,
    summary: report.summary,
    closingBalance: report.closing,
    income: report.income,
    expense: report.expense,
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.show("Teks laporan disalin");
    } catch {
      toast.show("Tidak bisa menyalin. Pakai tombol WhatsApp.", "error");
    }
  }

  const pos = [
    {
      title: "Pemasukan",
      sign: "+",
      rows: report.income,
      sum: report.summary.income,
      color: "text-pulpen-600",
    },
    {
      title: "Pengeluaran",
      sign: "−",
      rows: report.expense,
      sum: report.summary.expense,
      color: "text-merah-600",
    },
  ];

  return (
    <>
      <PageHeader
        title="Laporan kas"
        subtitle="Bisa dilihat semua anggota, juga tanpa internet."
        back={{ href: "/kas", label: "Kas" }}
      />
      <div className="flex flex-col gap-5">
        <MonthNav value={month} onChange={setMonth} />

        {loading ? (
          <ListSkeleton rows={5} />
        ) : (
          <>
            {/* Satu lembar laporan, urut seperti buku kas: saldo awal, pos-pos, saldo akhir. */}
            <section aria-label={`Ringkasan ${formatBulan(month)}`} className="lembar px-4 py-1">
              <dl className="divide-y divide-garis">
                <div className="flex items-baseline justify-between gap-3 py-3">
                  <dt className="text-tinta-pudar">Saldo awal</dt>
                  <dd className="font-bold">{formatRupiah(report.opening)}</dd>
                </div>
                {pos.map((g) => (
                  <div key={g.title} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="font-bold">{g.title}</dt>
                      <dd className={`font-bold ${g.color}`}>
                        {g.sign} {formatRupiah(g.sum)}
                      </dd>
                    </div>
                    {g.rows.length > 0 && (
                      <ul className="mt-1.5 flex flex-col gap-1 pl-4 text-sm text-tinta-pudar">
                        {g.rows.map((r) => (
                          <li key={r.category} className="flex justify-between gap-3">
                            <span>{r.category}</span>
                            <span>{formatRupiah(r.total)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-3 py-4">
                  <dt className="font-bold">Saldo akhir</dt>
                  <dd
                    className={`font-display text-2xl font-bold ${report.closing < 0 ? "text-merah-600" : ""}`}
                  >
                    <span className="jumlah">{formatRupiah(report.closing)}</span>
                  </dd>
                </div>
              </dl>
            </section>

            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href={whatsappLink(text)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: "primary", size: "lg", block: true })}
              >
                <IconWhatsapp className="size-5" /> Bagikan ke WhatsApp
              </a>
              <Button variant="secondary" size="lg" block onClick={copy}>
                Salin teks laporan
              </Button>
              <p className="text-sm text-tinta-pudar sm:col-span-2">
                WhatsApp butuh internet. Salin teks bisa kapan saja.
              </p>
            </div>

            <section aria-labelledby="rincian">
              <h2 id="rincian" className="mb-2 font-display text-lg font-bold">
                Rincian {formatBulan(month)}
              </h2>
              {report.inMonth.length === 0 ? (
                <p className="lembar border-dashed p-4 text-tinta-pudar shadow-none">
                  Belum ada transaksi di bulan ini. Saldo akhir sama dengan saldo awal.
                </p>
              ) : (
                <ul className="lembar divide-y divide-garis px-4">
                  {report.inMonth.map((t) => (
                    <li key={t.id} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="font-bold">{t.category}</p>
                        <p className="truncate text-sm text-tinta-pudar">
                          {formatTanggal(t.transactionDate)}
                          {t.note ? `, ${t.note}` : ""}
                        </p>
                      </div>
                      <p
                        className={`shrink-0 font-bold ${t.type === "pemasukan" ? "text-pulpen-600" : "text-merah-600"}`}
                      >
                        {t.type === "pemasukan" ? "+" : "−"} {formatRupiah(t.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
