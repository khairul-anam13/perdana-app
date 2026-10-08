import { formatRupiah } from "@/lib/format/rupiah";

/** Garis kontur sawah berundak; makin ke bawah makin rapat, seperti petak terasering dilihat dari lereng. */
function Contours() {
  const lines = Array.from({ length: 7 }, (_, i) => {
    const y = 38 + i * i * 2.6 + i * 8;
    const amp = 14 - i * 1.4;
    const seg = Array.from(
      { length: 8 },
      (_, k) => `Q${k * 60 + 30} ${y + (k % 2 ? -amp : amp)} ${(k + 1) * 60} ${y}`,
    ).join(" ");
    return { d: `M0 ${y} ${seg}`, accent: i === 3 };
  });
  return (
    <svg
      viewBox="0 0 480 190"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {lines.map((l, i) => (
        <path
          key={i}
          d={l.d}
          fill="none"
          stroke={l.accent ? "#f4cd55" : "#82ba8f"}
          strokeWidth={l.accent ? 2 : 1.3}
          opacity={l.accent ? 0.85 : 0.28}
        />
      ))}
    </svg>
  );
}

export function SaldoCard({
  balance,
  income,
  expense,
  periodLabel,
}: {
  balance: number;
  income: number;
  expense: number;
  periodLabel: string;
}) {
  return (
    <section
      aria-label="Ringkasan kas"
      className="relative overflow-hidden rounded-3xl bg-daun-700 p-5 pb-6 text-white shadow-sm"
    >
      <Contours />
      <div className="relative">
        <p className="text-daun-100">Saldo kas saat ini</p>
        <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
          {formatRupiah(balance)}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-daun-200">Masuk {periodLabel}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatRupiah(income)}</dd>
          </div>
          <div>
            <dt className="text-daun-200">Keluar {periodLabel}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatRupiah(expense)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
