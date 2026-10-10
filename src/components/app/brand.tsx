/** Tanda merek: buku kas folio, punggung kain merah dan label putih di sampul. */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="4" y="3" width="40" height="42" rx="4" fill="#0f1a33" />
      <rect x="4" y="3" width="9" height="42" rx="2" fill="#b8261f" />
      <rect x="18" y="12" width="21" height="16" rx="1.5" fill="#fff" />
      <path d="M21 18h15M21 23h10" stroke="#1d3faa" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark />
      <span className="font-display text-xl font-bold">Perdana</span>
    </span>
  );
}

/** Motif kawung (batik Jawa Tengah) seperti sampul buku folio. Dipakai di sampul halaman masuk. */
export function Kawung() {
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="kawung" width="28" height="28" patternUnits="userSpaceOnUse">
          <g fill="#22335c">
            <ellipse cx="7" cy="7" rx="6" ry="3.2" transform="rotate(45 7 7)" />
            <ellipse cx="21" cy="7" rx="6" ry="3.2" transform="rotate(-45 21 7)" />
            <ellipse cx="7" cy="21" rx="6" ry="3.2" transform="rotate(-45 7 21)" />
            <ellipse cx="21" cy="21" rx="6" ry="3.2" transform="rotate(45 21 21)" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kawung)" />
    </svg>
  );
}
