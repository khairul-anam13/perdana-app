const nf = new Intl.NumberFormat("id-ID");

/** 1250000 -> "Rp 1.250.000" */
export const formatRupiah = (n: number): string =>
  `${n < 0 ? "-" : ""}Rp ${nf.format(Math.abs(n))}`;

/** Angka tanpa simbol, titik ribuan: 1250000 -> "1.250.000" */
export const formatAngka = (n: number): string => nf.format(n);

/** "Rp 1.250.000" / "1.250.000" -> 1250000. Selain digit dibuang. */
export const parseRupiah = (s: string): number => {
  const digits = s.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};
