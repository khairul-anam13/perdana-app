"use client";

import { canWrite, seksiKategori, type SyncEntity, type SyncOp } from "./permissions";
import { isExpired } from "./session";
import { useSession } from "./use-session";

/** Hak akses untuk UI. Hanya menyembunyikan tombol; penegakan sebenarnya ada di server. */
export function usePerm() {
  const session = useSession();
  const user = session?.user ?? null;
  const readOnly = !session || isExpired(session);
  return {
    user,
    readOnly,
    /** Kategori tunggal yang boleh dicatat peran Seksi; undefined untuk peran lain. */
    seksiKategori: user ? seksiKategori(user.role) : undefined,
    can: (entity: SyncEntity, op: SyncOp = "create") =>
      !!user && !readOnly && canWrite(user.role, entity, op),
  };
}
