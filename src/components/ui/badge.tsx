import type { ReactNode } from "react";

export type Tone = "netral" | "pulpen" | "stempel" | "stabilo" | "merah";

/** Satu warna satu arti: stempel = sah, stabilo = perlu perhatian, merah = masalah. */
const tones: Record<Tone, string> = {
  netral: "bg-kertas text-tinta-pudar ring-1 ring-garis",
  pulpen: "bg-pulpen-100 text-pulpen-700",
  stempel: "bg-stempel-100 text-stempel-700",
  stabilo: "bg-stabilo-300 text-tinta",
  merah: "bg-merah-100 text-merah-700",
};

export function Badge({ tone = "netral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-bold whitespace-nowrap ios:rounded-full ios:px-2.5 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
