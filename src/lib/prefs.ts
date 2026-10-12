"use client";

import { useSyncExternalStore } from "react";

/** Preferensi per perangkat (localStorage, awalan `perdana.`). Aman bila penyimpanan diblokir. */
const EVENT = "perdana:pref";

export function readPref(key: string, fallback: string): string {
  try {
    return localStorage.getItem(`perdana.${key}`) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: string) {
  try {
    localStorage.setItem(`perdana.${key}`, value);
  } catch {
    /* tanpa penyimpanan, pilihan hanya berlaku sampai halaman ditutup */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Nilai preferensi yang ikut berubah saat ditulis dari mana pun (tab lain juga). */
export function usePref(key: string, fallback: string): string {
  return useSyncExternalStore(
    subscribe,
    () => readPref(key, fallback),
    () => fallback,
  );
}
