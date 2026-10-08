"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconAndroid, IconApple, IconDownload, IconShare } from "@/components/ui/icons";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
type Mode = "ios" | "android" | null;

const DISMISS_KEY = "perdana.installDismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Ajakan memasang aplikasi ke layar utama.
 * Android/Chrome: tombol pasang. iPhone (Safari): petunjuk Bagikan -> Tambah ke Layar Utama
 * (penting juga agar penyimpanan data offline lebih awet di iOS).
 */
export function InstallHint({ dismissible = false }: { dismissible?: boolean }) {
  const [mode, setMode] = useState<Mode>(null);
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (dismissible && localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* abaikan */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deteksi perangkat hanya mungkin di klien
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) setMode("ios");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [dismissible]);

  if (!mode || hidden) return null;

  function dismiss() {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* abaikan */
    }
  }

  return (
    <section
      aria-label="Pasang aplikasi"
      className="rounded-3xl bg-padi-100 p-4 ring-1 ring-padi-200"
    >
      <h2 className="flex items-center gap-2 font-semibold text-padi-800">
        {mode === "ios" ? <IconApple className="size-5" /> : <IconAndroid className="size-5" />}
        Pasang Perdana di layar utama
      </h2>
      {mode === "ios" ? (
        <p className="mt-1 text-sm text-padi-800">
          Di iPhone: ketuk tombol <IconShare className="mx-0.5 inline size-4 align-text-bottom" />{" "}
          <b>Bagikan</b> di Safari, lalu pilih <b>Tambah ke Layar Utama</b>. Data offline jadi lebih
          awet.
        </p>
      ) : (
        <p className="mt-1 text-sm text-padi-800">
          Pasang supaya terbuka seperti aplikasi biasa dan bisa dipakai tanpa internet.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        {mode === "android" && event && (
          <Button
            variant="padi"
            className="bg-padi-400 hover:bg-padi-300"
            onClick={async () => {
              await event.prompt();
              await event.userChoice;
              setEvent(null);
              setMode(null);
            }}
          >
            <IconDownload className="size-5" /> Pasang aplikasi
          </Button>
        )}
        {dismissible && (
          <Button variant="ghost" onClick={dismiss} className="text-padi-800">
            Nanti saja
          </Button>
        )}
      </div>
    </section>
  );
}
