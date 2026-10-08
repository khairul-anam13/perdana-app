"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useSyncExternalStore } from "react";
import { db, getMeta } from "../db/local";
import { getSyncState, subscribeSyncState } from "./status";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/** Semua yang perlu ditampilkan di indikator sinkronisasi. */
export function useSyncInfo() {
  const online = useOnline();
  const state = useSyncExternalStore(subscribeSyncState, getSyncState, getSyncState);
  const pending = useLiveQuery(() => db.outbox.where("status").equals("menunggu").count(), [], 0);
  const rejected = useLiveQuery(() => db.outbox.where("status").equals("ditolak").count(), [], 0);
  const receiptsPending = useLiveQuery(
    () => db.receipts.where("status").equals("menunggu").count(),
    [],
    0,
  );
  const lastSyncAt = useLiveQuery(() => getMeta<string>("lastSyncAt"), [], undefined);
  return { online, ...state, pending, rejected, receiptsPending, lastSyncAt };
}
