"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { ListSkeleton } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { IconCamera, IconX } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { usePerm } from "@/lib/auth/use-perm";
import { formatAngka, formatRupiah, parseRupiah } from "@/lib/format/rupiah";
import { todayISO } from "@/lib/format/tanggal";
import { compressImage } from "@/lib/image/compress";
import { useLookups } from "@/features/use-lookups";
import { saveTransaction } from "@/features/kas/repository";
import {
  CATEGORY_IURAN,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  MAX_AMOUNT,
  TX_TYPES,
  transactionFormSchema,
  type TxType,
} from "@/features/kas/schema";

const QUICK_AMOUNTS = [10_000, 20_000, 50_000, 100_000];
const TYPE_OPTIONS = [
  { value: "pemasukan", label: "Pemasukan" },
  { value: "pengeluaran", label: "Pengeluaran" },
] as const;

function parseType(v: string | null): TxType {
  return (TX_TYPES as readonly string[]).includes(v ?? "") ? (v as TxType) : "pemasukan";
}

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { user, can, seksiKategori } = usePerm();
  const { members, activities } = useLookups();

  const [typeState, setType] = useState<TxType>(parseType(params.get("tipe")));
  const [amount, setAmount] = useState(0);
  const [categoryState, setCategory] = useState(params.get("kategori") ?? "");
  const [memberId, setMemberId] = useState(params.get("anggota") ?? "");
  const [activityId, setActivityId] = useState(params.get("kegiatan") ?? "");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<Blob | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Kembali ke layar asal (mis. rekap iuran), bukan selalu ke daftar kas.
  const backTo = params.get("dari") === "iuran" ? "/kas/iuran" : "/kas";

  // Seksi hanya mencatat pemasukan di satu kategori: jenis dan kategori dikunci (server juga menolak lainnya).
  const type: TxType = seksiKategori ? "pemasukan" : typeState;
  const category = seksiKategori ?? categoryState;
  const categories = type === "pemasukan" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const isIuran = type === "pemasukan" && category === CATEGORY_IURAN;
  const activeMembers = useMemo(() => members.filter((m) => m.status === "aktif"), [members]);
  const receiptUrl = useMemo(() => (receipt ? URL.createObjectURL(receipt) : null), [receipt]);
  useEffect(() => () => void (receiptUrl && URL.revokeObjectURL(receiptUrl)), [receiptUrl]);

  if (user && !can("transaction")) {
    return (
      <div className="lembar p-5">
        <p className="font-display text-lg font-bold">
          Hanya Bendahara dan Ketua yang bisa mencatat kas.
        </p>
        <p className="mt-1 text-tinta-pudar">Anda tetap bisa melihat semua catatan kas.</p>
        <ButtonLink href="/kas" className="mt-4">
          Kembali ke Kas
        </ButtonLink>
      </div>
    );
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setReceiptBusy(true);
    try {
      setReceipt(await compressImage(file)); // < 300 KB, disimpan di HP dulu
    } catch {
      toast.show("Foto tidak bisa dipakai. Coba foto lain.", "error");
    } finally {
      setReceiptBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const parsed = transactionFormSchema.safeParse({
      type,
      amount,
      category,
      note: note.trim() || null,
      transactionDate: date,
      activityId: activityId || null,
      memberId: memberId || null,
    });
    const next: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) next[String(i.path[0])] = i.message;
    if (amount <= 0) next.amount = "Isi nominal lebih dari 0";
    if (!category) next.category = "Pilih kategori";
    if (isIuran && !memberId) next.memberId = "Pilih anggota yang membayar iuran";
    setErrors(next);
    if (Object.keys(next).length || !parsed.success) {
      // Bawa pengguna ke isian pertama yang salah; tombol simpan ada jauh di bawah.
      const form = e.currentTarget;
      requestAnimationFrame(() =>
        form.querySelector<HTMLElement>('[aria-invalid="true"]')?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        }),
      );
      return;
    }

    setSaving(true);
    try {
      const changeId = await saveTransaction(parsed.data, user, receipt);
      toast.saved([changeId]);
      router.replace(backTo);
    } catch {
      toast.show("Gagal menyimpan di HP. Coba lagi.", "error");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {!seksiKategori && (
        <Segmented<TxType>
          label="Jenis"
          hideLabel
          value={type}
          onChange={(v) => {
            setType(v);
            setCategory("");
            setMemberId("");
          }}
          options={TYPE_OPTIONS}
          tones={{
            pemasukan: "bg-pulpen-600 text-white",
            pengeluaran: "bg-merah-600 text-white",
          }}
        />
      )}

      <div>
        <Field label="Nominal" error={errors.amount}>
          {(p) => (
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center font-display text-xl font-bold text-tinta-pudar"
              >
                Rp
              </span>
              <Input
                {...p}
                value={amount ? formatAngka(amount) : ""}
                onChange={(e) => setAmount(Math.min(parseRupiah(e.target.value), MAX_AMOUNT))}
                inputMode="numeric"
                placeholder="0"
                autoFocus
                className="h-16! pl-13! text-3xl! font-bold"
              />
            </div>
          )}
        </Field>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(q)}
              aria-label={`Isi ${formatRupiah(q)}`}
              className="min-h-11 rounded-md border border-garis-kuat bg-lembar text-sm font-bold hover:bg-pulpen-50 active:bg-pulpen-100"
            >
              {formatAngka(q)}
            </button>
          ))}
        </div>
      </div>

      <Chips
        label="Kategori"
        options={categories}
        value={category as (typeof categories)[number] | ""}
        onChange={setCategory}
        error={errors.category}
      />

      {isIuran && (
        <Field label="Anggota yang membayar" error={errors.memberId}>
          {(p) => (
            <Select {...p} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Pilih anggota…</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <Field label="Tanggal" error={errors.transactionDate}>
        {(p) => (
          <Input
            {...p}
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        )}
      </Field>

      <Field label="Keterangan (boleh kosong)" error={errors.note}>
        {(p) => (
          <Input
            {...p}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Mis. beli konsumsi rapat"
          />
        )}
      </Field>

      {activities.length > 0 && (
        <Field label="Terkait kegiatan (boleh kosong)">
          {(p) => (
            <Select {...p} value={activityId} onChange={(e) => setActivityId(e.target.value)}>
              <option value="">Tidak terkait kegiatan</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <div>
        <p className="mb-1.5 text-sm font-bold">Foto nota (boleh kosong)</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          id="nota"
          onChange={(e) => onPickFile(e.target.files?.[0])}
        />
        {receipt && receiptUrl ? (
          <div className="lembar flex items-center gap-3 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau blob lokal */}
            <img
              src={receiptUrl}
              alt="Pratinjau nota"
              className="size-20 rounded-sm object-cover"
            />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold">Nota siap</p>
              <p className="text-tinta-pudar">
                {Math.round(receipt.size / 1024)} KB, diunggah saat online
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              aria-label="Hapus foto nota"
              className="grid size-12 place-items-center rounded-md text-tinta-pudar hover:bg-pulpen-50"
            >
              <IconX className="size-5" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="nota"
            className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-garis-kuat bg-lembar font-bold hover:bg-pulpen-50 has-[:focus-visible]:outline-3"
          >
            {receiptBusy ? (
              <span className="pemutar" aria-hidden />
            ) : (
              <IconCamera className="size-5 text-pulpen-600" />
            )}
            {receiptBusy ? "Memproses foto…" : "Ambil foto nota"}
          </label>
        )}
      </div>

      <div className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] -mx-4 flex gap-2 border-t border-garis bg-kertas/95 px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
        <Button variant="secondary" size="lg" onClick={() => router.back()} disabled={saving}>
          Batal
        </Button>
        <Button
          type="submit"
          size="lg"
          variant={type === "pengeluaran" ? "danger" : "primary"}
          className="min-w-0 flex-1 px-3 text-base"
          loading={saving}
          disabled={receiptBusy}
        >
          {saving
            ? "Menyimpan…"
            : amount
              ? `Simpan ${type === "pemasukan" ? "+" : "−"} ${formatRupiah(amount)}`
              : "Simpan"}
        </Button>
      </div>
    </form>
  );
}

export default function CatatKasPage() {
  return (
    <>
      <PageHeader
        title="Catat transaksi"
        subtitle="Tersimpan di HP dulu, terkirim saat ada internet."
        back={{ href: "/kas", label: "Kas" }}
      />
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <Form />
      </Suspense>
    </>
  );
}
