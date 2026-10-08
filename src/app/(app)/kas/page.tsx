"use client";

import { useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/field";
import { IconDues, IconPlus, IconReport, IconWallet } from "@/components/ui/icons";
import { MonthNav } from "@/components/ui/month-nav";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { formatBulan, formatTanggalPanjang, monthKey, todayISO } from "@/lib/format/tanggal";
import { usePerm } from "@/lib/auth/use-perm";
import { useLookups } from "@/features/use-lookups";
import { balance, summarize } from "@/features/kas/ledger";
import { SaldoCard } from "@/features/kas/saldo-card";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Transaction,
  type TxType,
} from "@/features/kas/schema";
import { TransactionRow } from "@/features/kas/transaction-row";
import { TransactionSheet } from "@/features/kas/transaction-sheet";
import { useLedger } from "@/features/kas/use-ledger";

type TypeFilter = "semua" | TxType;
const ALL_CATEGORIES = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])];

export default function KasPage() {
  const { txs, loading, pendingIds, reversed } = useLedger();
  const { memberName, activityTitle } = useLookups();
  const { can } = usePerm();
  const [month, setMonth] = useState(() => monthKey(todayISO()));
  const [type, setType] = useState<TypeFilter>("semua");
  const [category, setCategory] = useState("semua");
  const [open, setOpen] = useState<Transaction | null>(null);

  const inMonth = useMemo(
    () => txs.filter((t) => monthKey(t.transactionDate) === month),
    [txs, month],
  );
  const shown = useMemo(
    () =>
      inMonth.filter(
        (t) =>
          (type === "semua" || t.type === type) &&
          (category === "semua" || t.category === category),
      ),
    [inMonth, type, category],
  );
  const summary = useMemo(() => summarize(inMonth, txs), [inMonth, txs]);
  const groups = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of shown) m.set(t.transactionDate, [...(m.get(t.transactionDate) ?? []), t]);
    return [...m];
  }, [shown]);

  const canWriteKas = can("transaction");

  return (
    <>
      <PageHeader
        module="kas"
        title="Kas"
        subtitle="Semua anggota bisa melihat uang masuk dan keluar."
        actions={
          canWriteKas && (
            <div className="hidden sm:block">
              <ButtonLink href="/kas/baru" variant="padi">
                <IconPlus className="size-5" /> Catat
              </ButtonLink>
            </div>
          )
        }
      />

      <div className="flex flex-col gap-4">
        <SaldoCard
          balance={balance(txs)}
          income={summary.income}
          expense={summary.expense}
          periodLabel={formatBulan(month)}
        />

        <div className="grid grid-cols-2 gap-2">
          <ButtonLink href={`/kas/laporan`} variant="secondary">
            <IconReport className="size-5 text-padi-600" /> Laporan bulanan
          </ButtonLink>
          <ButtonLink href="/kas/iuran" variant="secondary">
            <IconDues className="size-5 text-padi-600" /> Rekap iuran
          </ButtonLink>
        </div>

        <MonthNav value={month} onChange={setMonth} />

        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[1fr_9.5rem]">
          <Segmented<TypeFilter>
            label="Tampilkan"
            value={type}
            onChange={setType}
            options={[
              { value: "semua", label: "Semua" },
              { value: "pemasukan", label: "Masuk" },
              { value: "pengeluaran", label: "Keluar" },
            ]}
          />
          <Field label="Kategori">
            {(p) => (
              <Select {...p} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="semua">Semua</option>
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {loading ? (
          <p className="py-10 text-center text-tinta-lembut">Membuka data…</p>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<IconWallet />}
            title={txs.length === 0 ? "Belum ada catatan kas" : "Tidak ada transaksi di sini"}
            hint={
              txs.length === 0
                ? canWriteKas
                  ? "Catat pemasukan atau pengeluaran pertama. Bisa tanpa internet."
                  : "Catatan kas akan muncul setelah Bendahara mencatatnya."
                : `Tidak ada transaksi yang cocok untuk ${formatBulan(month)}. Ganti bulan atau filter.`
            }
            action={
              canWriteKas && txs.length === 0 ? (
                <ButtonLink href="/kas/baru">Catat transaksi</ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map(([date, rows]) => (
              <section key={date} aria-label={formatTanggalPanjang(date)}>
                <h2 className="mb-1 text-sm font-semibold text-tinta-lembut">
                  {formatTanggalPanjang(date)}
                </h2>
                <ul className="divide-y divide-garis rounded-2xl bg-white px-2 ring-1 ring-garis">
                  {rows.map((t) => (
                    <TransactionRow
                      key={t.id}
                      tx={t}
                      reversed={reversed.has(t.id)}
                      pending={pendingIds.has(t.id)}
                      detail={[
                        t.memberId && memberName.get(t.memberId),
                        t.activityId && activityTitle.get(t.activityId),
                        t.note,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      onOpen={() => setOpen(t)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {canWriteKas && (
        <div className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 sm:hidden">
          <ButtonLink
            href="/kas/baru"
            variant="padi"
            size="lg"
            aria-label="Catat transaksi"
            className="rounded-full px-5 shadow-lg"
          >
            <IconPlus className="size-6" /> Catat
          </ButtonLink>
        </div>
      )}

      <TransactionSheet
        tx={open}
        reversed={reversed}
        pending={!!open && pendingIds.has(open.id)}
        memberName={open?.memberId ? memberName.get(open.memberId) : undefined}
        activityTitle={open?.activityId ? activityTitle.get(open.activityId) : undefined}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
