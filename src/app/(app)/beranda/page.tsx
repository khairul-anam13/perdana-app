"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useMemo } from "react";
import { InstallHint } from "@/components/app/install-hint";
import { ButtonLink } from "@/components/ui/button";
import {
  IconArrowDown,
  IconArrowUp,
  IconCalendar,
  IconChevronRight,
  IconMapPin,
  IconReport,
  IconUsers,
} from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { ROLE_LABEL } from "@/lib/auth/permissions";
import { usePerm } from "@/lib/auth/use-perm";
import { getMeta } from "@/lib/db/local";
import { formatBulan, formatTanggalPanjang, monthKey, todayISO } from "@/lib/format/tanggal";
import { balance, summarize } from "@/features/kas/ledger";
import { SaldoCard } from "@/features/kas/saldo-card";
import { useLedger } from "@/features/kas/use-ledger";
import { useLookups } from "@/features/use-lookups";

export default function BerandaPage() {
  const { user, can } = usePerm();
  const { txs } = useLedger();
  const { members, activities, loading } = useLookups();
  const lastSyncAt = useLiveQuery(async () => (await getMeta<string>("lastSyncAt")) ?? null, []);

  const month = monthKey(todayISO());
  const summary = useMemo(
    () =>
      summarize(
        txs.filter((t) => monthKey(t.transactionDate) === month),
        txs,
      ),
    [txs, month],
  );
  const today = todayISO();
  const next = useMemo(
    () =>
      activities
        .filter((a) => a.status !== "selesai" && (a.endDate ?? a.startDate) >= today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))[0],
    [activities, today],
  );
  const activeMembers = members.filter((m) => m.status === "aktif").length;
  const empty = !loading && lastSyncAt === null && txs.length === 0 && members.length === 0;

  return (
    <>
      <PageHeader
        module="beranda"
        title={user ? `Halo, ${user.name}` : "Halo"}
        subtitle={user ? ROLE_LABEL[user.role] : undefined}
      />

      <div className="flex flex-col gap-4">
        {empty && (
          <p role="status" className="rounded-2xl bg-padi-100 p-4 text-padi-800">
            Data belum terunduh. Sambungkan HP ke internet sekali, lalu data tersimpan di HP dan
            bisa dibuka tanpa internet.
          </p>
        )}

        <SaldoCard
          balance={balance(txs)}
          income={summary.income}
          expense={summary.expense}
          periodLabel={formatBulan(month)}
        />

        {can("transaction") ? (
          <div className="grid grid-cols-2 gap-2">
            <ButtonLink href="/kas/baru?tipe=pemasukan" size="lg">
              <IconArrowDown className="size-5" /> Catat pemasukan
            </ButtonLink>
            <ButtonLink href="/kas/baru?tipe=pengeluaran" size="lg" variant="secondary">
              <IconArrowUp className="size-5 text-bata-600" /> Catat pengeluaran
            </ButtonLink>
          </div>
        ) : (
          <ButtonLink href="/kas/laporan" variant="secondary" size="lg">
            <IconReport className="size-5" /> Lihat laporan kas bulanan
          </ButtonLink>
        )}

        <section aria-label="Kegiatan terdekat">
          <h2 className="mb-2 text-lg font-bold tracking-tight">Kegiatan terdekat</h2>
          {next ? (
            <Link
              href={`/kegiatan/detail?id=${next.id}`}
              className="flex items-center gap-3.5 rounded-3xl bg-terong-50 p-4 ring-1 ring-terong-100 hover:bg-terong-100/60"
            >
              <span
                aria-hidden
                className="grid size-12 shrink-0 place-items-center rounded-2xl bg-terong-600 text-white"
              >
                <IconCalendar className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{next.title}</span>
                <span className="block text-sm text-terong-700">
                  {formatTanggalPanjang(next.startDate)}
                </span>
                {next.location && (
                  <span className="mt-0.5 flex items-center gap-1 text-sm text-tinta-lembut">
                    <IconMapPin className="size-4 shrink-0" />
                    <span className="truncate">{next.location}</span>
                  </span>
                )}
              </span>
              <IconChevronRight className="size-5 shrink-0 text-terong-700" />
            </Link>
          ) : (
            <p className="rounded-2xl bg-white p-4 text-tinta-lembut ring-1 ring-garis">
              Belum ada kegiatan mendatang.
            </p>
          )}
        </section>

        <Link
          href="/anggota"
          className="flex items-center gap-3.5 rounded-3xl bg-air-50 p-4 ring-1 ring-air-100 hover:bg-air-100/60"
        >
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-air-600 text-white"
          >
            <IconUsers className="size-6" />
          </span>
          <span className="flex-1">
            <span className="block text-2xl leading-tight font-bold tabular-nums">
              {activeMembers}
            </span>
            <span className="text-sm text-air-700">anggota aktif</span>
          </span>
          <IconChevronRight className="size-5 text-air-700" />
        </Link>

        <InstallHint dismissible />
      </div>
    </>
  );
}
