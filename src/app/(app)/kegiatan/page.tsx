"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCalendar, IconChevronRight, IconMapPin, IconPlus } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { usePerm } from "@/lib/auth/use-perm";
import { db } from "@/lib/db/local";
import { formatTanggal, todayISO } from "@/lib/format/tanggal";
import { ActivitySheet, type ActivitySheetState } from "@/features/kegiatan/activity-sheet";
import { listActivities } from "@/features/kegiatan/repository";
import { ACTIVITY_STATUS_LABEL, type Activity } from "@/features/kegiatan/schema";

type Tab = "mendatang" | "lewat";

const isUpcoming = (a: Activity, today: string) =>
  a.status !== "selesai" && (a.endDate ?? a.startDate) >= today;

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function DateBlock({ iso }: { iso: string }) {
  const [, m, d] = iso.split("-").map(Number);
  return (
    <span
      aria-hidden
      className="grid size-14 shrink-0 place-items-center rounded-2xl bg-terong-100 leading-none text-terong-700"
    >
      <span className="text-xl font-bold">{d}</span>
      <span className="-mt-2.5 text-xs font-semibold">{MONTH_SHORT[m - 1]}</span>
    </span>
  );
}

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
        module="kegiatan"
        title="Kegiatan"
        subtitle="Daftar kegiatan dan absensi anggota."
        actions={
          canEdit && (
            <Button
              onClick={() => setSheet({ mode: "add" })}
              className="bg-terong-600 hover:bg-terong-700"
            >
              <IconPlus className="size-5" /> Tambah
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-4">
        <Segmented<Tab>
          label="Tampilkan"
          value={tab}
          onChange={setTab}
          options={[
            { value: "mendatang", label: `Mendatang · ${upcoming.length}` },
            { value: "lewat", label: `Sudah lewat · ${past.length}` },
          ]}
        />

        {activities === undefined ? (
          <p className="py-10 text-center text-tinta-lembut">Membuka data…</p>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<IconCalendar />}
            title={
              tab === "mendatang" ? "Belum ada kegiatan mendatang" : "Belum ada kegiatan yang lewat"
            }
            hint={
              tab === "mendatang" && canEdit
                ? "Tambahkan kegiatan agar anggota bisa absen."
                : undefined
            }
            action={
              tab === "mendatang" && canEdit ? (
                <Button onClick={() => setSheet({ mode: "add" })}>Tambah kegiatan</Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {shown.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/kegiatan/detail?id=${a.id}`}
                  className="flex min-h-20 items-center gap-3.5 rounded-2xl bg-white p-3 ring-1 ring-garis hover:bg-terong-50 active:bg-terong-50"
                >
                  <DateBlock iso={a.startDate} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{a.title}</span>
                    <span className="mt-0.5 flex items-center gap-1 truncate text-sm text-tinta-lembut">
                      <IconMapPin className="size-4 shrink-0" />
                      <span className="truncate">{a.location ?? formatTanggal(a.startDate)}</span>
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge
                        tone={
                          a.status === "berjalan"
                            ? "daun"
                            : a.status === "selesai"
                              ? "netral"
                              : "terong"
                        }
                      >
                        {ACTIVITY_STATUS_LABEL[a.status]}
                      </Badge>
                      {(hadirCounts?.get(a.id) ?? 0) > 0 && (
                        <Badge tone="daun">{hadirCounts?.get(a.id)} hadir</Badge>
                      )}
                    </span>
                  </span>
                  <IconChevronRight className="size-5 shrink-0 text-tinta-lembut" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ActivitySheet state={sheet} user={user} onClose={() => setSheet(null)} />
    </>
  );
}
