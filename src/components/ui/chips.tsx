"use client";

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
    <div role="radiogroup" aria-label={label}>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
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
              className={`min-h-11 rounded-full px-4 text-sm font-semibold ring-1 transition-colors ${
                active
                  ? "bg-daun-700 text-white ring-daun-700"
                  : "bg-white text-tinta ring-garis-kuat hover:bg-daun-50"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-sm font-medium text-bata-700">{error}</p>}
    </div>
  );
}
