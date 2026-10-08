import type { Role } from "./permissions";

/**
 * Sesi di perangkat. Token asli ada di cookie httpOnly (30 hari) yang dipakai server;
 * salinan ini membuat aplikasi tetap bisa dibuka dan dibaca saat offline.
 * Berkas ini tidak mengimpor React supaya aman dipakai di service worker.
 */
export type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: Role;
  memberId: string | null;
  organizationId: string;
};

export type Session = { user: SessionUser; expiresAt: number };

const KEY = "perdana.session";
export const SESSION_EVENT = "perdana:session";

let cachedRaw: string | null | undefined;
let cached: Session | null = null;

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // mis. di service worker atau mode privat
  }
}

function notify() {
  try {
    window.dispatchEvent(new Event(SESSION_EVENT));
  } catch {
    /* bukan di jendela */
  }
}

export function getSession(): Session | null {
  const raw = readRaw();
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    cached = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function saveSession(s: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* penyimpanan tidak tersedia */
  }
  notify();
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
  notify();
}

/** Dipanggil saat server menjawab 401: sesi dianggap kedaluwarsa => mode baca saja. */
export function markSessionExpired(): void {
  const s = getSession();
  if (s && s.expiresAt !== 0) saveSession({ ...s, expiresAt: 0 });
}

export const isExpired = (s: Session) => s.expiresAt <= Date.now();
