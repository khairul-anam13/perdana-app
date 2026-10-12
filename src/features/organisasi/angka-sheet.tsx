"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import type { OrgSetting } from "@/lib/auth/permissions";
import { getMeta, setMeta } from "@/lib/db/local";
import { formatAngka, parseRupiah } from "@/lib/format/rupiah";
import { useOnline } from "@/lib/sync/use-sync-info";

/**
 * Satu angka pengaturan organisasi (tahun mulai periode, tarif denda). Disimpan lewat
 * PATCH /api/organization lalu langsung ditulis ke data lokal agar layar ikut berubah.
 */
export function AngkaSheet({
  open,
  onClose,
  setting,
  title,
  label,
  hint,
  initial,
  rupiah = false,
}: {
  open: boolean;
  onClose: () => void;
  setting: OrgSetting;
  title: string;
  label: string;
  hint?: string;
  initial: number | null | undefined;
  rupiah?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {open && (
        <AngkaForm
          setting={setting}
          label={label}
          hint={hint}
          initial={initial ?? null}
          rupiah={rupiah}
          onDone={onClose}
        />
      )}
    </Sheet>
  );
}

function AngkaForm({
  setting,
  label,
  hint,
  initial,
  rupiah,
  onDone,
}: {
  setting: OrgSetting;
  label: string;
  hint?: string;
  initial: number | null;
  rupiah: boolean;
  onDone: () => void;
}) {
  const toast = useToast();
  const online = useOnline();
  const [value, setValue] = useState(initial ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [setting]: value || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Gagal menyimpan");
      const org = await getMeta<Record<string, unknown>>("organization");
      await setMeta("organization", { ...org, ...data });
      toast.show("Tersimpan");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak bisa terhubung ke server");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {!online && (
        <p
          role="alert"
          className="rounded-md border-l-[6px] border-stabilo-300 bg-stabilo-100 p-3 text-sm"
        >
          Pengaturan ini hanya bisa diubah saat online, supaya semua perangkat memakai nilai yang
          sama.
        </p>
      )}
      <Field label={label} hint={hint} error={error ?? undefined}>
        {(p) => (
          <Input
            {...p}
            value={value ? (rupiah ? formatAngka(value) : String(value)) : ""}
            onChange={(e) => setValue(parseRupiah(e.target.value))}
            inputMode="numeric"
            placeholder={rupiah ? "Mis. 5.000" : "Mis. 2024"}
            className="text-lg font-bold"
          />
        )}
      </Field>
      <Button type="submit" size="lg" block loading={busy} disabled={!online}>
        Simpan
      </Button>
    </form>
  );
}
