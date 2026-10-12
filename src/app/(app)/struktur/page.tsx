"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { IconBook, IconPen, IconPlus } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { usePerm } from "@/lib/auth/use-perm";
import { useOrg } from "@/lib/use-org";
import { AngkaSheet } from "@/features/organisasi/angka-sheet";
import { saveMember } from "@/features/anggota/repository";
import type { Member } from "@/features/anggota/schema";
import { JABATAN_INTI, labelPeriode, MASA_JABATAN, susunStruktur } from "@/features/struktur/susun";
import { useLookups } from "@/features/use-lookups";

/** Usulan jabatan di kolom isian; nama seksi baru boleh diketik bebas. */
const USULAN = [...JABATAN_INTI, "Seksi Kelistrikan", "Seksi Denda", "Anggota"];

type Atur = { member?: Member; jabatan: string } | null;

function Kotak({
  jabatan,
  pemegang,
  edit,
  besar,
  onAtur,
}: {
  jabatan: string;
  pemegang: Member[];
  edit: boolean;
  besar?: boolean;
  onAtur: (a: NonNullable<Atur>) => void;
}) {
  return (
    <div
      className={`lembar w-full p-3 text-center ${besar ? "border-l-[6px] border-l-pulpen-600" : ""} ${
        pemegang.length === 0 ? "border-dashed shadow-none" : ""
      }`}
    >
      <p className="text-xs text-tinta-pudar">{jabatan}</p>
      {pemegang.length === 0 ? (
        <>
          <p className="mt-0.5 text-tinta-pudar">Belum terisi</p>
          {edit && (
            <button
              type="button"
              onClick={() => onAtur({ jabatan })}
              className="mt-1 min-h-11 rounded-md px-3 text-sm font-bold text-pulpen-600 underline underline-offset-4"
            >
              Isi jabatan
            </button>
          )}
        </>
      ) : (
        <ul className="mt-0.5">
          {pemegang.map((m) => (
            <li key={m.id}>
              {edit ? (
                <button
                  type="button"
                  onClick={() => onAtur({ member: m, jabatan: m.position })}
                  className="min-h-11 w-full rounded-md font-bold hover:bg-pulpen-50 active:bg-pulpen-100"
                >
                  {m.fullName}
                </button>
              ) : (
                <span className={`block py-1 font-bold ${besar ? "font-display text-lg" : ""}`}>
                  {m.fullName}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Garis penghubung antar-tingkat bagan. */
const Garis = () => <span aria-hidden className="block h-4 w-px bg-garis-kuat" />;

function AturJabatan({
  state,
  members,
  onClose,
}: {
  state: Atur;
  members: Member[];
  onClose: () => void;
}) {
  const { user } = usePerm();
  const toast = useToast();
  const [memberId, setMemberId] = useState(state?.member?.id ?? "");
  const [jabatan, setJabatan] = useState(state?.jabatan ?? "");
  const [busy, setBusy] = useState(false);

  const target = members.find((m) => m.id === memberId);
  const rangkap = members.filter(
    (m) =>
      m.id !== memberId &&
      m.status === "aktif" &&
      jabatan.trim().toLowerCase() === m.position.trim().toLowerCase() &&
      ["ketua", "wakil ketua"].includes(jabatan.trim().toLowerCase()),
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !target || !jabatan.trim()) return;
    setBusy(true);
    toast.saved([await saveMember({ ...target, position: jabatan.trim() }, user, target)]);
    onClose();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Anggota">
        {(p) => (
          <Select {...p} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Pilih anggota…</option>
            {members
              .filter((m) => m.status === "aktif" || m.id === state?.member?.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.position})
                </option>
              ))}
          </Select>
        )}
      </Field>
      <Field
        label="Jabatan"
        hint='Ketik nama seksi baru bila perlu. Pilih "Anggota" untuk melepas jabatan.'
      >
        {(p) => (
          <>
            <Input
              {...p}
              list="usulan-jabatan"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              maxLength={60}
              autoComplete="off"
            />
            <datalist id="usulan-jabatan">
              {USULAN.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </>
        )}
      </Field>
      {rangkap.length > 0 && (
        <p className="rounded-md border-l-[6px] border-stabilo-300 bg-stabilo-100 p-3 text-sm">
          {rangkap.map((m) => m.fullName).join(", ")} masih tercatat sebagai {jabatan.trim()}. Ubah
          juga jabatannya supaya bagan tidak ganda.
        </p>
      )}
      <Button type="submit" size="lg" block loading={busy} disabled={!target || !jabatan.trim()}>
        Simpan jabatan
      </Button>
    </form>
  );
}

export default function StrukturPage() {
  const { members, loading } = useLookups();
  const { can } = usePerm();
  const org = useOrg();
  const [atur, setAtur] = useState<Atur>(null);
  const [aturPeriode, setAturPeriode] = useState(false);

  const { inti, seksi } = useMemo(() => susunStruktur(members), [members]);
  const edit = can("member", "update");
  const start = org?.termStart ?? null;
  const berakhir = start !== null && start + MASA_JABATAN <= new Date().getFullYear();
  const [ketua, wakil, sekretaris, bendahara] = inti;
  const props = { edit, onAtur: setAtur };

  return (
    <>
      <PageHeader
        title="Struktur organisasi"
        subtitle={
          start !== null
            ? `Pengurus periode ${labelPeriode(start)}`
            : "Pengurus periode ini. Periode belum diatur."
        }
        back={{ href: "/beranda", label: "Beranda" }}
      />

      <div className="flex flex-col gap-5">
        {berakhir && (
          <p
            role="status"
            className="rounded-md border-l-[6px] border-stabilo-300 bg-stabilo-100 p-3 text-sm"
          >
            Masa jabatan {MASA_JABATAN} tahun periode ini sudah berakhir. Pengurus baru dipilih
            lewat pemilihan (AD/ART Pasal 11).
          </p>
        )}

        {edit && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="px-2" onClick={() => setAtur({ jabatan: "" })}>
              <IconPlus className="size-5 text-pulpen-600" /> Atur jabatan
            </Button>
            <Button variant="secondary" className="px-2" onClick={() => setAturPeriode(true)}>
              <IconPen className="size-4 text-pulpen-600" /> Atur periode
            </Button>
          </div>
        )}

        {loading ? (
          <p className="py-10 text-center text-tinta-pudar">Membuka data…</p>
        ) : (
          <div className="flex flex-col items-center">
            <Kotak {...ketua} {...props} besar />
            <Garis />
            <Kotak {...wakil} {...props} />
            <Garis />
            <div className="relative grid w-full grid-cols-2 gap-3 pt-4">
              {/* Cabang ke dua kotak: garis datar dengan ujung turun tepat di tengah tiap kolom. */}
              <span
                aria-hidden
                className="absolute inset-x-[25%] top-0 h-4 rounded-t-sm border-x border-t border-garis-kuat"
              />
              <Kotak {...sekretaris} {...props} />
              <Kotak {...bendahara} {...props} />
            </div>

            <Garis />
            <h2 className="font-display text-lg font-bold">Seksi dan bidang</h2>
            {seksi.length === 0 ? (
              <p className="mt-2 text-center text-tinta-pudar">
                Belum ada seksi. Ketik nama seksi di &quot;Atur jabatan&quot;, mis. Seksi
                Kelistrikan.
              </p>
            ) : (
              <div className="mt-3 grid w-full grid-cols-2 gap-3">
                {seksi.map((k) => (
                  <Kotak key={k.jabatan} {...k} {...props} />
                ))}
              </div>
            )}
          </div>
        )}

        <p className="flex items-start gap-2 text-sm text-tinta-pudar">
          <IconBook className="mt-0.5 size-4 shrink-0" />
          <span>
            Susunan pengurus mengikuti jabatan di daftar anggota. Aturannya ada di{" "}
            <Link href="/adart#pasal-11" className="font-bold text-pulpen-600 underline">
              AD/ART Pasal 11
            </Link>
            .
          </span>
        </p>
      </div>

      <Sheet open={!!atur} onClose={() => setAtur(null)} title="Atur jabatan">
        {atur && <AturJabatan state={atur} members={members} onClose={() => setAtur(null)} />}
      </Sheet>
      <AngkaSheet
        open={aturPeriode}
        onClose={() => setAturPeriode(false)}
        setting="termStart"
        title="Periode kepengurusan"
        label="Tahun mulai jabatan"
        hint={`Masa jabatan ${MASA_JABATAN} tahun (Pasal 11), jadi 2024 berarti periode 2024–2026.`}
        initial={start}
      />
    </>
  );
}
