"use client";

import { canWrite, type SyncEntity, type SyncOp } from "./permissions";
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
    can: (entity: SyncEntity, op: SyncOp = "create") =>
      !!user && !readOnly && canWrite(user.role, entity, op),
  };
}
