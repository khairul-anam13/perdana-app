"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { IconCheck, IconEnvelope, IconMapPin, IconUser } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { usePerm } from "@/lib/auth/use-perm";
import { db } from "@/lib/db/local";
import { formatRupiah } from "@/lib/format/rupiah";
import { formatTanggalPanjang } from "@/lib/format/tanggal";
import { usePendingIds } from "@/lib/sync/use-pending";
import { ActivitySheet, type ActivitySheetState } from "@/features/kegiatan/activity-sheet";
import { listAttendances, setAttendance } from "@/features/kegiatan/repository";
import {
  ACTIVITY_STATUS_LABEL,
  ATTENDANCE_LABEL,
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from "@/features/kegiatan/schema";
import { summarize } from "@/features/kas/ledger";
import { useLedger } from "@/features/kas/use-ledger";
import { useLookups } from "@/features/use-lookups";

/** Huruf H / I / A seperti di daftar hadir kertas. Warna mengikuti arti di seluruh aplikasi. */
const STATUS_STYLE: Record<AttendanceStatus, string> = {
  hadir: "border-stempel-700 bg-stempel-600 text-white",
  izin: "border-stabilo-800 bg-stabilo-300 text-tinta",
  alpa: "border-merah-700 bg-merah-600 text-white",
};
const STATUS_TEXT: Record<AttendanceStatus, string> = {
  hadir: "text-stempel-700",
  izin: "text-stabilo-800",
  alpa: "text-merah-700",
};

function AttendanceControl({
  name,
  value,
  disabled,
  onSet,
}: {
  name: string;
  value?: AttendanceStatus;
  disabled?: boolean;
  onSet: (s: AttendanceStatus) => void;
}) {
  return (
    <div role="radiogroup" aria-label={`Absensi ${name}`} className="flex shrink-0 gap-1.5">
      {ATTENDANCE_STATUSES.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={ATTENDANCE_LABEL[s]}
            disabled={disabled}
            onClick={() => onSet(s)}
            className={`grid size-11 place-items-center rounded-md border font-display text-lg font-bold transition-colors disabled:opacity-50 ${
              active
                ? STATUS_STYLE[s]
                : "border-garis-kuat bg-lembar text-tinta-pudar hover:bg-pulpen-50 active:bg-pulpen-100"
            }`}
          >
            {ATTENDANCE_LABEL[s][0]}
          </button>
        );
      })}
    </div>
  );
}

function Detail() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const toast = useToast();
  const { user, can, readOnly } = usePerm();
  const [sheet, setSheet] = useState<ActivitySheetState>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const activity = useLiveQuery(
    async () => (id ? ((await db.activities.get(id)) ?? null) : null),
    [id],
  );
  const attendances = useLiveQuery(() => (id ? listAttendances(id) : []), [id]);
  const { members, memberName, loading: lookupsLoading } = useLookups();
  const { txs } = useLedger();
  const pending = usePendingIds();

  const byMember = useMemo(
    () => new Map((attendances ?? []).map((a) => [a.memberId, a])),
    [attendances],
  );
  const roster = useMemo(
    () => members.filter((m) => m.status === "aktif" || byMember.has(m.id)),
    [members, byMember],
  );
  const counts = useMemo(() => {
    const c = { hadir: 0, izin: 0, alpa: 0 };
    for (const a of attendances ?? []) c[a.status]++;
    return c;
  }, [attendances]);
  const related = useMemo(() => txs.filter((t) => t.activityId === id), [txs, id]);
  const money = useMemo(() => summarize(related, txs), [related, txs]);

  if (!id || activity === null)
    return (
      <div className="pt-6">
        <EmptyState
          title="Kegiatan tidak ditemukan"
          hint="Mungkin sudah dihapus, atau datanya belum terunduh ke HP ini."
          action={<ButtonLink href="/kegiatan">Ke daftar kegiatan</ButtonLink>}
        />
      </div>
    );
  if (activity === undefined || lookupsLoading)
    return (
      <div className="pt-6">
        <ListSkeleton rows={6} />
      </div>
    );

  const pengurus = can("activity");
  const myMemberId = user?.memberId ?? null;
  const mine = myMemberId ? byMember.get(myMemberId) : undefined;
  const leader = activity.leaderId ? memberName.get(activity.leaderId) : null;
  const unrecorded = roster.filter((m) => !byMember.has(m.id));

  // Tanpa toast per ketukan: tombol yang menyala dan tanda "Menunggu kirim" sudah jadi jawabannya.
  async function mark(memberId: string, status: AttendanceStatus) {
    if (!user || !activity) return;
    try {
      await setAttendance(activity.id, memberId, status, user);
    } catch {
      toast.show("Absensi gagal tersimpan di HP. Coba lagi.", "error");
    }
  }

  async function markRestPresent() {
    if (!user || !activity) return;
    setBulkBusy(true);
    try {
      const ids: string[] = [];
      for (const m of unrecorded) ids.push(await setAttendance(activity.id, m.id, "hadir", user));
      toast.saved(ids);
    } catch {
      toast.show("Sebagian absensi gagal tersimpan. Coba lagi.", "error");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={activity.title}
        back={{ href: "/kegiatan", label: "Kegiatan" }}
        actions={
          pengurus && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSheet({ mode: "edit", activity })}
            >
              Ubah
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-6">
        <section aria-label="Info kegiatan" className="-mt-2 flex flex-col gap-1">
          <p className="flex flex-wrap items-center gap-2 font-bold">
            {formatTanggalPanjang(activity.startDate)}
            {activity.endDate && activity.endDate !== activity.startDate
              ? ` sampai ${formatTanggalPanjang(activity.endDate)}`
              : ""}
            <Badge
              tone={
                activity.status === "berjalan"
                  ? "stempel"
                  : activity.status === "selesai"
                    ? "netral"
                    : "pulpen"
              }
            >
              {ACTIVITY_STATUS_LABEL[activity.status]}
            </Badge>
          </p>
          {activity.location && (
            <p className="flex items-center gap-1.5 text-tinta-pudar">
              <IconMapPin className="size-4" /> {activity.location}
            </p>
          )}
          {leader && (
            <p className="flex items-center gap-1.5 text-tinta-pudar">
              <IconUser className="size-4" /> Penanggung jawab: {leader}
            </p>
          )}
          {activity.description && (
            <p className="mt-2 max-w-prose whitespace-pre-line">{activity.description}</p>
          )}
        </section>

        {!pengurus && (
          <section
            aria-labelledby="absen-saya"
            className="lembar border-l-[6px] border-l-pulpen-600 p-4"
          >
            <h2 id="absen-saya" className="font-display text-lg font-bold">
              Absen saya
            </h2>
            {myMemberId ? (
              <>
                <p className="mt-0.5 mb-3 text-sm text-tinta-pudar">
                  {mine ? (
                    <>
                      Tercatat:{" "}
                      <b className={STATUS_TEXT[mine.status]}>{ATTENDANCE_LABEL[mine.status]}</b>
                      {pending.has(mine.id) && (
                        <span className="stabilo ml-2 font-bold text-tinta">Menunggu kirim</span>
                      )}
                    </>
                  ) : (
                    "Anda belum absen. Bisa diisi tanpa internet."
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["hadir", "izin"] as const).map((s) => (
                    <Button
                      key={s}
                      size="lg"
                      variant={mine?.status === s ? "primary" : "secondary"}
                      aria-pressed={mine?.status === s}
                      disabled={readOnly}
                      onClick={() => mark(myMemberId, s)}
                    >
                      {s === "hadir" ? (
                        <IconCheck className="size-5" />
                      ) : (
                        <IconEnvelope className="size-5" />
                      )}
                      Saya {s}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-tinta-pudar">
                Akun Anda belum terhubung ke data anggota. Minta Sekretaris atau Ketua
                menghubungkannya.
              </p>
            )}
          </section>
        )}

        <section aria-labelledby="absensi">
          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 id="absensi" className="font-display text-lg font-bold">
              {pengurus ? "Daftar hadir" : "Kehadiran"}
            </h2>
          </div>

          <dl className="mb-3 grid grid-cols-4 divide-x divide-garis border-y border-garis py-2 text-center">
            {(
              [
                ["Hadir", counts.hadir, STATUS_TEXT.hadir],
                ["Izin", counts.izin, STATUS_TEXT.izin],
                ["Alpa", counts.alpa, STATUS_TEXT.alpa],
                ["Belum", unrecorded.length, "text-tinta-pudar"],
              ] as const
            ).map(([label, n, cls]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-xs text-tinta-pudar">{label}</dt>
                <dd className={`font-display text-2xl leading-tight font-bold ${cls}`}>{n}</dd>
              </div>
            ))}
          </dl>

          {pengurus && unrecorded.length > 0 && roster.length > 0 && (
            <Button
              variant="secondary"
              block
              className="mb-3"
              onClick={markRestPresent}
              loading={bulkBusy}
              disabled={readOnly}
            >
              {unrecorded.length === roster.length
                ? `Tandai semua ${roster.length} orang hadir`
                : `Tandai ${unrecorded.length} sisanya hadir`}
            </Button>
          )}

          {roster.length === 0 ? (
            <EmptyState
              title="Belum ada anggota aktif"
              hint="Daftar hadir dibuat dari anggota aktif."
              action={
                <ButtonLink href="/anggota" variant="secondary">
                  Buka daftar anggota
                </ButtonLink>
              }
            />
          ) : (
            <ul className="lembar divide-y divide-garis overflow-hidden">
              {pengurus && (
                <li aria-hidden className="flex justify-end gap-1.5 bg-kertas px-3 py-1">
                  {ATTENDANCE_STATUSES.map((s) => (
                    <span key={s} className="w-11 text-center text-xs font-bold text-tinta-pudar">
                      {ATTENDANCE_LABEL[s]}
                    </span>
                  ))}
                </li>
              )}
              {roster.map((m) => {
                const a = byMember.get(m.id);
                return (
                  <li key={m.id} className="flex min-h-14 items-center gap-3 px-3 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{m.fullName}</p>
                      {a && pending.has(a.id) && (
                        <span className="stabilo text-xs font-bold">Menunggu kirim</span>
                      )}
                    </div>
                    {pengurus ? (
                      <AttendanceControl
                        name={m.fullName}
                        value={a?.status}
                        disabled={readOnly || bulkBusy}
                        onSet={(s) => mark(m.id, s)}
                      />
                    ) : (
                      <span
                        className={`shrink-0 text-sm font-bold ${a ? STATUS_TEXT[a.status] : "text-tinta-pudar"}`}
                      >
                        {a ? ATTENDANCE_LABEL[a.status] : "Belum"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="uang-kegiatan">
          <h2 id="uang-kegiatan" className="mb-2 font-display text-lg font-bold">
            Uang kegiatan
          </h2>
          <dl className="lembar grid grid-cols-[1fr_auto] gap-y-2 p-4">
            <dt className="text-tinta-pudar">Masuk</dt>
            <dd className="text-right font-bold text-pulpen-600">+ {formatRupiah(money.income)}</dd>
            <dt className="text-tinta-pudar">Keluar</dt>
            <dd className="text-right font-bold text-merah-600">− {formatRupiah(money.expense)}</dd>
            <dt className="font-bold">Selisih ({related.length} transaksi)</dt>
            <dd className="text-right font-bold">
              <span className="jumlah">{formatRupiah(money.net)}</span>
            </dd>
          </dl>
          {can("transaction") && (
            <ButtonLink
              href={`/kas/baru?kegiatan=${activity.id}&tipe=pengeluaran`}
              variant="secondary"
              block
              className="mt-3"
            >
              Catat uang kegiatan ini
            </ButtonLink>
          )}
        </section>
      </div>

      <ActivitySheet
        state={sheet}
        user={user}
        onClose={(deleted) => {
          setSheet(null);
          if (deleted) router.replace("/kegiatan");
        }}
      />
    </>
  );
}

export default function DetailKegiatanPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-6">
          <ListSkeleton rows={6} />
        </div>
      }
    >
      <Detail />
    </Suspense>
  );
}
