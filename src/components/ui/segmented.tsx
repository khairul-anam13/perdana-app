"use client";

import { useId } from "react";

/** Pilihan satu dari beberapa (radio) berbentuk tombol besar. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  tones,
  disabled,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** kelas warna saat terpilih per opsi; default hijau */
  tones?: Partial<Record<T, string>>;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1.5 rounded-2xl bg-garis/60 p-1.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <label
              key={o.value}
              className={`grid min-h-11 cursor-pointer place-items-center rounded-xl px-2 text-center text-sm font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-air-600 ${
                active
                  ? (tones?.[o.value] ?? "bg-daun-700 text-white shadow-sm")
                  : "text-tinta-lembut hover:bg-white/60"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={active}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
