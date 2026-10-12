"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { usePerm } from "@/lib/auth/use-perm";
import { db } from "@/lib/db/local";
import { useOrg } from "@/lib/use-org";
import { useLedger } from "../kas/use-ledger";
import { useLookups } from "../use-lookups";
import { hitungDenda, type BarisDenda } from "./hitung";

/**
 * Denda ketertiban untuk layar. Pengurus melihat semua anggota; anggota biasa hanya dirinya sendiri
 * (daftar penunggak bukan untuk dibaca semua orang).
 */
export function useDenda(): {
  rows: BarisDenda[];
  tarif: number | null;
  sisa: number;
  loading: boolean;
} {
  const { user } = usePerm();
  const org = useOrg();
  const { members, activities, loading } = useLookups();
  const { txs, loading: kasLoading } = useLedger();
  const attendances = useLiveQuery(() => db.attendances.toArray(), []);
  const tarif = org?.fineAbsent ?? null;

  const rows = useMemo(() => {
    const all = hitungDenda({ members, activities, attendances: attendances ?? [], txs, tarif });
    return user?.role === "anggota" ? all.filter((r) => r.member.id === user.memberId) : all;
  }, [members, activities, attendances, txs, tarif, user]);

  return {
    rows,
    tarif,
    sisa: rows.reduce((n, r) => n + r.sisa, 0),
    loading: loading || kasLoading || attendances === undefined || org === undefined,
  };
}
