import Link from "next/link";
import type { ReactNode } from "react";
import { IconChevronLeft } from "./icons";

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string;
  subtitle?: string;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="pt-3 pb-4">
      {back && (
        <Link
          href={back.href}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-bold text-pulpen-600 hover:bg-pulpen-50"
        >
          <IconChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div className={`flex items-start justify-between gap-3 ${back ? "" : "pt-2"}`}>
        <div className="min-w-0">
          <h1 className="font-display text-[1.7rem] leading-tight font-bold text-balance ios:text-[2.125rem] ios:leading-[1.1] ios:tracking-tight">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-tinta-pudar">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
