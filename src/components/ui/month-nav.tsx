"use client";

import { formatBulan, monthKey, shiftMonth, todayISO } from "@/lib/format/tanggal";
import { IconChevronLeft, IconChevronRight } from "./icons";

/** Pemilih bulan dengan tombol sebelumnya/berikutnya. Nilai: "2026-10". */
export function MonthNav({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isNow = value === monthKey(todayISO());
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-white p-1.5 ring-1 ring-garis">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, -1))}
        aria-label="Bulan sebelumnya"
        className="grid size-11 place-items-center rounded-xl text-tinta hover:bg-daun-50"
      >
        <IconChevronLeft />
      </button>
      <button
        type="button"
        onClick={() => onChange(monthKey(todayISO()))}
        disabled={isNow}
        aria-label={isNow ? undefined : "Kembali ke bulan ini"}
        className="min-h-11 flex-1 rounded-xl px-2 text-center font-semibold"
      >
        {formatBulan(value)}
      </button>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(value, 1))}
        aria-label="Bulan berikutnya"
        className="grid size-11 place-items-center rounded-xl text-tinta hover:bg-daun-50"
      >
        <IconChevronRight />
      </button>
    </div>
  );
}
