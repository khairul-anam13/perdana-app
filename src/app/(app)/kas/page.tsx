"use client";

import { useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { IconDues, IconPlus, IconReport, IconWallet } from "@/components/ui/icons";
import { MonthNav } from "@/components/ui/month-nav";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { formatBulan, formatTanggalPanjang, monthKey, todayISO } from "@/lib/format/tanggal";
import { usePerm } from "@/lib/auth/use-perm";
import { useLookups } from "@/features/use-lookups";
import { balance, summarize } from "@/features/kas/ledger";
import { Saldo } from "@/features/kas/saldo-card";
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
  // Kolom saldo buku kas: saldo setelah tiap transaksi. `txs` urut dari yang terbaru.
  const saldoAfter = useMemo(() => {
    const out = new Map<string, number>();
    let sum = 0;
    for (let i = txs.length - 1; i >= 0; i--) {
      sum += txs[i].type === "pemasukan" ? txs[i].amount : -txs[i].amount;
      out.set(txs[i].id, sum);
    }
    return out;
  }, [txs]);

  const canWriteKas = can("transaction");
  const filtered = type !== "semua" || category !== "semua";

  return (
    <>
      <PageHeader
        title="Kas"
        subtitle="Semua anggota bisa melihat uang masuk dan keluar."
        actions={
          canWriteKas && (
            <div className="hidden sm:block">
              <ButtonLink href="/kas/baru">
                <IconPlus className="size-5" /> Catat
              </ButtonLink>
            </div>
          )
        }
      />

      <div className="flex flex-col gap-5">
        <Saldo
          balance={balance(txs)}
          income={summary.income}
          expense={summary.expense}
          periodLabel={formatBulan(month)}
        />

        <div className="grid grid-cols-2 gap-2">
          <ButtonLink href="/kas/iuran" variant="secondary">
            <IconDues className="size-5 text-pulpen-600" /> Iuran
          </ButtonLink>
          <ButtonLink href="/kas/laporan" variant="secondary">
            <IconReport className="size-5 text-pulpen-600" /> Laporan
          </ButtonLink>
        </div>

        <div className="flex flex-col gap-3">
          <MonthNav value={month} onChange={setMonth} />
          <div className="grid grid-cols-[1fr_8.5rem] gap-2">
            <Segmented<TypeFilter>
              label="Jenis transaksi"
              hideLabel
              value={type}
              onChange={setType}
              options={[
                { value: "semua", label: "Semua" },
                { value: "pemasukan", label: "Masuk" },
                { value: "pengeluaran", label: "Keluar" },
              ]}
            />
            <Select
              aria-label="Kategori"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-full min-h-13"
            >
              <option value="semua">Kategori</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <ListSkeleton />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<IconWallet className="size-6" />}
            title={
              txs.length === 0
                ? "Buku kas masih kosong"
                : filtered
                  ? "Tidak ada yang cocok dengan filter"
                  : `Belum ada transaksi di ${formatBulan(month)}`
            }
            hint={
              txs.length === 0
                ? canWriteKas
                  ? "Catat pemasukan atau pengeluaran pertama. Bisa tanpa internet."
                  : "Catatan kas muncul di sini setelah Bendahara mencatatnya."
                : filtered
                  ? "Ubah jenis atau kategori untuk melihat transaksi lain di bulan ini."
                  : "Pilih bulan lain dengan panah di atas."
            }
            action={
              canWriteKas && !filtered ? (
                <ButtonLink href="/kas/baru">Catat transaksi</ButtonLink>
              ) : filtered ? (
                <button
                  type="button"
                  onClick={() => {
                    setType("semua");
                    setCategory("semua");
                  }}
                  className="min-h-11 rounded-md font-bold text-pulpen-600 underline underline-offset-4"
                >
                  Hapus filter
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="lembar divide-y divide-garis overflow-hidden">
            {groups.map(([date, rows]) => {
              const d = Number(date.slice(8));
              const hari = formatTanggalPanjang(date).slice(0, 3);
              return (
                <section key={date} aria-label={formatTanggalPanjang(date)} className="flex">
                  <div aria-hidden className="kolom-tanggal w-12 shrink-0 pt-2.5 text-center">
                    <p className="font-display text-xl leading-none font-bold">{d}</p>
                    <p className="mt-1 text-xs text-tinta-pudar">{hari}</p>
                  </div>
                  <ul className="min-w-0 flex-1 divide-y divide-garis">
                    {rows.map((t) => (
                      <TransactionRow
                        key={t.id}
                        tx={t}
                        reversed={reversed.has(t.id)}
                        pending={pendingIds.has(t.id)}
                        saldo={saldoAfter.get(t.id)}
                        detail={[
                          t.memberId && memberName.get(t.memberId),
                          t.activityId && activityTitle.get(t.activityId),
                          t.note,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                        onOpen={() => setOpen(t)}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {canWriteKas && (
        <div className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 sm:hidden">
          <ButtonLink href="/kas/baru" size="lg" className="shadow-angkat">
            <IconPlus className="size-5" /> Catat
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
