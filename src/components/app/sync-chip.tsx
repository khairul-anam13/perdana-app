"use client";

import Link from "next/link";
import { timeAgo } from "@/lib/format/tanggal";
import { useSyncInfo } from "@/lib/sync/use-sync-info";
import { IconCheck, IconOffline, IconSync, IconWarning } from "@/components/ui/icons";

/** Satu kalimat status sinkronisasi + gaya, dipakai di header dan panel Akun. */
export function useSyncSummary() {
  const s = useSyncInfo();
  const waiting = s.pending + s.receiptsPending;
  let tone: "ok" | "wait" | "off" | "err" = "ok";
  let text = s.lastSyncAt ? `Tersinkron ${timeAgo(s.lastSyncAt)}` : "Belum pernah sinkron";
  if (s.syncing) {
    tone = "wait";
    text = "Menyinkronkan…";
  } else if (!s.online) {
    tone = "off";
    text = waiting ? `Offline · ${waiting} menunggu` : "Offline";
  } else if (s.rejected) {
    tone = "err";
    text = `${s.rejected} ditolak server`;
  } else if (s.lastError && waiting) {
    tone = "err";
    text = `Gagal kirim · ${waiting} menunggu`;
  } else if (waiting) {
    tone = "wait";
    text = `${waiting} menunggu dikirim`;
  }
  return { ...s, waiting, tone, text };
}

const toneClass = {
  ok: "bg-daun-100 text-daun-800",
  wait: "bg-padi-100 text-padi-800",
  off: "bg-garis text-tinta",
  err: "bg-bata-100 text-bata-700",
} as const;

export function SyncChip() {
  const { tone, text, syncing } = useSyncSummary();
  const Icon =
    tone === "off"
      ? IconOffline
      : tone === "err"
        ? IconWarning
        : tone === "ok"
          ? IconCheck
          : IconSync;
  return (
    <Link
      href="/akun#sinkron"
      aria-label={`Status sinkronisasi: ${text}. Buka detail.`}
      className={`inline-flex min-h-10 max-w-[60vw] items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${toneClass[tone]}`}
    >
      <Icon className={`size-4 shrink-0 ${syncing ? "animate-spin-slow" : ""}`} />
      <span className="truncate">{text}</span>
    </Link>
  );
}
