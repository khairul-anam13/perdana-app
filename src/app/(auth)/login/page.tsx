"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { BrandMark } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { IconEye, IconEyeOff, IconOffline } from "@/components/ui/icons";
import { login } from "@/lib/auth/client";
import { isExpired } from "@/lib/auth/session";
import { useSession } from "@/lib/auth/use-session";
import { syncNow } from "@/lib/sync/engine";
import { useOnline } from "@/lib/sync/use-sync-info";

/** Lipatan sawah berundak sebagai latar kepala halaman masuk. */
function Terraces() {
  return (
    <svg
      viewBox="0 0 400 120"
      preserveAspectRatio="none"
      className="absolute inset-x-0 bottom-0 h-24 w-full"
      aria-hidden="true"
    >
      <path d="M0 40q50-18 100 0t100 0 100 0 100 0v80H0Z" fill="#22663a" />
      <path d="M0 62q50-18 100 0t100 0 100 0 100 0v58H0Z" fill="#1a522f" />
      <path
        d="M0 62q50-18 100 0t100 0 100 0 100 0"
        fill="none"
        stroke="#f4cd55"
        strokeWidth="2"
        opacity=".8"
      />
      <path d="M0 86q50-18 100 0t100 0 100 0 100 0v34H0Z" fill="#143f25" />
      <path d="M0 108q50-14 100 0t100 0 100 0 100 0v12H0Z" fill="#0e2c1a" />
    </svg>
  );
}

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
      <div className="relative overflow-hidden bg-daun-800 px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-28 text-white">
        <BrandMark className="size-14" />
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Perdana</h1>
        <p className="mt-1.5 max-w-64 text-daun-100">
          Kas, anggota, dan kegiatan Karang Taruna. Tetap jalan tanpa sinyal.
        </p>
        <Terraces />
      </div>

      <form
        onSubmit={onSubmit}
        className="-mt-6 flex flex-1 flex-col gap-4 rounded-t-3xl bg-kapur px-6 pt-7 pb-10"
        noValidate
      >
        <h2 className="text-xl font-bold tracking-tight">Masuk</h2>

        {!online && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-padi-100 p-3 text-sm text-padi-800"
          >
            <IconOffline className="mt-0.5 size-5 shrink-0" />
            Masuk pertama kali butuh internet. Setelah itu aplikasi bisa dipakai tanpa internet.
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
                className="pr-14 tracking-[0.3em]"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-tinta-lembut"
              >
                {showPin ? <IconEyeOff className="size-5" /> : <IconEye className="size-5" />}
              </button>
            </div>
          )}
        </Field>

        {error && (
          <p role="alert" className="rounded-xl bg-bata-50 p-3 text-sm font-medium text-bata-700">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" block disabled={busy}>
          {step === "masuk" ? "Memeriksa…" : step === "unduh" ? "Mengunduh data…" : "Masuk"}
        </Button>

        <p className="text-center text-sm text-tinta-lembut">
          Lupa PIN? Minta Ketua mengatur ulang PIN Anda.
        </p>
      </form>
    </main>
  );
}
