"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { InstallHint } from "@/components/app/install-hint";
import { ButtonLink } from "@/components/ui/button";
import { IconArrowDown, IconArrowUp, IconChevronRight, IconMapPin } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { ROLE_LABEL } from "@/lib/auth/permissions";
import { usePerm } from "@/lib/auth/use-perm";
import { getMeta } from "@/lib/db/local";
import { formatBulan, formatTanggalPanjang, monthKey, todayISO } from "@/lib/format/tanggal";
import { balance, iuranPaid, summarize } from "@/features/kas/ledger";
import { Saldo } from "@/features/kas/saldo-card";
import { CATEGORY_IURAN } from "@/features/kas/schema";
import { useLedger } from "@/features/kas/use-ledger";
import { useLookups } from "@/features/use-lookups";

const BULAN_PENDEK = "Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des".split(" ");

function Baris({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-15 items-center gap-3 px-4 py-2 -outline-offset-2 hover:bg-pulpen-50 active:bg-pulpen-100"
      >
        <span className="min-w-0 flex-1 font-bold">{label}</span>
        <span className="shrink-0 text-right text-sm text-tinta-pudar">{children}</span>
        <IconChevronRight className="size-4 text-tinta-pudar" />
      </Link>
    </li>
  );
}

export default function BerandaPage() {
  const { user, can, seksiKategori } = usePerm();
  const { txs } = useLedger();
  const { members, activities, loading } = useLookups();
  const lastSyncAt = useLiveQuery(async () => (await getMeta<string>("lastSyncAt")) ?? null, []);

  const today = todayISO();
  const month = monthKey(today);
  const inMonth = useMemo(
    () => txs.filter((t) => monthKey(t.transactionDate) === month),
    [txs, month],
  );
  const summary = useMemo(() => summarize(inMonth, txs), [inMonth, txs]);
  const next = useMemo(
    () =>
      activities
        .filter((a) => a.status !== "selesai" && (a.endDate ?? a.startDate) >= today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))[0],
    [activities, today],
  );
  const active = useMemo(() => members.filter((m) => m.status === "aktif"), [members]);
  const paid = useMemo(() => iuranPaid(inMonth, txs, CATEGORY_IURAN), [inMonth, txs]);
  const paidCount = active.filter((m) => (paid.get(m.id) ?? 0) > 0).length;
  const sayaLunas = user?.memberId ? (paid.get(user.memberId) ?? 0) > 0 : null;
  const empty = !loading && lastSyncAt === null && txs.length === 0 && members.length === 0;
  const nextIsToday = !!next && next.startDate <= today;

  return (
    <>
      <PageHeader
        title={user ? `Halo, ${user.name}` : "Halo"}
        subtitle={user ? `${ROLE_LABEL[user.role]}, ${formatTanggalPanjang(today)}` : undefined}
      />

      <div className="flex flex-col gap-6">
        {empty && (
          <p
            role="status"
            className="rounded-md border-l-[6px] border-stabilo-300 bg-stabilo-100 p-4"
          >
            Data belum terunduh. Sambungkan HP ke internet sekali. Setelah itu semua bisa dibuka
            tanpa internet.
          </p>
        )}

        <Saldo
          balance={balance(txs)}
          income={summary.income}
          expense={summary.expense}
          periodLabel={formatBulan(month)}
        />

        {can("transaction") &&
          (seksiKategori ? (
            <ButtonLink href="/kas/baru" size="lg">
              <IconArrowDown className="size-4" /> Catat {seksiKategori.toLowerCase()}
            </ButtonLink>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <ButtonLink href="/kas/baru?tipe=pemasukan">
                <IconArrowDown className="size-4" /> Catat masuk
              </ButtonLink>
              <ButtonLink href="/kas/baru?tipe=pengeluaran" variant="secondary">
                <IconArrowUp className="size-4 text-merah-600" /> Catat keluar
              </ButtonLink>
            </div>
          ))}

        <section aria-labelledby="terdekat">
          <h2 id="terdekat" className="mb-2 font-display text-lg font-bold">
            {nextIsToday ? "Kegiatan hari ini" : "Kegiatan terdekat"}
          </h2>
          {next ? (
            <Link
              href={`/kegiatan/detail?id=${next.id}`}
              className="lembar flex overflow-hidden hover:bg-pulpen-50 active:bg-pulpen-100"
            >
              <span aria-hidden className="kolom-tanggal w-14 shrink-0 py-3 text-center">
                <span className="block font-display text-2xl leading-none font-bold">
                  {Number(next.startDate.slice(8))}
                </span>
                <span className="mt-1 block text-xs text-tinta-pudar">
                  {BULAN_PENDEK[Number(next.startDate.slice(5, 7)) - 1]}
                </span>
              </span>
              <span className="min-w-0 flex-1 px-3 py-3">
                <span className="block font-bold">{next.title}</span>
                <span className="block text-sm text-tinta-pudar">
                  {formatTanggalPanjang(next.startDate)}
                </span>
                {next.location && (
                  <span className="mt-0.5 flex items-center gap-1 text-sm text-tinta-pudar">
                    <IconMapPin className="size-3.5" />
                    <span className="truncate">{next.location}</span>
                  </span>
                )}
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-pulpen-600">
                  {can("activity")
                    ? "Isi absensi"
                    : nextIsToday
                      ? "Absen sekarang"
                      : "Lihat kegiatan"}
                  <IconChevronRight className="size-3.5" />
                </span>
              </span>
            </Link>
          ) : (
            <p className="lembar border-dashed p-4 text-tinta-pudar shadow-none">
              Belum ada kegiatan mendatang.
              {can("activity") && (
                <>
                  {" "}
                  <Link href="/kegiatan" className="font-bold text-pulpen-600 underline">
                    Tambah kegiatan
                  </Link>
                </>
              )}
            </p>
          )}
        </section>

        <section aria-labelledby="ringkas">
          <h2 id="ringkas" className="mb-2 font-display text-lg font-bold">
            Bulan ini
          </h2>
          <ul className="lembar divide-y divide-garis overflow-hidden">
            <Baris href="/kas/iuran" label={`Iuran ${formatBulan(month)}`}>
              {sayaLunas === true && <span className="cap mr-2">Lunas</span>}
              {sayaLunas === false && (
                <span className="stabilo mr-2 font-bold text-tinta">Anda belum bayar</span>
              )}
              {sayaLunas === null && (
                <span>
                  {paidCount} dari {active.length} lunas
                </span>
              )}
            </Baris>
            <Baris href="/kas/laporan" label="Laporan kas">
              {inMonth.length} transaksi
            </Baris>
            <Baris href="/anggota" label="Anggota aktif">
              <span>{active.length} orang</span>
            </Baris>
          </ul>
        </section>

        <InstallHint dismissible />
      </div>
    </>
  );
}
