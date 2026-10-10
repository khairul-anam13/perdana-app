"use client";

import { IconWarning } from "./icons";

/** Deretan pilihan cepat (satu terpilih). Lebih cepat dari dropdown untuk daftar pendek. */
export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: readonly T[];
  value: T | "";
  onChange: (v: T) => void;
  error?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} aria-invalid={error ? true : undefined}>
      <p className="mb-1.5 text-sm font-bold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o === value;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o)}
              className={`min-h-11 rounded-md border px-3.5 text-sm font-bold transition-colors ${
                active
                  ? "border-pulpen-600 bg-pulpen-600 text-white"
                  : `bg-lembar text-tinta hover:bg-pulpen-50 active:bg-pulpen-100 ${error ? "border-merah-600" : "border-garis-kuat"}`
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-merah-700">
          <IconWarning className="size-4" /> {error}
        </p>
      )}
    </div>
  );
}
