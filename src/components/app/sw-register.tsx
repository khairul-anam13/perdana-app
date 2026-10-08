"use client";

import { useEffect } from "react";

/** Daftarkan service worker (hanya produksi; di dev dimatikan agar tidak menyimpan cache lama). */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* tanpa service worker aplikasi tetap jalan online */
    });
  }, []);
  return null;
}
