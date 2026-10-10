"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { logout } from "@/lib/auth/client";
import { isExpired } from "@/lib/auth/session";
import { useSession } from "@/lib/auth/use-session";
import { getMeta } from "@/lib/db/local";
import { syncNow } from "@/lib/sync/engine";
import { BottomNav } from "./bottom-nav";
import { Wordmark } from "./brand";
import { SyncChip } from "./sync-chip";
import { Button } from "@/components/ui/button";
import { IconWarning } from "@/components/ui/icons";

type Org = { name: string; village: string };

/** Pemicu sinkronisasi: aplikasi dibuka, kembali online, tab aktif lagi, dan berkala. */
function useSyncTriggers(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    void syncNow();
    const onOnline = () => void syncNow({ manual: true }); // sinyal kembali: abaikan jeda backoff
    const onVisible = () => document.visibilityState === "visible" && void syncNow();
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => void syncNow(), 60_000);
    void navigator.storage?.persist?.();
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [enabled]);
}

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const org = useLiveQuery(() => getMeta<Org>("organization"), []);

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  useSyncTriggers(!!session);

  if (!session) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <span className="animate-pulse text-tinta-pudar">Membuka Perdana…</span>
      </div>
    );
  }

  const expired = isExpired(session);

  return (
    <div className="min-h-dvh md:pl-60">
      <header className="di-sampul sticky top-0 z-30 border-b border-garis bg-kertas/95 pt-[env(safe-area-inset-top)] md:fixed md:inset-x-auto md:left-2 md:z-50 md:w-58 md:border-b-0 md:bg-transparent">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-1.5 md:max-w-none md:flex-col md:items-start md:py-5">
          <div className="min-w-0">
            <Wordmark className="md:text-white" />
            {org && (
              <p className="mt-1 hidden max-w-52 truncate text-sm text-pulpen-100 md:block">
                {org.name}
              </p>
            )}
          </div>
          <SyncChip />
        </div>
      </header>

      {expired && (
        <div role="alert" className="border-b-2 border-merah-600 bg-merah-50">
          <div className="mx-auto flex max-w-2xl items-start gap-3 px-4 py-3">
            <IconWarning className="mt-0.5 size-5 shrink-0 text-merah-600" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold text-merah-700">Sesi habis, mode baca saja</p>
              <p className="text-tinta-pudar">
                Anda masih bisa melihat data. Data yang belum terkirim tetap aman di HP. Masuk lagi
                saat ada internet.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              Masuk lagi
            </Button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-2xl px-4 pb-36 md:pt-4 md:pb-12">{children}</main>
      <BottomNav />
    </div>
  );
}
