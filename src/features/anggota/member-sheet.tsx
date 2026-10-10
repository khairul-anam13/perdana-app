"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import type { SessionUser } from "@/lib/auth/session";
import { formatTanggal, todayISO } from "@/lib/format/tanggal";
import { ageFlag } from "./age";
import { deleteMember, saveMember } from "./repository";
import {
  GENDERS,
  MEMBER_STATUSES,
  memberFormSchema,
  POSITIONS,
  STATUS_LABEL,
  type Member,
  type MemberStatus,
} from "./schema";

const GENDER_OPTIONS = [
  { value: "L", label: "Laki-laki" },
  { value: "P", label: "Perempuan" },
] as const;
const STATUS_OPTIONS = MEMBER_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }));

/** Formulir tambah/ubah anggota (Sekretaris dan Ketua). Isinya hanya dirender saat sheet terbuka. */
function MemberForm({
  member,
  user,
  onDone,
}: {
  member?: Member;
  user: SessionUser;
  onDone: () => void;
}) {
  const toast = useToast();
  const [fullName, setFullName] = useState(member?.fullName ?? "");
  const [nickname, setNickname] = useState(member?.nickname ?? "");
  const [gender, setGender] = useState<(typeof GENDERS)[number]>(member?.gender ?? "L");
  const [birthDate, setBirthDate] = useState(member?.birthDate ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [dusun, setDusun] = useState(member?.dusun ?? "");
  const [address, setAddress] = useState(member?.address ?? "");
  const [position, setPosition] = useState(member?.position ?? "Anggota");
  const [status, setStatus] = useState<MemberStatus>(member?.status ?? "aktif");
  const [joinedAt, setJoinedAt] = useState(member?.joinedAt ?? todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = memberFormSchema.safeParse({
      fullName,
      nickname: nickname.trim() || null,
      gender,
      birthDate: birthDate || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      dusun: dusun.trim() || null,
      position,
      status,
      joinedAt,
    });
    const next: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) next[String(i.path[0])] = i.message;
    if (!birthDate) next.birthDate = "Isi tanggal lahir";
    setErrors(next);
    if (!parsed.success || Object.keys(next).length) return;

    setBusy(true);
    const id = await saveMember(parsed.data, user, member);
    toast.saved([id]);
    onDone();
  }

  async function onDelete() {
    if (!member) return;
    setBusy(true);
    const id = await deleteMember(member);
    toast.saved([id]);
    onDone();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Nama lengkap" error={errors.fullName}>
        {(p) => (
          <Input
            {...p}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="off"
            maxLength={100}
          />
        )}
      </Field>
      <Field label="Nama panggilan (boleh kosong)">
        {(p) => (
          <Input
            {...p}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={50}
          />
        )}
      </Field>
      <Segmented
        label="Jenis kelamin"
        value={gender}
        onChange={setGender}
        options={GENDER_OPTIONS}
      />
      <Field label="Tanggal lahir" error={errors.birthDate}>
        {(p) => (
          <Input
            {...p}
            type="date"
            value={birthDate}
            max={todayISO()}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        )}
      </Field>
      <Field label="Nomor HP (boleh kosong)">
        {(p) => (
          <Input
            {...p}
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
          />
        )}
      </Field>
      <Field label="Dusun">
        {(p) => (
          <Input
            {...p}
            value={dusun}
            onChange={(e) => setDusun(e.target.value)}
            maxLength={60}
            placeholder="Mis. Dusun Kaler"
          />
        )}
      </Field>
      <Field label="Alamat (boleh kosong)">
        {(p) => (
          <Input
            {...p}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={200}
            placeholder="RT/RW, nama jalan"
          />
        )}
      </Field>
      <Field label="Jabatan">
        {(p) => (
          <Select {...p} value={position} onChange={(e) => setPosition(e.target.value)}>
            {[...new Set([...POSITIONS, position])].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        )}
      </Field>
      <Segmented label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      <Field label="Tanggal bergabung" error={errors.joinedAt}>
        {(p) => (
          <Input
            {...p}
            type="date"
            value={joinedAt}
            max={todayISO()}
            onChange={(e) => setJoinedAt(e.target.value)}
          />
        )}
      </Field>

      <Button type="submit" size="lg" block disabled={busy}>
        {busy ? "Menyimpan…" : member ? "Simpan perubahan" : "Tambah anggota"}
      </Button>

      {member &&
        (confirmDelete ? (
          <div className="rounded-lg bg-merah-50 p-4 ring-1 ring-merah-100">
            <p className="font-bold text-merah-700">Hapus {member.fullName}?</p>
            <p className="mt-1 text-sm text-tinta-pudar">
              Anggota hilang dari daftar. Catatan kas dan absensi lama tetap ada.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={busy}>
                Batal
              </Button>
              <Button variant="danger" onClick={onDelete} disabled={busy}>
                Ya, hapus
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-merah-700">
            Hapus anggota
          </Button>
        ))}
    </form>
  );
}

/** Tampilan baca-saja untuk anggota biasa: hanya nama, jabatan, dusun. */
function MemberView({ member }: { member: Member }) {
  return (
    <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-3">
      <dt className="text-tinta-pudar">Nama</dt>
      <dd className="font-medium">{member.fullName}</dd>
      <dt className="text-tinta-pudar">Jabatan</dt>
      <dd className="font-medium">{member.position}</dd>
      <dt className="text-tinta-pudar">Dusun</dt>
      <dd className="font-medium">{member.dusun ?? "-"}</dd>
      <dt className="text-tinta-pudar">Status</dt>
      <dd>
        <Badge tone={member.status === "aktif" ? "stempel" : "netral"}>
          {STATUS_LABEL[member.status]}
        </Badge>
      </dd>
      <dt className="text-tinta-pudar">Bergabung</dt>
      <dd className="font-medium">{formatTanggal(member.joinedAt)}</dd>
    </dl>
  );
}

export type MemberSheetState =
  { mode: "add" } | { mode: "edit"; member: Member } | { mode: "view"; member: Member } | null;

export function MemberSheet({
  state,
  user,
  onClose,
}: {
  state: MemberSheetState;
  user: SessionUser | null;
  onClose: () => void;
}) {
  const title = !state
    ? ""
    : state.mode === "add"
      ? "Tambah anggota"
      : state.mode === "edit"
        ? "Ubah anggota"
        : state.member.nickname || state.member.fullName;
  const flag = state && state.mode !== "add" ? ageFlag(state.member.birthDate) : null;
  return (
    <Sheet open={!!state} onClose={onClose} title={title}>
      {state && user && (
        <>
          {flag && state.mode === "edit" && (
            <p
              className={`mb-4 rounded-md p-3 text-sm font-medium ${flag === "lewat" ? "bg-merah-50 text-merah-700" : "bg-stabilo-100 text-stabilo-800"}`}
            >
              {flag === "lewat"
                ? "Sudah melewati batas usia Karang Taruna (45 tahun). Pertimbangkan mengubah status menjadi Alumni."
                : "Mendekati batas usia Karang Taruna (45 tahun)."}
            </p>
          )}
          {state.mode === "view" ? (
            <MemberView member={state.member} />
          ) : (
            <MemberForm
              member={state.mode === "edit" ? state.member : undefined}
              user={user}
              onDone={onClose}
            />
          )}
        </>
      )}
    </Sheet>
  );
}
