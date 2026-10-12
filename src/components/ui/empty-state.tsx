import type { ReactNode } from "react";

/** Layar kosong = halaman buku yang belum ditulisi, dengan ajakan mengisi baris pertama. */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  /** ikon pembantu di atas judul; sebaiknya satu ikon yang menggambarkan isi daftar */
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="lembar flex flex-col items-start gap-2 border-dashed px-5 py-7 shadow-none ios:items-center ios:text-center">
      {icon && (
        <span
          aria-hidden
          className="mb-1 grid size-12 place-items-center rounded-[22%] bg-pulpen-100 text-pulpen-700"
        >
          {icon}
        </span>
      )}
      <p className="font-display text-lg font-bold">{title}</p>
      {hint && <p className="max-w-sm text-tinta-pudar">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Pengganti daftar saat data lokal sedang dibuka: baris bergaris yang masih kosong. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Membuka data" className="lembar divide-y divide-garis px-4">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-16 items-center justify-between gap-6">
          <span className="baris-tunggu" style={{ width: `${55 - i * 7}%` }} />
          <span className="baris-tunggu w-16" />
        </div>
      ))}
    </div>
  );
}
