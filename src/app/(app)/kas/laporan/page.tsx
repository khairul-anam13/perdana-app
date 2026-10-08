"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconWhatsapp } from "@/components/ui/icons";
import { MonthNav } from "@/components/ui/month-nav";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { buttonClass } from "@/components/ui/button";
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

  return (
    <>
      <PageHeader
        module="kas"
        title="Laporan kas"
        subtitle="Bisa dilihat semua anggota, juga tanpa internet."
        back={{ href: "/kas", label: "Kas" }}
      />
      <div className="flex flex-col gap-4">
        <MonthNav value={month} onChange={setMonth} />

        {loading ? (
          <p className="py-10 text-center text-tinta-lembut">Membuka data…</p>
        ) : (
          <>
            <section
              aria-label={`Ringkasan ${formatBulan(month)}`}
              className="rounded-3xl bg-white p-5 ring-1 ring-garis"
            >
              <dl className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-tinta-lembut">Saldo awal</dt>
                  <dd className="font-semibold tabular-nums">{formatRupiah(report.opening)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-tinta-lembut">Pemasukan</dt>
                  <dd className="font-semibold text-daun-700 tabular-nums">
                    + {formatRupiah(report.summary.income)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-tinta-lembut">Pengeluaran</dt>
                  <dd className="font-semibold text-bata-700 tabular-nums">
                    − {formatRupiah(report.summary.expense)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-garis pt-3">
                  <dt className="font-semibold">Saldo akhir</dt>
                  <dd className="text-2xl font-bold tabular-nums">
                    {formatRupiah(report.closing)}
                  </dd>
                </div>
              </dl>
            </section>

            {(report.income.length > 0 || report.expense.length > 0) && (
              <section className="grid gap-4 sm:grid-cols-2" aria-label="Rincian per kategori">
                {[
                  { title: "Pemasukan per kategori", rows: report.income, color: "text-daun-700" },
                  {
                    title: "Pengeluaran per kategori",
                    rows: report.expense,
                    color: "text-bata-700",
                  },
                ].map((g) => (
                  <div key={g.title} className="rounded-2xl bg-white p-4 ring-1 ring-garis">
                    <h2 className="mb-2 font-semibold">{g.title}</h2>
                    {g.rows.length === 0 ? (
                      <p className="text-sm text-tinta-lembut">Tidak ada.</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5 text-sm">
                        {g.rows.map((r) => (
                          <li key={r.category} className="flex justify-between gap-3">
                            <span>{r.category}</span>
                            <span className={`font-semibold tabular-nums ${g.color}`}>
                              {formatRupiah(r.total)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </section>
            )}

            <section aria-label="Daftar transaksi bulan ini">
              <h2 className="mb-2 font-semibold">Transaksi {formatBulan(month)}</h2>
              {report.inMonth.length === 0 ? (
                <p className="rounded-2xl bg-white p-4 text-tinta-lembut ring-1 ring-garis">
                  Belum ada transaksi di bulan ini.
                </p>
              ) : (
                <ul className="divide-y divide-garis rounded-2xl bg-white px-4 ring-1 ring-garis">
                  {report.inMonth.map((t) => (
                    <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">{t.category}</p>
                        <p className="truncate text-sm text-tinta-lembut">
                          {formatTanggal(t.transactionDate)}
                          {t.note ? ` · ${t.note}` : ""}
                        </p>
                      </div>
                      <p
                        className={`shrink-0 font-semibold tabular-nums ${t.type === "pemasukan" ? "text-daun-700" : "text-bata-700"}`}
                      >
                        {t.type === "pemasukan" ? "+" : "−"} {formatRupiah(t.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
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
            </div>
            <p className="text-center text-sm text-tinta-lembut">
              Tombol WhatsApp butuh internet. Salin teks bisa dipakai kapan saja.
            </p>
          </>
        )}
      </div>
    </>
  );
}
