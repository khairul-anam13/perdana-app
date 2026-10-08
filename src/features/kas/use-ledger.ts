"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { usePendingIds } from "@/lib/sync/use-pending";
import { byIdMap, reversedIds } from "./ledger";
import { listTransactions } from "./repository";
import type { Transaction } from "./schema";

const EMPTY: Transaction[] = [];

/** Seluruh transaksi dari data lokal + turunan yang sering dipakai. `loading` true sampai data terbaca. */
export function useLedger() {
  const rows = useLiveQuery(listTransactions, []);
  const pendingIds = usePendingIds();
  const txs = rows ?? EMPTY;
  const derived = useMemo(() => ({ byId: byIdMap(txs), reversed: reversedIds(txs) }), [txs]);
  return { txs, loading: rows === undefined, pendingIds, ...derived };
}
