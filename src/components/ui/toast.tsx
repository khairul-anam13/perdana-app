"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isSynced } from "@/lib/sync/outbox";
import { onSyncDone } from "@/lib/sync/status";
import { IconCheck, IconSync, IconWarning } from "./icons";

type Tone = "ok" | "pending" | "error";
type ToastItem = { id: number; text: string; tone: Tone };

type ToastApi = {
  show: (text: string, tone?: Tone, ms?: number) => number;
  update: (id: number, text: string, tone?: Tone) => void;
  /** Umpan balik simpan: "Tersimpan di HP, menunggu sinkronisasi" lalu berubah jadi "Tersimpan dan tersinkron". */
  saved: (changeIds: string[]) => void;
};

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast harus di dalam ToastProvider");
  return c;
}

const toneStyle: Record<Tone, string> = {
  ok: "border-stempel-600 bg-sampul text-white",
  pending: "border-stabilo-300 bg-sampul text-white",
  error: "border-merah-600 bg-merah-50 text-merah-700",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const arm = useCallback(
    (id: number, ms: number) => {
      clearTimeout(timers.current.get(id));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ms),
      );
    },
    [dismiss],
  );

  const show = useCallback<ToastApi["show"]>(
    (text, tone = "ok", ms = tone === "error" ? 8000 : 4500) => {
      const id = nextId.current++;
      setItems((xs) => [...xs.slice(-2), { id, text, tone }]);
      arm(id, ms);
      return id;
    },
    [arm],
  );

  const update = useCallback<ToastApi["update"]>(
    (id, text, tone = "ok") => {
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, text, tone } : x)));
      arm(id, 3500);
    },
    [arm],
  );

  const saved = useCallback<ToastApi["saved"]>(
    (changeIds) => {
      const id = show("Tersimpan di HP, menunggu sinkronisasi", "pending", 12000);
      const off = onSyncDone(async () => {
        const all = await Promise.all(changeIds.map(isSynced));
        if (all.every(Boolean)) {
          update(id, "Tersimpan dan tersinkron", "ok");
          off();
        }
      });
      setTimeout(off, 90_000);
    },
    [show, update],
  );

  const api = useMemo(() => ({ show, update, saved }), [show, update, saved]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex max-w-md animate-toast-in items-center gap-2.5 rounded-md border-l-[6px] px-4 py-3 text-sm font-bold shadow-angkat ${toneStyle[t.tone]}`}
          >
            {t.tone === "ok" ? (
              <IconCheck className="size-5 shrink-0 text-stempel-100" />
            ) : t.tone === "pending" ? (
              <IconSync className="size-5 shrink-0 text-stabilo-300" />
            ) : (
              <IconWarning className="size-5 shrink-0" />
            )}
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
