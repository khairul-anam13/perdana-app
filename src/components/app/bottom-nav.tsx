"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULE_ICON } from "@/components/ui/module-icon";
import { MODULES, type ModuleKey } from "@/lib/modules";

const ITEMS: ModuleKey[] = ["beranda", "kas", "anggota", "kegiatan", "akun"];

/** Navigasi bawah di HP (dalam jangkauan jempol); menjadi punggung buku di sisi kiri pada layar lebar. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu utama"
      className="di-sampul fixed inset-x-0 bottom-0 z-40 border-t border-garis bg-lembar pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:right-auto md:w-60 md:border-t-0 md:border-l-8 md:border-merah-600 md:bg-sampul md:pt-36 md:pb-0"
    >
      <ul className="mx-auto flex max-w-2xl justify-between px-1 md:flex-col md:justify-start md:gap-1 md:px-3">
        {ITEMS.map((key) => {
          const m = MODULES[key];
          const Icon = MODULE_ICON[key];
          const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
          return (
            <li key={key} className="flex-1 md:flex-none">
              <Link
                href={m.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-15 flex-col items-center justify-center gap-1 rounded-md px-1 text-xs font-bold -outline-offset-2 transition-colors md:min-h-12 md:flex-row md:justify-start md:gap-3 md:px-4 md:text-base ${
                  active
                    ? "text-pulpen-600 md:bg-sampul-terang md:text-white"
                    : "text-tinta-pudar hover:bg-pulpen-50 active:bg-pulpen-100 md:text-pulpen-100 md:hover:bg-sampul-terang md:active:bg-sampul-terang"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-1 rounded-b-sm bg-pulpen-600 md:hidden"
                  />
                )}
                <Icon className="size-5" />
                {m.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
