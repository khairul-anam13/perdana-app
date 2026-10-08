"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCheck, IconUsers } from "@/components/ui/icons";
import { MonthNav } from "@/components/ui/month-nav";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { usePerm } from "@/lib/auth/use-perm";
import { formatRupiah } from "@/lib/format/rupiah";
import { monthKey, todayISO } from "@/lib/format/tanggal";
import { useLookups } from "@/features/use-lookups";
import { iuranPaid } from "@/features/kas/ledger";
import { CATEGORY_IURAN } from "@/features/kas/schema";
import { useLedger } from "@/features/kas/use-ledger";

type Filter = "semua" | "belum";

export default function IuranPage() {
  const { txs } = useLedger();
  const { members, loading } = useLookups();
  const { can } = usePerm();
  const [month, setMonth] = useState(() => monthKey(todayISO()));
  const [filter, setFilter] = useState<Filter>("semua");

  const active = useMemo(() => members.filter((m) => m.status === "aktif"), [members]);
  const paid = useMemo(
    () =>
      iuranPaid(
        txs.filter((t) => monthKey(t.transactionDate) === month),
        txs,
        CATEGORY_IURAN,
      ),
    [txs, month],
  );
  const paidCount = active.filter((m) => (paid.get(m.id) ?? 0) > 0).length;
  const total = [...paid.values()].reduce((a, b) => a + b, 0);
  const rows = filter === "belum" ? active.filter((m) => (paid.get(m.id) ?? 0) <= 0) : active;

  return (
    <>
      <PageHeader
        module="kas"
        title="Rekap iuran"
        subtitle="Siapa yang sudah dan belum bayar iuran."
        back={{ href: "/kas", label: "Kas" }}
      />
      <div className="flex flex-col gap-4">
        <MonthNav value={month} onChange={setMonth} />

        <section className="grid grid-cols-2 gap-3" aria-label="Ringkasan iuran">
          <div className="rounded-2xl bg-padi-100 p-4">
            <p className="text-sm text-padi-800">Sudah bayar</p>
            <p className="mt-0.5 text-2xl font-bold text-padi-800 tabular-nums">
              {paidCount}
              <span className="text-base font-medium"> dari {active.length}</span>
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-garis">
            <p className="text-sm text-tinta-lembut">Terkumpul</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums">{formatRupiah(total)}</p>
          </div>
        </section>

        <Segmented<Filter>
          label="Tampilkan"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "semua", label: "Semua anggota" },
            { value: "belum", label: "Belum bayar" },
          ]}
        />

        {loading ? (
          <p className="py-10 text-center text-tinta-lembut">Membuka data…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<IconUsers />}
            title={active.length === 0 ? "Belum ada anggota aktif" : "Semua sudah bayar"}
            hint={
              active.length === 0
                ? "Tambahkan anggota di menu Anggota."
                : "Tidak ada yang belum membayar iuran bulan ini."
            }
          />
        ) : (
          <ul className="divide-y divide-garis rounded-2xl bg-white px-4 ring-1 ring-garis">
            {rows.map((m) => {
              const amount = paid.get(m.id) ?? 0;
              return (
                <li key={m.id} className="flex min-h-16 items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{m.fullName}</p>
                    <p className="truncate text-sm text-tinta-lembut">{m.dusun ?? m.position}</p>
                  </div>
                  {amount > 0 ? (
                    <Badge tone="daun">
                      <IconCheck className="size-3.5" /> Lunas · {formatRupiah(amount)}
                    </Badge>
                  ) : can("transaction") ? (
                    <ButtonLink
                      size="sm"
                      variant="padi"
                      href={`/kas/baru?tipe=pemasukan&kategori=${CATEGORY_IURAN}&anggota=${m.id}`}
                    >
                      Catat iuran
                    </ButtonLink>
                  ) : (
                    <Badge tone="bata">Belum bayar</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
