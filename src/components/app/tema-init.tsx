"use client";

import { useEffect } from "react";
import { useTema } from "@/lib/use-tema";
import { terapkanTema } from "@/lib/tema";

/** Menyamakan <html data-tema> dan warna bilah browser dengan pilihan tersimpan (juga saat tab lain mengubahnya). */
export function TemaInit() {
  const [tema] = useTema();
  useEffect(() => terapkanTema(tema), [tema]);
  return null;
}
