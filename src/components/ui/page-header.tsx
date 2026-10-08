import Link from "next/link";
import type { ReactNode } from "react";
import { MODULES, type ModuleKey } from "@/lib/modules";
import { IconChevronLeft } from "./icons";
import { MODULE_ICON } from "./module-icon";

/** Judul halaman. Ubin ikon berwarna menandai modul (warna + ikon sama dengan di navigasi). */
export function PageHeader({
  module,
  title,
  subtitle,
  back,
  actions,
}: {
  module: ModuleKey;
  title: string;
  subtitle?: string;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  const Icon = MODULE_ICON[module];
  return (
    <header className="pt-5 pb-4">
      {back && (
        <Link
          href={back.href}
          className="mb-2 -ml-1 inline-flex min-h-10 items-center gap-1 pr-3 text-sm font-medium text-tinta-lembut hover:text-tinta"
        >
          <IconChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3.5">
          <span
            aria-hidden
            className={`grid size-12 shrink-0 place-items-center rounded-2xl ${MODULES[module].active}`}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-balance">{title}</h1>
            {subtitle && <p className="mt-0.5 text-tinta-lembut">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </div>
    </header>
  );
}
