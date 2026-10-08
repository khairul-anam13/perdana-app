"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import type { SessionUser } from "@/lib/auth/session";
import { todayISO } from "@/lib/format/tanggal";
import { useLookups } from "../use-lookups";
import { deleteActivity, saveActivity } from "./repository";
import {
  ACTIVITY_STATUSES,
  ACTIVITY_STATUS_LABEL,
  activityFormSchema,
  type Activity,
  type ActivityStatus,
} from "./schema";

const STATUS_OPTIONS = ACTIVITY_STATUSES.map((s) => ({
  value: s,
  label: ACTIVITY_STATUS_LABEL[s],
}));

function ActivityForm({
  activity,
  user,
  onDone,
}: {
  activity?: Activity;
  user: SessionUser;
  onDone: (deleted?: boolean) => void;
}) {
  const toast = useToast();
  const { members } = useLookups();
  const [title, setTitle] = useState(activity?.title ?? "");
  const [description, setDescription] = useState(activity?.description ?? "");
  const [startDate, setStartDate] = useState(activity?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(activity?.endDate ?? "");
  const [location, setLocation] = useState(activity?.location ?? "");
  const [status, setStatus] = useState<ActivityStatus>(activity?.status ?? "rencana");
  const [leaderId, setLeaderId] = useState(activity?.leaderId ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = activityFormSchema.safeParse({
      title,
      description: description.trim() || null,
      startDate,
      endDate: endDate || null,
      location: location.trim() || null,
      status,
      leaderId: leaderId || null,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] = i.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    const id = await saveActivity(parsed.data, user, activity);
    toast.saved([id]);
    onDone();
  }

  async function onDelete() {
    if (!activity) return;
    setBusy(true);
    const id = await deleteActivity(activity);
    toast.saved([id]);
    onDone(true);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Nama kegiatan" error={errors.title}>
        {(p) => (
          <Input
            {...p}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Mis. Kerja bakti bersih desa"
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mulai" error={errors.startDate}>
          {(p) => (
            <Input
              {...p}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          )}
        </Field>
        <Field label="Selesai (boleh kosong)" error={errors.endDate}>
          {(p) => (
            <Input
              {...p}
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          )}
        </Field>
      </div>
      <Field label="Lokasi (boleh kosong)">
        {(p) => (
          <Input
            {...p}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
          />
        )}
      </Field>
      <Field label="Penanggung jawab (boleh kosong)">
        {(p) => (
          <Select {...p} value={leaderId} onChange={(e) => setLeaderId(e.target.value)}>
            <option value="">Belum ditentukan</option>
            {members
              .filter((m) => m.status === "aktif")
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
          </Select>
        )}
      </Field>
      <Segmented label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      <Field label="Keterangan (boleh kosong)" error={errors.description}>
        {(p) => (
          <Textarea
            {...p}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
          />
        )}
      </Field>

      <Button
        type="submit"
        size="lg"
        block
        disabled={busy}
        className="bg-terong-600 hover:bg-terong-700"
      >
        {busy ? "Menyimpan…" : activity ? "Simpan perubahan" : "Tambah kegiatan"}
      </Button>

      {activity &&
        (confirmDelete ? (
          <div className="rounded-2xl bg-bata-50 p-4 ring-1 ring-bata-100">
            <p className="font-semibold text-bata-700">Hapus kegiatan ini?</p>
            <p className="mt-1 text-sm text-tinta-lembut">
              Kegiatan hilang dari daftar. Catatan kas yang terkait tetap ada.
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
          <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-bata-700">
            Hapus kegiatan
          </Button>
        ))}
    </form>
  );
}

export type ActivitySheetState = { mode: "add" } | { mode: "edit"; activity: Activity } | null;

export function ActivitySheet({
  state,
  user,
  onClose,
}: {
  state: ActivitySheetState;
  user: SessionUser | null;
  /** deleted = true bila kegiatan dihapus (halaman detail perlu kembali ke daftar) */
  onClose: (deleted?: boolean) => void;
}) {
  return (
    <Sheet
      open={!!state}
      onClose={() => onClose()}
      title={state?.mode === "edit" ? "Ubah kegiatan" : "Tambah kegiatan"}
    >
      {state && user && (
        <ActivityForm
          activity={state.mode === "edit" ? state.activity : undefined}
          user={user}
          onDone={onClose}
        />
      )}
    </Sheet>
  );
}
