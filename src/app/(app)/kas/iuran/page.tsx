"use client";

import { useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { MonthNav } from "@/components/ui/month-nav";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { usePerm } from "@/lib/auth/use-perm";
import { formatAngka, formatRupiah, parseRupiah } from "@/lib/format/rupiah";
import { formatBulan, monthKey, todayISO } from "@/lib/format/tanggal";
import { useLookups } from "@/features/use-lookups";
import { iuranPaid } from "@/features/kas/ledger";
import { saveTransaction } from "@/features/kas/repository";
import { CATEGORY_IURAN, MAX_AMOUNT } from "@/features/kas/schema";
import { useLedger } from "@/features/kas/use-ledger";

type Filter = "semua" | "belum";

/**
 * Rekap iuran sekaligus tempat menerima iuran. Di pertemuan rutin Bendahara mencentang nama
 * yang membayar, lalu menyimpan semuanya sekali: satu ketukan per orang, bukan satu formulir per orang.
 */
export default function IuranPage() {
  const { txs } = useLedger();
  const { members, loading } = useLookups();
  const { user, can, seksiKategori } = usePerm();
  const toast = useToast();
  const [month, setMonth] = useState(() => monthKey(todayISO()));
  const [filter, setFilter] = useState<Filter>("semua");
  const [ticks, setTicks] = useState<ReadonlySet<string>>(new Set());
  const [nominalInput, setNominalInput] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justPaid, setJustPaid] = useState<ReadonlySet<string>>(new Set());

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
  // Nominal bawaan = iuran terakhir yang dicatat, jadi ikut tersinkron antar-HP tanpa pengaturan.
  const lastNominal = useMemo(
    () =>
      txs.find(
        (t) => t.category === CATEGORY_IURAN && t.type === "pemasukan" && !t.reversesTransactionId,
      )?.amount ?? 0,
    [txs],
  );
  const nominal = nominalInput ?? lastNominal;

  const isPaid = (id: string) => (paid.get(id) ?? 0) > 0;
  const paidCount = active.filter((m) => isPaid(m.id)).length;
  const total = [...paid.values()].reduce((a, b) => a + b, 0);
  const rows = filter === "belum" ? active.filter((m) => !isPaid(m.id)) : active;
  const selected = active.filter((m) => ticks.has(m.id) && !isPaid(m.id));

  const isThisMonth = month === monthKey(todayISO());
  // Seksi tidak mencatat iuran (kategori lain): alur centang hanya untuk Ketua dan Bendahara.
  const canWrite = can("transaction") && !seksiKategori;
  const canCollect = canWrite && isThisMonth;

  function toggle(id: string) {
    setTicks((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  async function save() {
    if (!user || nominal <= 0) return;
    setSaving(true);
    const changeIds: string[] = [];
    const done = new Set<string>();
    try {
      for (const m of selected) {
        changeIds.push(
          await saveTransaction(
            {
              type: "pemasukan",
              amount: nominal,
              category: CATEGORY_IURAN,
              note: null,
              transactionDate: todayISO(),
              activityId: null,
              memberId: m.id,
            },
            user,
          ),
        );
        done.add(m.id);
      }
      toast.saved(changeIds);
    } catch {
      toast.show(
        `Gagal menyimpan di HP. ${done.size} dari ${selected.length} iuran tercatat. Coba lagi untuk sisanya.`,
        "error",
      );
    } finally {
      setJustPaid(done);
      setTicks(new Set());
      setSaving(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Iuran"
        subtitle={
          canCollect
            ? "Centang nama yang membayar, lalu simpan sekaligus."
            : "Siapa yang sudah dan belum bayar iuran."
        }
        back={{ href: "/kas", label: "Kas" }}
      />
      <div className="flex flex-col gap-4">
        <MonthNav value={month} onChange={setMonth} />

        <section aria-label="Ringkasan iuran">
          <div className="flex items-baseline justify-between gap-3">
            <p>
              <span className="font-display text-2xl font-bold">{paidCount}</span>{" "}
              <span className="text-tinta-pudar">dari {active.length} sudah bayar</span>
            </p>
            <p className="font-bold">{formatRupiah(total)}</p>
          </div>
          <div aria-hidden className="mt-2 h-2 overflow-hidden rounded-sm bg-garis">
            <div
              className="h-full bg-stempel-600 transition-[width] duration-300"
              style={{ width: `${active.length ? (paidCount / active.length) * 100 : 0}%` }}
            />
          </div>
        </section>

        {canCollect && (
          <Field
            label="Iuran per orang (Rp)"
            hint={nominal > 0 ? undefined : "Isi sekali. Bulan berikutnya terisi otomatis."}
          >
            {(p) => (
              <Input
                {...p}
                value={nominal ? formatAngka(nominal) : ""}
                onChange={(e) => setNominalInput(Math.min(parseRupiah(e.target.value), MAX_AMOUNT))}
                inputMode="numeric"
                placeholder="Mis. 10.000"
                className="text-lg! font-bold"
              />
            )}
          </Field>
        )}

        <Segmented<Filter>
          label="Tampilkan"
          hideLabel
          value={filter}
          onChange={setFilter}
          options={[
            { value: "semua", label: `Semua (${active.length})` },
            { value: "belum", label: `Belum bayar (${active.length - paidCount})` },
          ]}
        />

        {loading ? (
          <ListSkeleton rows={6} />
        ) : rows.length === 0 ? (
          active.length === 0 ? (
            <EmptyState
              title="Belum ada anggota aktif"
              hint="Daftar iuran dibuat dari anggota aktif."
              action={
                <ButtonLink href="/anggota" variant="secondary">
                  Buka daftar anggota
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState
              title="Semua sudah lunas"
              hint={`Tidak ada yang belum bayar iuran ${formatBulan(month)}.`}
            />
          )
        ) : (
          <ul className="lembar divide-y divide-garis overflow-hidden">
            {rows.map((m) => {
              const amount = paid.get(m.id) ?? 0;
              const info = (
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{m.fullName}</span>
                  <span className="block truncate text-sm text-tinta-pudar">
                    {m.dusun ?? m.position}
                  </span>
                </span>
              );
              if (amount > 0)
                return (
                  <li key={m.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
                    {info}
                    <span className="shrink-0 text-right">
                      <span className={`cap ${justPaid.has(m.id) ? "animate-cap" : ""}`}>
                        Lunas
                      </span>
                      <span className="mt-1 block text-xs text-tinta-pudar">
                        {formatRupiah(amount)}
                      </span>
                    </span>
                  </li>
                );
              if (canCollect) {
                const on = ticks.has(m.id);
                return (
                  <li key={m.id}>
                    <label
                      className={`flex min-h-16 cursor-pointer items-center gap-3 px-4 py-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-pulpen-600 ${on ? "bg-pulpen-50" : "hover:bg-pulpen-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(m.id)}
                        className="size-6 shrink-0 accent-pulpen-600 outline-none"
                      />
                      {info}
                      <span
                        className={`shrink-0 text-sm ${on ? "font-bold text-pulpen-600" : "text-tinta-pudar"}`}
                      >
                        {on ? (nominal > 0 ? `+ ${formatRupiah(nominal)}` : "Dipilih") : "Belum"}
                      </span>
                    </label>
                  </li>
                );
              }
              return (
                <li key={m.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
                  {info}
                  {canWrite ? (
                    <ButtonLink
                      size="sm"
                      variant="secondary"
                      href={`/kas/baru?tipe=pemasukan&kategori=${CATEGORY_IURAN}&anggota=${m.id}&dari=iuran`}
                    >
                      Catat
                    </ButtonLink>
                  ) : (
                    <span className="stabilo shrink-0 text-sm font-bold">Belum bayar</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {canWrite && !isThisMonth && (
          <p className="text-sm text-tinta-pudar">
            Centang cepat hanya untuk bulan ini. Untuk bulan lain, pakai tombol Catat lalu atur
            tanggalnya.
          </p>
        )}
      </div>

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-garis bg-kertas/95 md:bottom-0 md:left-60">
          <div className="mx-auto max-w-2xl px-4 py-3">
            {nominal > 0 ? (
              <Button block size="lg" onClick={() => setConfirming(true)}>
                Catat {selected.length} iuran, {formatRupiah(selected.length * nominal)}
              </Button>
            ) : (
              <p role="alert" className="py-2 text-center font-bold text-merah-700">
                Isi dulu nominal iuran per orang di atas.
              </p>
            )}
          </div>
        </div>
      )}

      <Sheet
        open={confirming}
        onClose={() => !saving && setConfirming(false)}
        title={`Catat ${selected.length} iuran?`}
      >
        <div className="flex flex-col gap-4">
          <ul className="max-h-44 overflow-y-auto rounded-md border border-garis px-3 py-2 text-sm">
            {selected.map((m) => (
              <li key={m.id} className="py-0.5">
                {m.fullName}
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-[1fr_auto] gap-y-1.5">
            <dt className="text-tinta-pudar">Per orang</dt>
            <dd className="text-right">{formatRupiah(nominal)}</dd>
            <dt className="font-bold">Masuk kas</dt>
            <dd className="text-right text-lg font-bold text-pulpen-600">
              <span className="jumlah">+ {formatRupiah(selected.length * nominal)}</span>
            </dd>
          </dl>
          <p className="text-sm text-tinta-pudar">
            Catatan kas tidak bisa dihapus. Kalau keliru, perbaiki dengan transaksi koreksi.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setConfirming(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button size="lg" className="flex-1" onClick={save} loading={saving}>
              {saving ? "Mencatat…" : "Ya, catat"}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
