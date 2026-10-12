"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useMemo, type ComponentType, type ReactNode } from "react";
import { InstallHint } from "@/components/app/install-hint";
import {
  IconArrowDown,
  IconArrowUp,
  IconBook,
  IconCalendar,
  IconChevronRight,
  IconDues,
  IconMapPin,
  IconPlus,
  IconReport,
  IconUsers,
  type IconProps,
} from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { ROLE_LABEL } from "@/lib/auth/permissions";
import { usePerm } from "@/lib/auth/use-perm";
import { getMeta } from "@/lib/db/local";
import { formatBulan, formatTanggalPanjang, monthKey, todayISO } from "@/lib/format/tanggal";
import { balance, iuranPaid, summarize } from "@/features/kas/ledger";
import { SaldoKartu } from "@/features/kas/saldo-kartu";
import { CATEGORY_IURAN } from "@/features/kas/schema";
import { useLedger } from "@/features/kas/use-ledger";
import { BAB } from "@/features/adart/data";
import { useLookups } from "@/features/use-lookups";

const BULAN_PENDEK = "Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des".split(" ");

const JUMLAH_PASAL = BAB.reduce((n, x) => n + x.pasal.length, 0);

/** Ikon di ubin kecil sebelum label baris: membantu menemukan baris yang dicari tanpa membaca semuanya. */
function Ubin({ icon: Icon }: { icon: ComponentType<IconProps> }) {
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-[22%] bg-pulpen-100 text-pulpen-700"
    >
      <Icon className="size-4" />
    </span>
  );
}

function Baris({
  href,
  label,
  icon,
  children,
}: {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-15 items-center gap-3 px-4 py-2 -outline-offset-2 hover:bg-pulpen-50 active:bg-pulpen-100"
      >
        <Ubin icon={icon} />
        <span className="min-w-0 flex-1 font-bold">{label}</span>
        <span className="shrink-0 text-right text-sm text-tinta-pudar">{children}</span>
        <IconChevronRight className="size-4 text-tinta-pudar" />
      </Link>
    </li>
  );
}

/** Pintasan ala dompet digital: satu ketukan ke pekerjaan yang paling sering. */
function Aksi({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex flex-col items-center gap-1.5 rounded-xl py-1 text-center -outline-offset-2 active:opacity-60"
      >
        <span
          aria-hidden
          className="lembar grid size-14 place-items-center rounded-2xl text-pulpen-600"
        >
          <Icon className="size-6" />
        </span>
        <span className="text-xs leading-tight font-semibold text-tinta">{label}</span>
      </Link>
    </li>
  );
}

export default function BerandaPage() {
  const { user, can, seksiKategori } = usePerm();
  const { txs } = useLedger();
  const { members, activities, loading } = useLookups();
  const lastSyncAt = useLiveQuery(async () => (await getMeta<string>("lastSyncAt")) ?? null, []);
  const org = useLiveQuery(() => getMeta<{ name: string }>("organization"), []);

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

        <SaldoKartu
          balance={balance(txs)}
          income={summary.income}
          expense={summary.expense}
          orgName={org?.name}
        />

        <nav aria-label="Pintasan">
          <ul className="grid grid-cols-4 gap-2">
            {can("transaction") && seksiKategori ? (
              <Aksi
                href="/kas/baru"
                label={`Catat ${seksiKategori.toLowerCase()}`}
                icon={IconPlus}
              />
            ) : can("transaction") ? (
              <>
                <Aksi href="/kas/baru?tipe=pemasukan" label="Catat masuk" icon={IconArrowDown} />
                <Aksi href="/kas/baru?tipe=pengeluaran" label="Catat keluar" icon={IconArrowUp} />
              </>
            ) : (
              <>
                <Aksi href="/kegiatan" label="Kegiatan" icon={IconCalendar} />
                <Aksi href="/anggota" label="Anggota" icon={IconUsers} />
              </>
            )}
            <Aksi href="/kas/iuran" label="Iuran" icon={IconDues} />
            <Aksi href="/kas/laporan" label="Laporan" icon={IconReport} />
          </ul>
        </nav>

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
            <Baris href="/kas/iuran" label={`Iuran ${formatBulan(month)}`} icon={IconDues}>
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
            <Baris href="/kas/laporan" label="Laporan kas" icon={IconReport}>
              {inMonth.length} transaksi
            </Baris>
            <Baris href="/anggota" label="Anggota aktif" icon={IconUsers}>
              <span>{active.length} orang</span>
            </Baris>
          </ul>
        </section>

        <section aria-labelledby="aturan">
          <h2 id="aturan" className="mb-2 font-display text-lg font-bold">
            Aturan organisasi
          </h2>
          <ul className="lembar divide-y divide-garis overflow-hidden">
            <Baris href="/adart" label="AD/ART Karang Taruna" icon={IconBook}>
              <span>{JUMLAH_PASAL} pasal, bisa dicari</span>
            </Baris>
          </ul>
        </section>

        <InstallHint dismissible />
      </div>
    </>
  );
}
