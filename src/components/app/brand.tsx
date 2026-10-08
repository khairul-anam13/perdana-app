/** Tanda merek: tunas padi di atas petak sawah berundak. */
export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#1a522f" />
      <path d="M0 36q12-5 24 0t24 0v12H0Z" fill="#143f25" />
      <path d="M0 41q12-5 24 0t24 0v7H0Z" fill="#0e2c1a" />
      <path d="M24 35V21" stroke="#f4cd55" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 26c-5.500 0-9-3.500-10-9 5.500 0 9.500 3.500 10 9Z" fill="#f4cd55" />
      <path d="M24 21c5 0 8.500-3.200 9.500-8-5 0-9 3-9.500 8Z" fill="#fdf0bd" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark />
      <span className="text-xl font-bold tracking-tight">Perdana</span>
    </span>
  );
}
