"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULE_ICON } from "@/components/ui/module-icon";
import { MODULES, type ModuleKey } from "@/lib/modules";

const ITEMS: ModuleKey[] = ["beranda", "kas", "anggota", "kegiatan", "akun"];

/** Navigasi bawah di HP; menjadi bilah samping di layar lebar. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-garis bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:inset-y-0 md:right-auto md:w-60 md:border-t-0 md:border-r md:pt-40 md:pb-0"
    >
      <ul className="mx-auto flex max-w-2xl justify-between gap-1 px-2 py-1.5 md:flex-col md:justify-start md:gap-2 md:px-4">
        {ITEMS.map((key) => {
          const m = MODULES[key];
          const Icon = MODULE_ICON[key];
          const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
          return (
            <li key={key} className="flex-1 md:flex-none">
              <Link
                href={m.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-xs font-semibold transition-colors md:min-h-12 md:flex-row md:justify-start md:gap-3 md:px-4 md:text-base ${
                  active ? m.active : "text-tinta-lembut hover:bg-daun-50"
                }`}
              >
                <Icon className="size-5 md:size-6" />
                {m.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
