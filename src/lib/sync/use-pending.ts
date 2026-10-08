"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/local";

const NONE = new Set<string>();

/** ID baris yang perubahannya masih menunggu dikirim ke server. */
export function usePendingIds(): Set<string> {
  return (
    useLiveQuery(
      async () =>
        new Set(
          (await db.outbox.where("status").equals("menunggu").toArray()).map((i) => i.entityId),
        ),
      [],
    ) ?? NONE
  );
}
