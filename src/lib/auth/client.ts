import { db, getMeta, setMeta, wipeLocalData } from "../db/local";
import { clearSession, saveSession, type SessionUser } from "./session";

/**
 * Masuk. Login pertama butuh internet; setelah itu sesi tersimpan di perangkat (30 hari).
 * Data lokal milik akun lain dilindungi: jika masih ada antrean yang belum terkirim, login akun lain ditolak
 * (supaya perubahan akun A tidak terkirim memakai sesi akun B).
 */
export async function login(usernameRaw: string, pin: string): Promise<SessionUser> {
  const username = usernameRaw.trim().toLowerCase();
  if (!navigator.onLine)
    throw new Error("Masuk pertama kali butuh internet. Sambungkan HP ke internet lalu coba lagi.");

  const owner = await getMeta<string>("ownerUsername");
  if (owner && owner !== username) {
    const pending = await db.outbox.where("status").equals("menunggu").count();
    if (pending > 0)
      throw new Error(
        `Masih ada ${pending} data dari akun "${owner}" yang belum terkirim. Masuk dengan akun itu dulu sampai datanya tersinkron.`,
      );
  }

  let res: Response;
  try {
    res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, pin }),
    });
  } catch {
    throw new Error("Tidak bisa terhubung ke server. Periksa internet Anda.");
  }
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    user?: SessionUser;
    expiresAt?: number;
  };
  if (!res.ok || !data.user || !data.expiresAt)
    throw new Error(data.error ?? "Gagal masuk. Coba lagi.");

  const ownerId = await getMeta<string>("ownerId");
  if (ownerId && ownerId !== data.user.id) await wipeLocalData(); // akun berbeda, tidak ada antrean tertunda
  await setMeta("ownerId", data.user.id);
  await setMeta("ownerUsername", username);

  saveSession({ user: data.user, expiresAt: data.expiresAt });
  void navigator.storage?.persist?.(); // minta penyimpanan permanen agar data tidak dibersihkan browser
  return data.user;
}

/** Keluar. Data lokal (termasuk antrean) TIDAK dihapus, supaya tidak ada data yang hilang. */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* offline: cukup hapus sesi di perangkat */
  }
  clearSession();
}
