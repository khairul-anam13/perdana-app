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
        <span className="animate-pulse text-tinta-lembut">Membuka Perdana…</span>
      </div>
    );
  }

  const expired = isExpired(session);

  return (
    <div className="min-h-dvh md:pl-60">
      <header className="sticky top-0 z-30 border-b border-garis bg-kapur/90 pt-[env(safe-area-inset-top)] backdrop-blur md:fixed md:inset-x-auto md:left-0 md:z-50 md:w-60 md:border-b-0 md:bg-transparent md:backdrop-blur-none">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2.5 md:max-w-none md:flex-col md:items-start md:py-4">
          <div className="min-w-0">
            <Wordmark />
            {org && (
              <p className="mt-0.5 hidden max-w-52 truncate pl-[2.875rem] text-sm text-tinta-lembut md:block">
                {org.name}
              </p>
            )}
          </div>
          <SyncChip />
        </div>
      </header>

      {expired && (
        <div role="alert" className="border-b border-bata-100 bg-bata-50">
          <div className="mx-auto flex max-w-2xl items-start gap-3 px-4 py-3">
            <IconWarning className="mt-0.5 size-5 shrink-0 text-bata-600" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-bata-700">Sesi habis, mode baca saja</p>
              <p className="text-tinta-lembut">
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

      <main className="mx-auto w-full max-w-2xl px-4 pb-32 md:pt-4 md:pb-12">{children}</main>
      <BottomNav />
    </div>
  );
}
