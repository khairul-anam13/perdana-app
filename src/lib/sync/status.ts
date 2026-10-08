/** Status sinkronisasi di memori (per konteks: halaman atau service worker). Tanpa React. */
export type SyncState = { syncing: boolean; lastError: string | null };

let state: SyncState = { syncing: false, lastError: null };
const listeners = new Set<() => void>();
const doneListeners = new Set<() => void>();

export const getSyncState = (): SyncState => state;

export function setSyncState(patch: Partial<SyncState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeSyncState(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Dipanggil setiap satu putaran sinkronisasi selesai (berhasil atau gagal). */
export function onSyncDone(cb: () => void): () => void {
  doneListeners.add(cb);
  return () => doneListeners.delete(cb);
}

export const emitSyncDone = () => doneListeners.forEach((l) => l());
