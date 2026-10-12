"use client";

import type { ComponentType } from "react";
import { IconWarning, type IconProps } from "./icons";

/** Deretan pilihan cepat (satu terpilih). Lebih cepat dari dropdown untuk daftar pendek. */
export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  icons,
}: {
  label: string;
  options: readonly T[];
  value: T | "";
  onChange: (v: T) => void;
  error?: string;
  /** ikon kecil sebelum label tiap pilihan (membantu mengenali kategori sekilas) */
  icons?: Partial<Record<T, ComponentType<IconProps>>>;
}) {
  return (
    <div role="radiogroup" aria-label={label} aria-invalid={error ? true : undefined}>
      <p className="mb-1.5 text-sm font-bold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o === value;
          const Icon = icons?.[o] as ComponentType<IconProps> | undefined;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3.5 text-sm font-bold transition-colors ios:rounded-full ${
                active
                  ? "border-pulpen-600 bg-pulpen-600 text-white"
                  : `bg-lembar text-tinta hover:bg-pulpen-50 active:bg-pulpen-100 ${error ? "border-merah-600" : "border-garis-kuat"}`
              }`}
            >
              {Icon && <Icon className="size-4" />}
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
