"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { IconCalendar, IconCheck, IconMapPin, IconPen } from "@/components/ui/icons";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import type { SessionUser } from "@/lib/auth/session";
import { usePerm } from "@/lib/auth/use-perm";
import { formatTanggalPanjang, todayISO } from "@/lib/format/tanggal";
import { deleteIssue, hariSejak, saveIssue, setFixed } from "./repository";
import {
  CONDITION_HINT,
  CONDITION_LABEL,
  ISSUE_CONDITIONS,
  ISSUE_KINDS,
  KIND_LABEL,
  issueFormSchema,
  type IssueCondition,
  type IssueKind,
  type LightingIssue,
} from "./schema";

export type IssueSheetState = { mode: "add" } | { mode: "view"; issue: LightingIssue } | null;

const CONDITION_OPTIONS = ISSUE_CONDITIONS.map((c) => ({ value: c, label: CONDITION_LABEL[c] }));

function IssueForm({
  issue,
  user,
  canFollowUp,
  onDone,
}: {
  issue?: LightingIssue;
  user: SessionUser;
  /** boleh menandai diperbaiki dan menghapus (Ketua, S. Kelistrikan) */
  canFollowUp: boolean;
  onDone: () => void;
}) {
  const toast = useToast();
  const [location, setLocation] = useState(issue?.location ?? "");
  const [kind, setKind] = useState<IssueKind>(issue?.kind ?? "jalan");
  const [condition, setCondition] = useState<IssueCondition>(issue?.condition ?? "mati");
  const [reportedDate, setReportedDate] = useState(issue?.reportedDate ?? todayISO());
  const [note, setNote] = useState(issue?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function run(job: () => Promise<string>) {
    setBusy(true);
    toast.saved([await job()]);
    onDone();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = issueFormSchema.safeParse({
      location,
      kind,
      condition,
      note: note.trim() || null,
      reportedDate,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] = i.message;
      return setErrors(next);
    }
    void run(() => saveIssue(parsed.data, user, issue));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Lokasi" icon={<IconMapPin />} error={errors.location}>
        {(p) => (
          <Input
            {...p}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
            placeholder="Mis. depan balai dusun, RT 02"
          />
        )}
      </Field>
      <Field label="Jenis lampu">
        {(p) => (
          <Select {...p} value={kind} onChange={(e) => setKind(e.target.value as IssueKind)}>
            {ISSUE_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div>
        <Segmented<IssueCondition>
          label="Kondisi"
          options={CONDITION_OPTIONS}
          value={condition}
          onChange={setCondition}
        />
        <p className="mt-1.5 text-sm text-tinta-pudar">{CONDITION_HINT}</p>
      </div>
      <Field label="Mulai terlihat" icon={<IconCalendar />} error={errors.reportedDate}>
        {(p) => (
          <Input
            {...p}
            type="date"
            value={reportedDate}
            max={todayISO()}
            onChange={(e) => setReportedDate(e.target.value)}
          />
        )}
      </Field>
      <Field label="Catatan (boleh kosong)" icon={<IconPen />} error={errors.note}>
        {(p) => (
          <Textarea
            {...p}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder="Mis. tiang miring, kabel terkelupas"
          />
        )}
      </Field>

      <Button type="submit" size="lg" block loading={busy}>
        {issue ? "Simpan perubahan" : "Kirim laporan"}
      </Button>

      {issue && canFollowUp && (
        <div className="flex flex-col gap-2 border-t border-garis pt-4">
          {issue.status === "terbuka" ? (
            <Button
              variant="secondary"
              block
              disabled={busy}
              onClick={() => void run(() => setFixed(issue, true))}
            >
              <IconCheck className="size-5 text-stempel-600" /> Tandai sudah diperbaiki
            </Button>
          ) : (
            <Button
              variant="secondary"
              block
              disabled={busy}
              onClick={() => void run(() => setFixed(issue, false))}
            >
              Buka lagi, lampu rusak kembali
            </Button>
          )}
          {confirmDelete ? (
            <div className="rounded-md border-l-[6px] border-merah-600 bg-merah-50 p-3">
              <p className="font-bold text-merah-700">Hapus laporan ini?</p>
              <p className="mt-1 text-sm text-tinta-pudar">
                Pakai ini hanya untuk laporan ganda atau salah. Lampu yang sudah beres cukup
                ditandai diperbaiki.
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={busy}>
                  Batal
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void run(() => deleteIssue(issue))}
                  loading={busy}
                >
                  Ya, hapus
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="text-merah-700"
              onClick={() => setConfirmDelete(true)}
            >
              Hapus laporan
            </Button>
          )}
        </div>
      )}
    </form>
  );
}

function IssueView({ issue }: { issue: LightingIssue }) {
  const open = issue.status === "terbuka";
  return (
    <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2.5 text-sm">
      <dt className="text-tinta-pudar">Lokasi</dt>
      <dd className="font-bold">{issue.location}</dd>
      <dt className="text-tinta-pudar">Jenis</dt>
      <dd className="font-bold">{KIND_LABEL[issue.kind]}</dd>
      <dt className="text-tinta-pudar">Kondisi</dt>
      <dd className="font-bold">{CONDITION_LABEL[issue.condition]}</dd>
      <dt className="text-tinta-pudar">Terlihat</dt>
      <dd className="font-bold">
        {formatTanggalPanjang(issue.reportedDate)}
        {open && `, ${hariSejak(issue.reportedDate)} hari lalu`}
      </dd>
      <dt className="text-tinta-pudar">Status</dt>
      <dd>
        {open ? (
          <Badge tone="stabilo">Belum diperbaiki</Badge>
        ) : (
          <Badge tone="stempel">
            Diperbaiki{issue.fixedDate ? `, ${formatTanggalPanjang(issue.fixedDate)}` : ""}
          </Badge>
        )}
      </dd>
      {issue.note && (
        <>
          <dt className="text-tinta-pudar">Catatan</dt>
          <dd className="font-bold">{issue.note}</dd>
        </>
      )}
    </dl>
  );
}

export function IssueSheet({
  state,
  user,
  onClose,
}: {
  state: IssueSheetState;
  user: SessionUser | null;
  onClose: () => void;
}) {
  const { can } = usePerm();
  const followUp = can("lightingIssue", "update");
  return (
    <Sheet
      open={!!state}
      onClose={onClose}
      title={state?.mode === "add" ? "Laporkan lampu rusak" : "Laporan penerangan"}
    >
      {state &&
        user &&
        (state.mode === "view" && !followUp ? (
          <IssueView issue={state.issue} />
        ) : (
          <IssueForm
            issue={state.mode === "view" ? state.issue : undefined}
            user={user}
            canFollowUp={followUp}
            onDone={onClose}
          />
        ))}
    </Sheet>
  );
}
