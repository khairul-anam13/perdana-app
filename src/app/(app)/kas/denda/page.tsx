"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { IconChevronRight, IconGavel } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { canEditOrgSetting, CATEGORY_DENDA } from "@/lib/auth/permissions";
import { usePerm } from "@/lib/auth/use-perm";
import { formatRupiah } from "@/lib/format/rupiah";
import { formatTanggal } from "@/lib/format/tanggal";
import { useOrg } from "@/lib/use-org";
import type { BarisDenda } from "@/features/denda/hitung";
import { useDenda } from "@/features/denda/use-denda";
import { AngkaSheet } from "@/features/organisasi/angka-sheet";

type Filter = "belum" | "semua";

function Rincian({ baris, bisaCatat }: { baris: BarisDenda; bisaCatat: boolean }) {
  const { member, alpa, terutang, dibayar, sisa } = baris;
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[1fr_auto] gap-y-1.5">
        <dt className="text-tinta-pudar">Alpa</dt>
        <dd className="text-right font-bold">{alpa.length} kali</dd>
        <dt className="text-tinta-pudar">Denda</dt>
        <dd className="text-right font-bold">{formatRupiah(terutang)}</dd>
        <dt className="text-tinta-pudar">Sudah dibayar</dt>
        <dd className="text-right font-bold text-stempel-700">{formatRupiah(dibayar)}</dd>
        <dt className="font-bold">Belum dibayar</dt>
        <dd className={`text-right text-lg font-bold ${sisa > 0 ? "text-merah-600" : ""}`}>
          <span className="jumlah">{formatRupiah(sisa)}</span>
        </dd>
      </dl>
      {alpa.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-sm font-bold">Tidak hadir tanpa keterangan</h3>
          <ul className="lembar divide-y divide-garis overflow-hidden">
            {alpa.map((a, i) => (
              <li key={i} className="flex justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0">{a.title}</span>
                <span className="shrink-0 text-tinta-pudar">{formatTanggal(a.date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {bisaCatat && sisa > 0 && (
        <ButtonLink
          size="lg"
          href={`/kas/baru?tipe=pemasukan&kategori=${CATEGORY_DENDA}&anggota=${member.id}&nominal=${sisa}&dari=denda`}
        >
          Catat pembayaran {formatRupiah(sisa)}
        </ButtonLink>
      )}
    </div>
  );
}

export default function DendaPage() {
  const { rows, tarif, sisa, loading } = useDenda();
  const { user, can, seksiKategori } = usePerm();
  const org = useOrg();
  const [filter, setFilter] = useState<Filter>("belum");
  const [detail, setDetail] = useState<BarisDenda | null>(null);
  const [aturTarif, setAturTarif] = useState(false);

  const pengurus = user?.role !== "anggota";
  const bisaAtur = !!user && canEditOrgSetting(user.role, "fineAbsent");
  const bisaCatat = can("transaction") && (!seksiKategori || seksiKategori === CATEGORY_DENDA);
  const belum = rows.filter((r) => r.sisa > 0);
  const shown = filter === "belum" ? belum : rows;
  const dibayar = rows.reduce((n, r) => n + r.dibayar, 0);

  return (
    <>
      <PageHeader
        title="Denda ketertiban"
        subtitle={
          pengurus
            ? "Denda anggota yang tidak hadir tanpa keterangan."
            : "Denda Anda karena tidak hadir tanpa keterangan."
        }
        back={{ href: "/kas", label: "Kas" }}
      />

      <div className="flex flex-col gap-4">
        {!loading && tarif === null && (
          <div
            role="status"
            className="rounded-md border-l-[6px] border-stabilo-300 bg-stabilo-100 p-4 text-sm"
          >
            <p className="font-bold">Tarif denda belum ditetapkan</p>
            <p className="mt-1">
              AD/ART Pasal 9 menyebut denda &quot;sudah ditetapkan&quot; tetapi nominalnya tidak
              tertulis, jadi jumlah denda belum bisa dihitung.{" "}
              {bisaAtur ? "Isi tarif per alpa." : "Minta Ketua atau S. Denda mengisinya."}
            </p>
            {bisaAtur && (
              <Button className="mt-3" onClick={() => setAturTarif(true)}>
                Isi tarif denda
              </Button>
            )}
          </div>
        )}

        <section aria-label="Ringkasan denda">
          <p className="text-tinta-pudar">
            {pengurus ? "Belum dibayar semua anggota" : "Belum Anda bayar"}
          </p>
          <p className="mt-1 mb-3 font-display text-[2rem] leading-tight font-bold">
            <span className={`jumlah ${sisa > 0 ? "text-merah-600" : ""}`}>
              {formatRupiah(sisa)}
            </span>
          </p>
          <p className="mt-2 text-sm text-tinta-pudar">
            Sudah dibayar {formatRupiah(dibayar)}
            {tarif !== null && (
              <>
                , tarif {formatRupiah(tarif)} per alpa
                {bisaAtur && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => setAturTarif(true)}
                      className="min-h-11 font-bold text-pulpen-600 underline underline-offset-4"
                    >
                      Ubah tarif
                    </button>
                  </>
                )}
              </>
            )}
          </p>
        </section>

        {pengurus && (
          <Segmented<Filter>
            label="Tampilkan"
            hideLabel
            value={filter}
            onChange={setFilter}
            options={[
              { value: "belum", label: `Belum bayar (${belum.length})` },
              { value: "semua", label: `Pernah alpa (${rows.length})` },
            ]}
          />
        )}

        {loading ? (
          <ListSkeleton />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<IconGavel className="size-6" />}
            title={
              !pengurus
                ? "Anda tidak punya denda"
                : rows.length === 0
                  ? "Belum ada denda"
                  : "Semua denda sudah dibayar"
            }
            hint={
              !pengurus
                ? "Terima kasih sudah tertib hadir."
                : rows.length === 0
                  ? "Denda muncul saat anggota ditandai Alpa di absensi kegiatan."
                  : "Tidak ada anggota yang punya tunggakan denda."
            }
          />
        ) : (
          <ul className="lembar divide-y divide-garis overflow-hidden">
            {shown.map((r) => (
              <li key={r.member.id}>
                <button
                  type="button"
                  onClick={() => setDetail(r)}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left -outline-offset-2 hover:bg-pulpen-50 active:bg-pulpen-100"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{r.member.fullName}</span>
                    <span className="block text-sm text-tinta-pudar">
                      {r.alpa.length}× alpa
                      {r.alpa[0] && `, terakhir ${formatTanggal(r.alpa[0].date)}`}
                    </span>
                  </span>
                  {tarif !== null && r.terutang > 0 && (
                    <span className="shrink-0 text-right">
                      {r.sisa > 0 ? (
                        <span className="font-bold text-merah-600">{formatRupiah(r.sisa)}</span>
                      ) : (
                        <span className="cap">Lunas</span>
                      )}
                    </span>
                  )}
                  <IconChevronRight className="size-4 shrink-0 text-tinta-pudar" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="max-w-prose text-sm text-tinta-pudar">
          Denda dihitung dari absensi berstatus Alpa. Pembayaran diambil dari Kas kategori Denda
          atas nama anggota, termasuk denda pelanggaran di{" "}
          <Link href="/adart#pasal-9" className="font-bold text-pulpen-600 underline">
            AD/ART Pasal 9
          </Link>
          .
        </p>
      </div>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail?.member.fullName ?? ""}>
        {detail && <Rincian baris={detail} bisaCatat={bisaCatat} />}
      </Sheet>
      <AngkaSheet
        open={aturTarif}
        onClose={() => setAturTarif(false)}
        setting="fineAbsent"
        title="Tarif denda"
        label="Denda per alpa (Rp)"
        hint="Berlaku untuk semua alpa, termasuk yang sudah tercatat. Kosongkan untuk menghapus tarif."
        initial={org?.fineAbsent}
        rupiah
      />
    </>
  );
}
