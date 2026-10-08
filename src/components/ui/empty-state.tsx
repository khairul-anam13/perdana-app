import type { ReactNode } from "react";

/** Layar kosong = ajakan bertindak, bukan sekadar "tidak ada data". */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon && (
        <div className="grid size-14 place-items-center rounded-full bg-daun-100 text-daun-700">
          {icon}
        </div>
      )}
      <p className="text-lg font-semibold">{title}</p>
      {hint && <p className="max-w-xs text-tinta-lembut">{hint}</p>}
      {action}
    </div>
  );
}
