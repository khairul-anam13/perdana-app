const pad = (n: number) => String(n).padStart(2, "0");

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** Tanggal lokal hari ini: "2026-10-03". */
export const todayISO = (d = new Date()): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Waktu sekarang dalam UTC dengan milidetik. Format tetap, aman dibandingkan sebagai string. */
export const nowISO = (): string => new Date().toISOString();

/** "2026-10-03" -> "3 Okt 2026" */
export const formatTanggal = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${BULAN[m - 1].slice(0, 3)} ${y}`;
};

/** "2026-10-03" -> "Sabtu, 3 Oktober 2026" */
export const formatTanggalPanjang = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][
    new Date(y, m - 1, d).getDay()
  ];
  return `${hari}, ${d} ${BULAN[m - 1]} ${y}`;
};

/** ISO UTC -> "3 Okt 2026, 14.05" (waktu lokal) */
export const formatWaktu = (iso: string): string => {
  const d = new Date(iso);
  return `${formatTanggal(todayISO(d))}, ${pad(d.getHours())}.${pad(d.getMinutes())}`;
};

/** "baru saja", "5 menit lalu", "3 jam lalu", atau tanggal. */
export const timeAgo = (iso: string, now = Date.now()): string => {
  const min = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} jam lalu`;
  return formatWaktu(iso);
};

/** "2026-10-03" -> "2026-10" */
export const monthKey = (iso: string): string => iso.slice(0, 7);

/** "2026-10" -> "Oktober 2026" */
export const formatBulan = (key: string): string => {
  const [y, m] = key.split("-").map(Number);
  return `${BULAN[m - 1]} ${y}`;
};

/** Geser bulan: shiftMonth("2026-01", -1) -> "2025-12" */
export const shiftMonth = (key: string, by: number): string => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** Usia penuh pada tanggal `today` (default hari ini). */
export const ageOn = (birthDate: string, today = todayISO()): number => {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
};
