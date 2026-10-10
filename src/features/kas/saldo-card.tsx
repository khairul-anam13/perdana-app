import { formatRupiah } from "@/lib/format/rupiah";

/**
 * Saldo ditulis langsung di atas kertas, bergaris bawah ganda seperti jumlah akhir di buku kas.
 * Biru = masuk, merah = keluar; tanda + dan − tetap ada supaya tidak bergantung pada warna.
 */
export function Saldo({
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
    <section aria-label="Ringkasan kas">
      <p className="text-tinta-pudar">Saldo kas</p>
      <p
        className={`mt-1 font-display text-[2.25rem] leading-tight font-bold ${balance < 0 ? "text-merah-600" : ""}`}
      >
        <span className="jumlah">{formatRupiah(balance)}</span>
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-tinta-pudar">Masuk {periodLabel}</dt>
          <dd className="text-lg font-bold text-pulpen-600">+ {formatRupiah(income)}</dd>
        </div>
        <div>
          <dt className="text-sm text-tinta-pudar">Keluar {periodLabel}</dt>
          <dd className="text-lg font-bold text-merah-600">− {formatRupiah(expense)}</dd>
        </div>
      </dl>
    </section>
  );
}
