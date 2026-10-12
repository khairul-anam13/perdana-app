"use client";

import type { ReactNode } from "react";
import { BrandMark, Kawung } from "@/components/app/brand";
import { IconArrowDown, IconArrowUp, IconEye, IconEyeOff } from "@/components/ui/icons";
import { usePref, writePref } from "@/lib/prefs";
import { formatRupiah } from "@/lib/format/rupiah";

const SEMBUNYI_KEY = "saldoSembunyi";

function Arus({
  icon,
  label,
  value,
  hidden,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hidden: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-sm text-white/90">
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full bg-white/15 text-white"
        >
          {icon}
        </span>
        {label}
      </p>
      <p className="mt-1 truncate text-[1.05rem] font-bold">{hidden ? "••••••" : value}</p>
    </div>
  );
}

/**
 * Kartu saldo ala aplikasi dompet/bank: lencana organisasi, saldo besar yang bisa disembunyikan,
 * dan arus masuk/keluar bulan berjalan. Folio = sampul buku kas bermotif kawung; iOS = kartu biru.
 */
export function SaldoKartu({
  balance,
  income,
  expense,
  orgName,
}: {
  balance: number;
  income: number;
  expense: number;
  orgName?: string;
}) {
  const hidden = usePref(SEMBUNYI_KEY, "0") === "1";
  return (
    <section aria-label="Saldo kas" className="kartu-saldo relative overflow-hidden p-5">
      <Kawung className="opacity-70" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white">
            <BrandMark className="h-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white/80">Saldo kas</p>
            <p className="leading-tight font-bold">{orgName ?? "Karang Taruna"}</p>
          </div>
          <button
            type="button"
            aria-pressed={hidden}
            aria-label={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
            onClick={() => writePref(SEMBUNYI_KEY, hidden ? "0" : "1")}
            className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-white hover:bg-white/15 active:bg-white/25"
          >
            {hidden ? <IconEyeOff className="size-5" /> : <IconEye className="size-5" />}
          </button>
        </div>

        <p
          className="mt-6 truncate font-display text-[2.35rem] leading-none font-bold"
          aria-label={hidden ? "Saldo disembunyikan" : undefined}
        >
          {hidden ? "Rp ••••••" : formatRupiah(balance)}
        </p>

        <div className="mt-5 border-t border-white/20 pt-3">
          <p className="mb-2 text-xs text-white/80">Bulan ini</p>
          <div className="grid grid-cols-2 gap-3">
            <Arus
              icon={<IconArrowDown className="size-3" />}
              label="Masuk"
              value={formatRupiah(income)}
              hidden={hidden}
            />
            <Arus
              icon={<IconArrowUp className="size-3" />}
              label="Keluar"
              value={formatRupiah(expense)}
              hidden={hidden}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
