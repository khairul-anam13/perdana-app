import type { ReactNode } from "react";

export type Tone = "netral" | "daun" | "padi" | "air" | "terong" | "bata";

const tones: Record<Tone, string> = {
  netral: "bg-garis text-tinta-lembut",
  daun: "bg-daun-100 text-daun-800",
  padi: "bg-padi-100 text-padi-800",
  air: "bg-air-100 text-air-700",
  terong: "bg-terong-100 text-terong-700",
  bata: "bg-bata-100 text-bata-700",
};

export function Badge({ tone = "netral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
