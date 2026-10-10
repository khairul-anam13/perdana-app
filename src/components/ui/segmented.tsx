"use client";

import { useId } from "react";

/** Pilihan satu dari beberapa (radio) berbentuk tombol besar. */
export function Segmented<T extends string>({
  label,
  hideLabel,
  options,
  value,
  onChange,
  tones,
  disabled,
}: {
  label: string;
  /** label tetap dibaca pembaca layar, tapi tidak memakan tempat */
  hideLabel?: boolean;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** kelas warna saat terpilih per opsi; default tinta pulpen */
  tones?: Partial<Record<T, string>>;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0 disabled:opacity-50">
      <legend className={hideLabel ? "sr-only" : "mb-1.5 text-sm font-bold"}>{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-md border border-garis-kuat bg-lembar p-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <label
              key={o.value}
              className={`grid min-h-11 cursor-pointer place-items-center rounded-sm px-2 text-center text-sm font-bold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-pulpen-600 ${
                active
                  ? (tones?.[o.value] ?? "bg-pulpen-600 text-white")
                  : "text-tinta-pudar hover:bg-pulpen-50 active:bg-pulpen-100"
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
