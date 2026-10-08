"use client";

import { useSyncExternalStore } from "react";
import { getSession, SESSION_EVENT, type Session } from "./session";

function subscribe(cb: () => void) {
  window.addEventListener(SESSION_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(SESSION_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** undefined = belum tahu (render server / sebelum hidrasi), null = belum masuk. */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribe, getSession, () => undefined);
}
