"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { IconChevronRight, IconPlus, IconSearch } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { usePerm } from "@/lib/auth/use-perm";
import { ageFlag } from "@/features/anggota/age";
import { MemberSheet, type MemberSheetState } from "@/features/anggota/member-sheet";
import {
  MEMBER_STATUSES,
  STATUS_LABEL,
  type Member,
  type MemberStatus,
} from "@/features/anggota/schema";
import { useLookups } from "@/features/use-lookups";

type Filter = "semua" | MemberStatus | "usia";

function MemberRow({ m, onOpen, showAge }: { m: Member; onOpen: () => void; showAge: boolean }) {
  const flag = showAge && m.status === "aktif" ? ageFlag(m.birthDate) : null;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left -outline-offset-2 hover:bg-pulpen-50 active:bg-pulpen-100"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{m.fullName}</span>
          <span className="block truncate text-sm text-tinta-pudar">
            {m.position}
            {m.dusun ? `, ${m.dusun}` : ""}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {m.status !== "aktif" && <Badge>{STATUS_LABEL[m.status]}</Badge>}
          {flag === "lewat" && <Badge tone="merah">Lewat batas usia</Badge>}
          {flag === "mendekati" && <Badge tone="stabilo">Hampir batas usia</Badge>}
        </span>
        <IconChevronRight className="size-4 text-tinta-pudar" />
      </button>
    </li>
  );
}

export default function AnggotaPage() {
  const { members, loading } = useLookups();
  const { user, can } = usePerm();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");
  const [sheet, setSheet] = useState<MemberSheetState>(null);

  const canEdit = can("member");
  const isPengurus = user?.role !== "anggota";
  const flagged = (m: Member) => isPengurus && m.status === "aktif" && !!ageFlag(m.birthDate);

  const counts = useMemo(() => {
    const c = { semua: members.length, aktif: 0, nonaktif: 0, alumni: 0 };
    for (const m of members) c[m.status]++;
    return c;
  }, [members]);
  const warnCount = members.filter(flagged).length;

  const needle = q.trim().toLowerCase();
  const shown = members.filter(
    (m) =>
      (filter === "semua" || (filter === "usia" ? flagged(m) : m.status === filter)) &&
      (!needle ||
        `${m.fullName} ${m.nickname ?? ""} ${m.dusun ?? ""} ${m.position}`
          .toLowerCase()
          .includes(needle)),
  );

  const filters: { key: Filter; label: string }[] = [
    { key: "semua", label: `Semua (${counts.semua})` },
    ...MEMBER_STATUSES.map((s) => ({
      key: s as Filter,
      label: `${STATUS_LABEL[s]} (${counts[s]})`,
    })),
  ];

  return (
    <>
      <PageHeader
        title="Anggota"
        subtitle={
          isPengurus
            ? `${counts.aktif} aktif dari ${counts.semua} orang`
            : "Daftar anggota Karang Taruna"
        }
        actions={
          canEdit && (
            <Button onClick={() => setSheet({ mode: "add" })}>
              <IconPlus className="size-5" /> Tambah
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-4">
        {warnCount > 0 && (
          <button
            type="button"
            aria-pressed={filter === "usia"}
            onClick={() => setFilter(filter === "usia" ? "semua" : "usia")}
            className="flex min-h-12 items-center gap-3 rounded-md border-l-[6px] border-stabilo-300 bg-stabilo-100 px-3.5 py-2 text-left text-sm"
          >
            <span className="flex-1">
              <b>{warnCount} anggota aktif</b> sudah atau hampir melewati batas usia 45 tahun.
            </span>
            <span className="shrink-0 font-bold text-pulpen-600 underline underline-offset-4">
              {filter === "usia" ? "Tampilkan semua" : "Lihat"}
            </span>
          </button>
        )}

        <div className="relative">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tinta-pudar" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, dusun, atau jabatan"
            aria-label="Cari anggota"
            className="pl-10!"
          />
        </div>

        <div
          className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-1"
          role="group"
          aria-label="Filter status"
        >
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-11 shrink-0 rounded-md border px-3.5 text-sm font-bold whitespace-nowrap ${
                filter === f.key
                  ? "border-pulpen-600 bg-pulpen-600 text-white"
                  : "border-garis-kuat bg-lembar hover:bg-pulpen-50 active:bg-pulpen-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <ListSkeleton rows={6} />
        ) : shown.length === 0 ? (
          members.length === 0 ? (
            <EmptyState
              title="Belum ada anggota"
              hint={
                canEdit
                  ? "Tambahkan anggota pertama. Bisa tanpa internet."
                  : "Daftar muncul setelah data pertama diunduh. Sambungkan internet sekali."
              }
              action={
                canEdit ? (
                  <Button onClick={() => setSheet({ mode: "add" })}>Tambah anggota</Button>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              title={needle ? `Tidak ada "${q.trim()}"` : "Tidak ada anggota di sini"}
              hint="Periksa ejaan, atau cari di semua status."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQ("");
                    setFilter("semua");
                  }}
                >
                  Tampilkan semua anggota
                </Button>
              }
            />
          )
        ) : (
          <ul className="lembar divide-y divide-garis overflow-hidden">
            {shown.map((m) => (
              <MemberRow
                key={m.id}
                m={m}
                showAge={isPengurus}
                onOpen={() =>
                  setSheet(canEdit ? { mode: "edit", member: m } : { mode: "view", member: m })
                }
              />
            ))}
          </ul>
        )}
      </div>

      <MemberSheet state={sheet} user={user} onClose={() => setSheet(null)} />
    </>
  );
}
