"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { BrandMark, Kawung } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { IconEye, IconEyeOff, IconOffline, IconWarning } from "@/components/ui/icons";
import { login } from "@/lib/auth/client";
import { isExpired } from "@/lib/auth/session";
import { useSession } from "@/lib/auth/use-session";
import { syncNow } from "@/lib/sync/engine";
import { useOnline } from "@/lib/sync/use-sync-info";

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const online = useOnline();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "masuk" | "unduh">("form");

  // Sudah punya sesi aktif: langsung ke beranda.
  useEffect(() => {
    if (session && !isExpired(session) && step === "form") router.replace("/beranda");
  }, [session, step, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim()) return setError("Isi username Anda.");
    if (!/^\d{6}$/.test(pin)) return setError("PIN harus 6 angka.");
    setStep("masuk");
    try {
      await login(username, pin);
      setStep("unduh");
      await syncNow({ manual: true }); // unduh data pertama; bila gagal, aplikasi tetap terbuka
      router.replace("/beranda");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk. Coba lagi.");
      setStep("form");
    }
  }

  const busy = step !== "form";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      {/* Sampul buku folio: punggung kain merah, motif kawung, label putih bergaris. */}
      <div className="relative overflow-hidden border-l-[14px] border-merah-600 bg-sampul px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10">
        <Kawung />
        <div className="relative flex items-center gap-4 rounded-sm bg-lembar px-5 py-4 shadow-angkat">
          <BrandMark className="h-20" />
          <div className="min-w-0 flex-1">
            <h1 className="border-b-2 border-pulpen-600 pb-1 font-display text-4xl font-black text-tinta">
              Perdana
            </h1>
            <p className="mt-2 border-b border-garis pb-1.5 text-sm text-tinta">
              Karang Taruna Blorong
            </p>
            <p className="mt-1.5 border-b border-garis pb-1.5 text-sm text-tinta-pudar">
              Kas, anggota, kegiatan
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 px-6 pt-6 pb-10" noValidate>
        <h2 className="font-display text-xl font-bold">Masuk</h2>

        {!online && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border-l-[6px] border-stabilo-300 bg-stabilo-100 p-3 text-sm"
          >
            <IconOffline className="mt-0.5 size-5" />
            HP sedang offline. Masuk pertama kali butuh internet; setelah itu aplikasi bisa dipakai
            tanpa internet.
          </p>
        )}

        <Field label="Username">
          {(p) => (
            <Input
              {...p}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy}
            />
          )}
        </Field>

        <Field label="PIN (6 angka)">
          {(p) => (
            <div className="relative">
              <Input
                {...p}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoComplete="current-password"
                className="pr-14! text-xl! font-bold tracking-[0.3em]"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                aria-pressed={showPin}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-md text-tinta-pudar -outline-offset-2 hover:text-tinta"
              >
                {showPin ? <IconEyeOff className="size-5" /> : <IconEye className="size-5" />}
              </button>
            </div>
          )}
        </Field>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border-l-[6px] border-merah-600 bg-merah-50 p-3 text-sm font-bold text-merah-700"
          >
            <IconWarning className="mt-0.5 size-4" />
            {error}
          </p>
        )}

        <Button type="submit" size="lg" block loading={busy}>
          {step === "masuk" ? "Memeriksa…" : step === "unduh" ? "Mengunduh data…" : "Masuk"}
        </Button>

        <p className="text-center text-sm text-tinta-pudar">
          Lupa PIN? Minta Ketua mengatur ulang PIN Anda.
        </p>
      </form>
    </main>
  );
}
