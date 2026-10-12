/**
 * Logo Karang Taruna (SVG, latar transparan, public/logo-karang-taruna.svg). Ikut diprecache service worker
 * (next.config.ts) supaya tampil juga saat offline. Dekoratif: nama aplikasi selalu ada di teks sebelahnya.
 */
export function BrandMark({ className = "h-9" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG statis, tidak perlu optimasi next/image
    <img src="/logo-karang-taruna.svg" alt="" className={`w-auto shrink-0 ${className}`} />
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
export function Kawung({ className = "" }: { className?: string }) {
  return (
    <svg className={`absolute inset-0 h-full w-full ios:hidden ${className}`} aria-hidden="true">
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
