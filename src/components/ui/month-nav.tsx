"use client";

import { formatBulan, monthKey, shiftMonth, todayISO } from "@/lib/format/tanggal";
import { IconChevronLeft, IconChevronRight } from "./icons";

const arrow =
  "grid size-12 place-items-center rounded-md text-tinta hover:bg-pulpen-50 active:bg-pulpen-100";

/** Pemilih bulan: seperti membalik halaman buku. Nilai: "2026-10". */
export function MonthNav({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isNow = value === monthKey(todayISO());
  return (
    <div className="flex items-center justify-between gap-1 border-y border-garis">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, -1))}
        aria-label="Bulan sebelumnya"
        className={arrow}
      >
        <IconChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => onChange(monthKey(todayISO()))}
        disabled={isNow}
        className="min-h-12 flex-1 rounded-md px-2 text-center"
      >
        <span className="block font-display text-lg leading-tight font-bold">
          {formatBulan(value)}
        </span>
        {!isNow && <span className="block text-xs text-pulpen-600">Kembali ke bulan ini</span>}
      </button>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, 1))}
        aria-label="Bulan berikutnya"
        className={arrow}
      >
        <IconChevronRight className="size-5" />
      </button>
    </div>
  );
}
