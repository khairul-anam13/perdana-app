"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { IconPlus, IconSearch, IconUsers } from "@/components/ui/icons";
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

type Filter = "semua" | MemberStatus;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")
  ).toUpperCase();
}

function MemberRow({ m, onOpen, showAge }: { m: Member; onOpen: () => void; showAge: boolean }) {
  const flag = showAge && m.status === "aktif" ? ageFlag(m.birthDate) : null;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-16 w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-air-50 active:bg-air-50"
      >
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full bg-air-100 font-bold text-air-700"
        >
          {initials(m.fullName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{m.fullName}</span>
          <span className="block truncate text-sm text-tinta-lembut">
            {m.position}
            {m.dusun ? ` · ${m.dusun}` : ""}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {m.status !== "aktif" && <Badge>{STATUS_LABEL[m.status]}</Badge>}
          {flag === "lewat" && <Badge tone="bata">Lewat batas usia</Badge>}
          {flag === "mendekati" && <Badge tone="padi">Mendekati batas usia</Badge>}
        </span>
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

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { semua: members.length, aktif: 0, nonaktif: 0, alumni: 0 };
    for (const m of members) c[m.status]++;
    return c;
  }, [members]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter(
      (m) =>
        (filter === "semua" || m.status === filter) &&
        (!needle ||
          `${m.fullName} ${m.nickname ?? ""} ${m.dusun ?? ""} ${m.position}`
            .toLowerCase()
            .includes(needle)),
    );
  }, [members, q, filter]);

  const canEdit = can("member");
  const isPengurus = user?.role !== "anggota";
  const warnCount = isPengurus
    ? members.filter((m) => m.status === "aktif" && ageFlag(m.birthDate)).length
    : 0;

  return (
    <>
      <PageHeader
        module="anggota"
        title="Anggota"
        subtitle={
          isPengurus
            ? `${counts.aktif} aktif dari ${counts.semua} orang`
            : "Daftar anggota Karang Taruna"
        }
        actions={
          canEdit && (
            <Button
              onClick={() => setSheet({ mode: "add" })}
              className="bg-air-600 hover:bg-air-700"
            >
              <IconPlus className="size-5" /> Tambah
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-4">
        {warnCount > 0 && (
          <p className="rounded-2xl bg-padi-100 p-3.5 text-sm font-medium text-padi-800">
            {warnCount} anggota aktif sudah atau hampir melewati batas usia 45 tahun. Cari tanda
            &quot;batas usia&quot; di daftar.
          </p>
        )}

        <div className="relative">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-tinta-lembut" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama, dusun, atau jabatan"
            aria-label="Cari anggota"
            className="pl-11"
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter status">
          {(["semua", ...MEMBER_STATUSES] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`min-h-11 rounded-full px-4 text-sm font-semibold ring-1 ${
                filter === f
                  ? "bg-air-600 text-white ring-air-600"
                  : "bg-white ring-garis-kuat hover:bg-air-50"
              }`}
            >
              {f === "semua" ? "Semua" : STATUS_LABEL[f]} · {counts[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-10 text-center text-tinta-lembut">Membuka data…</p>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<IconUsers />}
            title={members.length === 0 ? "Belum ada anggota" : "Tidak ditemukan"}
            hint={
              members.length === 0
                ? canEdit
                  ? "Tambahkan anggota pertama. Bisa tanpa internet."
                  : "Daftar muncul setelah data pertama diunduh. Sambungkan internet sekali."
                : "Coba kata kunci lain atau ganti filter status."
            }
            action={
              canEdit && members.length === 0 ? (
                <Button onClick={() => setSheet({ mode: "add" })}>Tambah anggota</Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-garis rounded-2xl bg-white px-2 ring-1 ring-garis">
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
