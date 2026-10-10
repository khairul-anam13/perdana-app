"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Pintu masuk. Pengalihan dilakukan di klien agar bekerja juga saat offline. */
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/beranda");
  }, [router]);
  return (
    <div className="grid min-h-dvh place-items-center">
      <span className="animate-pulse text-tinta-pudar">Membuka Perdana…</span>
    </div>
  );
}
