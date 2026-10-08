"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  IconCalendar,
  IconCheck,
  IconEnvelope,
  IconMapPin,
  IconSync,
  IconX,
} from "@/components/ui/icons";
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

const STATUS_ICON = { hadir: IconCheck, izin: IconEnvelope, alpa: IconX } as const;

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  hadir: "bg-daun-700 text-white ring-daun-700",
  izin: "bg-padi-300 text-tinta ring-padi-300",
  alpa: "bg-bata-600 text-white ring-bata-600",
};

function AttendanceControl({
  name,
  value,
  options = ATTENDANCE_STATUSES,
  disabled,
  onSet,
}: {
  name: string;
  value?: AttendanceStatus;
  options?: readonly AttendanceStatus[];
  disabled?: boolean;
  onSet: (s: AttendanceStatus) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={`Absensi ${name}`}
      className="grid auto-cols-fr grid-flow-col gap-1.5"
    >
      {options.map((s) => {
        const active = value === s;
        const Icon = STATUS_ICON[s];
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onSet(s)}
            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold ring-1 transition-colors disabled:opacity-50 ${
              active ? STATUS_STYLE[s] : "bg-white ring-garis-kuat hover:bg-terong-50"
            }`}
          >
            <Icon className="size-4" />
            {ATTENDANCE_LABEL[s]}
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
  const roster = useMemo(() => {
    const active = members.filter((m) => m.status === "aktif" || byMember.has(m.id));
    return active;
  }, [members, byMember]);
  const counts = useMemo(() => {
    const c = { hadir: 0, izin: 0, alpa: 0 };
    for (const a of attendances ?? []) c[a.status]++;
    return c;
  }, [attendances]);
  const related = useMemo(() => txs.filter((t) => t.activityId === id), [txs, id]);
  const money = useMemo(() => summarize(related, txs), [related, txs]);

  if (!id || activity === null)
    return (
      <EmptyState
        icon={<IconCalendar />}
        title="Kegiatan tidak ditemukan"
        hint="Mungkin sudah dihapus atau datanya belum terunduh."
        action={<ButtonLink href="/kegiatan">Ke daftar kegiatan</ButtonLink>}
      />
    );
  if (activity === undefined || lookupsLoading)
    return <p className="py-10 text-center text-tinta-lembut">Membuka data…</p>;

  const pengurus = can("activity");
  const myMemberId = user?.memberId ?? null;
  const leader = activity.leaderId ? memberName.get(activity.leaderId) : null;
  const unrecorded = roster.filter((m) => !byMember.has(m.id)).length;

  async function mark(memberId: string, status: AttendanceStatus) {
    if (!user || !activity) return;
    const changeId = await setAttendance(activity.id, memberId, status, user);
    toast.saved([changeId]);
  }

  return (
    <>
      <PageHeader
        module="kegiatan"
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

      <div className="flex flex-col gap-5">
        <section
          className="rounded-3xl bg-terong-50 p-5 ring-1 ring-terong-100"
          aria-label="Info kegiatan"
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Badge
              tone={
                activity.status === "berjalan"
                  ? "daun"
                  : activity.status === "selesai"
                    ? "netral"
                    : "terong"
              }
            >
              {ACTIVITY_STATUS_LABEL[activity.status]}
            </Badge>
          </div>
          <p className="font-semibold">
            {formatTanggalPanjang(activity.startDate)}
            {activity.endDate && activity.endDate !== activity.startDate
              ? ` – ${formatTanggalPanjang(activity.endDate)}`
              : ""}
          </p>
          {activity.location && (
            <p className="mt-1 flex items-center gap-1.5 text-tinta-lembut">
              <IconMapPin className="size-4 shrink-0" /> {activity.location}
            </p>
          )}
          {leader && <p className="mt-1 text-tinta-lembut">Penanggung jawab: {leader}</p>}
          {activity.description && (
            <p className="mt-3 whitespace-pre-line">{activity.description}</p>
          )}
        </section>

        <section aria-label="Ringkasan absensi" className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Hadir", n: counts.hadir, cls: "bg-daun-100 text-daun-800" },
            { label: "Izin", n: counts.izin, cls: "bg-padi-100 text-padi-800" },
            { label: "Alpa", n: counts.alpa, cls: "bg-bata-100 text-bata-700" },
            { label: "Belum", n: unrecorded, cls: "bg-garis text-tinta-lembut" },
          ].map((c) => (
            <div key={c.label} className={`rounded-2xl px-1 py-3 ${c.cls}`}>
              <p className="text-2xl font-bold tabular-nums">{c.n}</p>
              <p className="text-xs font-semibold">{c.label}</p>
            </div>
          ))}
        </section>

        {!pengurus && (
          <section className="rounded-3xl bg-white p-4 ring-1 ring-garis" aria-label="Absen saya">
            <h2 className="mb-1 font-semibold">Absen saya</h2>
            {myMemberId ? (
              <>
                <p className="mb-3 text-sm text-tinta-lembut">
                  {byMember.get(myMemberId)
                    ? `Tercatat: ${ATTENDANCE_LABEL[byMember.get(myMemberId)!.status]}`
                    : "Belum absen. Bisa dilakukan tanpa internet."}
                </p>
                <AttendanceControl
                  name="saya"
                  value={byMember.get(myMemberId)?.status}
                  options={["hadir", "izin"]}
                  disabled={readOnly}
                  onSet={(s) => mark(myMemberId, s)}
                />
              </>
            ) : (
              <p className="text-sm text-tinta-lembut">
                Akun Anda belum terhubung ke data anggota. Minta Sekretaris atau Ketua
                menghubungkannya.
              </p>
            )}
          </section>
        )}

        <section aria-label="Daftar absensi">
          <h2 className="mb-2 text-lg font-bold tracking-tight">
            {pengurus ? "Absensi" : "Yang hadir"}
          </h2>
          {roster.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-tinta-lembut ring-1 ring-garis">
              Belum ada anggota aktif.
            </p>
          ) : (
            <ul className="divide-y divide-garis rounded-2xl bg-white px-4 ring-1 ring-garis">
              {roster.map((m) => {
                const a = byMember.get(m.id);
                return (
                  <li key={m.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate font-medium">{m.fullName}</p>
                      {a && pending.has(a.id) && (
                        <Badge tone="padi">
                          <IconSync className="size-3" /> Menunggu kirim
                        </Badge>
                      )}
                      {!pengurus && a && (
                        <Badge
                          tone={
                            a.status === "hadir" ? "daun" : a.status === "izin" ? "padi" : "bata"
                          }
                        >
                          {ATTENDANCE_LABEL[a.status]}
                        </Badge>
                      )}
                    </div>
                    {pengurus && (
                      <div className="mt-2">
                        <AttendanceControl
                          name={m.fullName}
                          value={a?.status}
                          disabled={readOnly}
                          onSet={(s) => mark(m.id, s)}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          aria-label="Keuangan kegiatan"
          className="rounded-3xl bg-white p-4 ring-1 ring-garis"
        >
          <h2 className="mb-3 font-semibold">Keuangan kegiatan</h2>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-daun-50 p-3">
              <dt className="text-sm text-tinta-lembut">Pemasukan</dt>
              <dd className="font-bold text-daun-700 tabular-nums">{formatRupiah(money.income)}</dd>
            </div>
            <div className="rounded-2xl bg-bata-50 p-3">
              <dt className="text-sm text-tinta-lembut">Pengeluaran</dt>
              <dd className="font-bold text-bata-700 tabular-nums">
                {formatRupiah(money.expense)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-tinta-lembut">
            Selisih:{" "}
            <span className="font-semibold text-tinta tabular-nums">{formatRupiah(money.net)}</span>{" "}
            dari {related.length} transaksi.
          </p>
          {can("transaction") && (
            <ButtonLink
              href={`/kas/baru?kegiatan=${activity.id}&tipe=pengeluaran`}
              variant="secondary"
              block
              className="mt-3"
            >
              Catat transaksi kegiatan ini
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
    <Suspense fallback={<p className="py-10 text-center text-tinta-lembut">Membuka kegiatan…</p>}>
      <Detail />
    </Suspense>
  );
}
