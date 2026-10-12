"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { IconCalendar, IconChevronRight, IconMapPin, IconPlus } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { usePerm } from "@/lib/auth/use-perm";
import { db } from "@/lib/db/local";
import { formatTanggalPanjang, todayISO } from "@/lib/format/tanggal";
import { ActivitySheet, type ActivitySheetState } from "@/features/kegiatan/activity-sheet";
import { listActivities } from "@/features/kegiatan/repository";
import { ACTIVITY_STATUS_LABEL, type Activity } from "@/features/kegiatan/schema";

type Tab = "mendatang" | "lewat";

const isUpcoming = (a: Activity, today: string) =>
  a.status !== "selesai" && (a.endDate ?? a.startDate) >= today;

const BULAN_PENDEK = "Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des".split(" ");

export default function KegiatanPage() {
  const activities = useLiveQuery(listActivities, []);
  const hadirCounts = useLiveQuery(async () => {
    const counts = new Map<string, number>();
    await db.attendances
      .filter((a) => !a.deletedAt && a.status === "hadir")
      .each((a) => counts.set(a.activityId, (counts.get(a.activityId) ?? 0) + 1));
    return counts;
  }, []);
  const { user, can } = usePerm();
  const [tab, setTab] = useState<Tab>("mendatang");
  const [sheet, setSheet] = useState<ActivitySheetState>(null);

  const today = todayISO();
  const { upcoming, past } = useMemo(() => {
    const all = activities ?? [];
    return {
      upcoming: all
        .filter((a) => isUpcoming(a, today))
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
      past: all
        .filter((a) => !isUpcoming(a, today))
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    };
  }, [activities, today]);

  const shown = tab === "mendatang" ? upcoming : past;
  const canEdit = can("activity");

  return (
    <>
      <PageHeader
        title="Kegiatan"
        subtitle="Buka kegiatan untuk mengisi atau melihat absensi."
        actions={
          canEdit && (
            <Button onClick={() => setSheet({ mode: "add" })}>
              <IconPlus className="size-5" /> Tambah
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-4">
        <Segmented<Tab>
          label="Tampilkan"
          hideLabel
          value={tab}
          onChange={setTab}
          options={[
            { value: "mendatang", label: `Mendatang (${upcoming.length})` },
            { value: "lewat", label: `Sudah lewat (${past.length})` },
          ]}
        />

        {activities === undefined ? (
          <ListSkeleton />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<IconCalendar className="size-6" />}
            title={
              tab === "mendatang" ? "Belum ada kegiatan mendatang" : "Belum ada kegiatan yang lewat"
            }
            hint={
              tab === "lewat"
                ? "Kegiatan pindah ke sini setelah tanggalnya lewat atau ditandai selesai."
                : canEdit
                  ? "Tambahkan pertemuan rutin atau kegiatan berikutnya agar anggota bisa absen."
                  : "Kegiatan muncul di sini setelah Sekretaris atau Ketua menambahkannya."
            }
            action={
              tab === "mendatang" && canEdit ? (
                <Button onClick={() => setSheet({ mode: "add" })}>Tambah kegiatan</Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="lembar divide-y divide-garis overflow-hidden">
            {shown.map((a) => {
              const hadir = hadirCounts?.get(a.id) ?? 0;
              return (
                <li key={a.id}>
                  <Link
                    href={`/kegiatan/detail?id=${a.id}`}
                    aria-label={`${a.title}, ${formatTanggalPanjang(a.startDate)}`}
                    className="flex -outline-offset-2 hover:bg-pulpen-50 active:bg-pulpen-100"
                  >
                    <span aria-hidden className="kolom-tanggal w-14 shrink-0 py-3 text-center">
                      <span className="block font-display text-2xl leading-none font-bold">
                        {Number(a.startDate.slice(8))}
                      </span>
                      <span className="mt-1 block text-xs text-tinta-pudar">
                        {BULAN_PENDEK[Number(a.startDate.slice(5, 7)) - 1]}
                        {a.startDate.slice(0, 4) !== today.slice(0, 4) &&
                          ` ${a.startDate.slice(2, 4)}`}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1 px-3 py-3">
                      <span className="block font-bold">{a.title}</span>
                      {a.location && (
                        <span className="mt-0.5 flex items-center gap-1 text-sm text-tinta-pudar">
                          <IconMapPin className="size-3.5" />
                          <span className="truncate">{a.location}</span>
                        </span>
                      )}
                      <span className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                        <Badge
                          tone={
                            a.status === "berjalan"
                              ? "stempel"
                              : a.status === "selesai"
                                ? "netral"
                                : "pulpen"
                          }
                        >
                          {ACTIVITY_STATUS_LABEL[a.status]}
                        </Badge>
                        {hadir > 0 && (
                          <span className="font-bold text-stempel-700">{hadir} hadir</span>
                        )}
                      </span>
                    </span>
                    <IconChevronRight className="mr-3 size-4 self-center text-tinta-pudar" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ActivitySheet state={sheet} user={user} onClose={() => setSheet(null)} />
    </>
  );
}
