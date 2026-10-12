"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getMeta } from "./db/local";

export type Org = {
  id: string;
  name: string;
  village: string;
  subdistrict: string;
  regency: string;
  /** tahun mulai periode kepengurusan; null/tak ada = belum diatur */
  termStart?: number | null;
  /** denda per alpa (Rp); null/tak ada = belum ditetapkan */
  fineAbsent?: number | null;
};

/** Organisasi dari data lokal (diperbarui tiap sinkronisasi). undefined = belum terbaca. */
export const useOrg = (): Org | undefined => useLiveQuery(() => getMeta<Org>("organization"), []);
