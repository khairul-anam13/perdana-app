"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { IconChevronRight, IconLightbulb, IconMapPin, IconPlus } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { usePerm } from "@/lib/auth/use-perm";
import { formatTanggal } from "@/lib/format/tanggal";
import { usePendingIds } from "@/lib/sync/use-pending";
import { IssueSheet, type IssueSheetState } from "@/features/penerangan/issue-sheet";
import { hariSejak, listIssues } from "@/features/penerangan/repository";
import { CONDITION_LABEL, KIND_LABEL, type LightingIssue } from "@/features/penerangan/schema";

type Tab = "terbuka" | "diperbaiki";
/** Lampu yang sudah selama ini belum diperbaiki ditandai agar tidak terlupa. */
const LAMA_HARI = 14;

function Baris({
  issue,
  pending,
  onOpen,
}: {
  issue: LightingIssue;
  pending: boolean;
  onOpen: () => void;
}) {
  const open = issue.status === "terbuka";
  const hari = hariSejak(issue.reportedDate);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-16 w-full items-start gap-3 px-4 py-3 text-left -outline-offset-2 hover:bg-pulpen-50 active:bg-pulpen-100"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-bold">
            <IconMapPin className="size-4 shrink-0 text-tinta-pudar" />
            <span className="min-w-0 leading-tight">{issue.location}</span>
          </span>
          <span className="mt-0.5 block text-sm text-tinta-pudar">
            {KIND_LABEL[issue.kind]}
            {open
              ? `, terlihat ${hari === 0 ? "hari ini" : `${hari} hari lalu`}`
              : `, diperbaiki ${issue.fixedDate ? formatTanggal(issue.fixedDate) : ""}`}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={open ? "merah" : "stempel"}>{CONDITION_LABEL[issue.condition]}</Badge>
            {open && hari >= LAMA_HARI && (
              <span className="stabilo text-xs font-bold">Sudah {Math.floor(hari / 7)} minggu</span>
            )}
            {pending && <span className="stabilo text-xs font-bold">Menunggu kirim</span>}
          </span>
        </span>
        <IconChevronRight className="mt-1 size-4 shrink-0 text-tinta-pudar" />
      </button>
    </li>
  );
}

export default function PeneranganPage() {
  const issues = useLiveQuery(listIssues, []);
  const pending = usePendingIds();
  const { user } = usePerm();
  const [tab, setTab] = useState<Tab>("terbuka");
  const [sheet, setSheet] = useState<IssueSheetState>(null);

  const { terbuka, diperbaiki } = useMemo(() => {
    const all = issues ?? [];
    return {
      // yang paling lama dibiarkan di paling atas; yang sudah beres, terbaru dulu
      terbuka: all
        .filter((i) => i.status === "terbuka")
        .sort((a, b) => a.reportedDate.localeCompare(b.reportedDate)),
      diperbaiki: all
        .filter((i) => i.status === "diperbaiki")
        .sort((a, b) => (b.fixedDate ?? "").localeCompare(a.fixedDate ?? "")),
    };
  }, [issues]);
  const shown = tab === "terbuka" ? terbuka : diperbaiki;

  return (
    <>
      <PageHeader
        title="Penerangan desa"
        subtitle="Catat lampu jalan dan fasilitas penerangan yang mati atau rusak."
        actions={
          user && (
            <Button onClick={() => setSheet({ mode: "add" })}>
              <IconPlus className="size-5" /> Lapor
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
            { value: "terbuka", label: `Belum diperbaiki (${terbuka.length})` },
            { value: "diperbaiki", label: `Sudah diperbaiki (${diperbaiki.length})` },
          ]}
        />

        {issues === undefined ? (
          <ListSkeleton />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<IconLightbulb className="size-6" />}
            title={
              tab === "terbuka" ? "Semua lampu menyala" : "Belum ada lampu yang ditandai diperbaiki"
            }
            hint={
              tab === "terbuka"
                ? "Lihat lampu mati atau rusak di jalan? Laporkan, bisa tanpa internet."
                : "Lampu yang sudah beres muncul di sini setelah S. Kelistrikan menandainya."
            }
            action={
              tab === "terbuka" && user ? (
                <Button onClick={() => setSheet({ mode: "add" })}>Laporkan lampu</Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="lembar divide-y divide-garis overflow-hidden">
            {shown.map((i) => (
              <Baris
                key={i.id}
                issue={i}
                pending={pending.has(i.id)}
                onOpen={() => setSheet({ mode: "view", issue: i })}
              />
            ))}
          </ul>
        )}

        <p className="text-sm text-tinta-pudar">
          Perbaikan dikoordinasi S. Kelistrikan dan Ketua. Siapa pun boleh melapor.
        </p>
      </div>

      <IssueSheet state={sheet} user={user} onClose={() => setSheet(null)} />
    </>
  );
}
