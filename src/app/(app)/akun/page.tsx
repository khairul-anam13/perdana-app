"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { InstallHint } from "@/components/app/install-hint";
import { useSyncSummary } from "@/components/app/sync-chip";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { IconLogout, IconSync, IconUsers } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { logout } from "@/lib/auth/client";
import { canManageUsers, ROLE_LABEL } from "@/lib/auth/permissions";
import { usePerm } from "@/lib/auth/use-perm";
import { db, getMeta, type OutboxItem } from "@/lib/db/local";
import { formatRupiah } from "@/lib/format/rupiah";
import { formatWaktu } from "@/lib/format/tanggal";
import { discardRejected, syncNow } from "@/lib/sync/engine";
import { ATTENDANCE_LABEL } from "@/features/kegiatan/schema";

const ENTITY_LABEL = {
  member: "Anggota",
  activity: "Kegiatan",
  attendance: "Absensi",
  transaction: "Transaksi kas",
} as const;
const OP_LABEL = { create: "baru", update: "diubah", delete: "dihapus" } as const;

/** Ringkasan satu perubahan di antrean, dalam bahasa awam. */
function describe(i: OutboxItem): string {
  const p = i.payload as Record<string, unknown>;
  switch (i.entity) {
    case "member":
      return String(p.fullName ?? "");
    case "activity":
      return String(p.title ?? "");
    case "attendance":
      return ATTENDANCE_LABEL[p.status as keyof typeof ATTENDANCE_LABEL] ?? "";
    case "transaction":
      return `${String(p.category ?? "")} ${formatRupiah(Number(p.amount ?? 0))}`;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-tinta-lembut">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

export default function AkunPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = usePerm();
  const s = useSyncSummary();
  const org = useLiveQuery(() => getMeta<{ name: string; village: string }>("organization"), []);
  const attention = useLiveQuery(
    async () =>
      (await db.outbox.toArray())
        .filter((i) => i.status === "ditolak" || i.lastError)
        .sort((a, b) => a.id.localeCompare(b.id)),
    [],
    [] as OutboxItem[],
  );
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null));
  }, []);

  if (!user) return null;

  async function doSync() {
    const out = await syncNow({ manual: true });
    if (out.ok) toast.show("Sinkronisasi selesai");
    else toast.show(out.error ?? "Sinkronisasi gagal", "error");
  }

  return (
    <>
      <PageHeader module="akun" title="Akun" />
      <div className="flex flex-col gap-5">
        <section
          className="flex items-center gap-4 rounded-3xl bg-white p-4 ring-1 ring-garis"
          aria-label="Profil"
        >
          <span
            aria-hidden
            className="grid size-14 shrink-0 place-items-center rounded-full bg-daun-700 text-xl font-bold text-white"
          >
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{user.name}</p>
            <p className="truncate text-sm text-tinta-lembut">
              @{user.username}
              {org ? ` · ${org.name}` : ""}
            </p>
            <div className="mt-1.5">
              <Badge tone="daun">{ROLE_LABEL[user.role]}</Badge>
            </div>
          </div>
        </section>

        <section
          id="sinkron"
          aria-label="Sinkronisasi"
          className="scroll-mt-20 rounded-3xl bg-white p-4 ring-1 ring-garis"
        >
          <h2 className="mb-1 text-lg font-bold tracking-tight">Sinkronisasi</h2>
          <p className="text-sm text-tinta-lembut">
            Data disimpan di HP dulu, lalu dikirim ke server saat ada internet.
          </p>
          <dl className="mt-2 divide-y divide-garis">
            <Row label="Koneksi">{s.online ? "Online" : "Offline"}</Row>
            <Row label="Menunggu dikirim">{s.pending} data</Row>
            {s.receiptsPending > 0 && (
              <Row label="Nota menunggu unggah">{s.receiptsPending} foto</Row>
            )}
            <Row label="Terakhir sinkron">
              {s.lastSyncAt ? formatWaktu(s.lastSyncAt) : "Belum pernah"}
            </Row>
          </dl>
          {s.lastError && !s.syncing && (
            <p
              role="alert"
              className="mt-2 rounded-xl bg-bata-50 p-3 text-sm font-medium text-bata-700"
            >
              {s.lastError.replace(/\.$/, "")}. Data tetap aman di HP dan akan dicoba lagi otomatis.
            </p>
          )}
          <Button onClick={doSync} disabled={s.syncing || !s.online} block className="mt-3">
            <IconSync className={`size-5 ${s.syncing ? "animate-spin-slow" : ""}`} />
            {s.syncing ? "Menyinkronkan…" : "Sinkronkan sekarang"}
          </Button>

          {attention.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 font-semibold">Perlu perhatian</h3>
              <ul className="flex flex-col gap-2">
                {attention.map((i) => (
                  <li key={i.id} className="rounded-2xl bg-bata-50 p-3 ring-1 ring-bata-100">
                    <p className="text-sm font-semibold">
                      {ENTITY_LABEL[i.entity]} {OP_LABEL[i.op]}: {describe(i)}
                    </p>
                    <p className="mt-0.5 text-sm text-bata-700">{i.lastError}</p>
                    {i.status === "ditolak" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={() => discardRejected(i)}
                      >
                        Buang perubahan ini
                      </Button>
                    ) : (
                      <p className="mt-0.5 text-xs text-tinta-lembut">
                        Dicoba {i.attempts}×, akan diulang otomatis.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-label="Penyimpanan" className="rounded-3xl bg-white p-4 ring-1 ring-garis">
          <h2 className="mb-1 text-lg font-bold tracking-tight">Penyimpanan di HP</h2>
          <p className="text-sm text-tinta-lembut">
            Penyimpanan permanen mencegah browser menghapus data offline saat memori HP penuh.
          </p>
          <p className="mt-2 font-semibold">
            {persisted === null ? "Tidak diketahui" : persisted ? "Aktif" : "Belum aktif"}
          </p>
          {persisted === false && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={async () =>
                setPersisted(await (navigator.storage?.persist?.() ?? Promise.resolve(false)))
              }
            >
              Aktifkan penyimpanan permanen
            </Button>
          )}
        </section>

        <InstallHint />

        {canManageUsers(user.role) && (
          <ButtonLink href="/akun/pengguna" variant="secondary" size="lg">
            <IconUsers className="size-5" /> Kelola pengguna
          </ButtonLink>
        )}

        {confirmLogout ? (
          <div className="rounded-3xl bg-bata-50 p-4 ring-1 ring-bata-100">
            <p className="font-semibold text-bata-700">Keluar dari akun?</p>
            <p className="mt-1 text-sm text-tinta-lembut">
              {s.waiting > 0
                ? `Ada ${s.waiting} data yang belum terkirim. Data tetap aman di HP dan terkirim saat Anda masuk lagi dengan akun yang sama.`
                : "Data di HP tetap tersimpan. Masuk lagi butuh internet."}
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => setConfirmLogout(false)}>
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await logout();
                  router.replace("/login");
                }}
              >
                Ya, keluar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setConfirmLogout(true)}
            className="text-bata-700"
          >
            <IconLogout className="size-5" /> Keluar
          </Button>
        )}
      </div>
    </>
  );
}
