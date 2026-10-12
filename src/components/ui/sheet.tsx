"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconX } from "./icons";

/**
 * Lembar dari bawah (di layar lebar menjadi dialog di tengah). Memakai elemen <dialog> bawaan
 * sehingga fokus, tombol Esc, dan pembaca layar ditangani browser.
 * Isi hanya dirender saat terbuka, jadi isian formulir selalu mulai bersih.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-xl border-t-4 border-pulpen-600 bg-lembar p-0 text-tinta shadow-angkat open:animate-sheet-in md:inset-0 md:m-auto md:h-fit md:max-w-lg md:rounded-xl ios:border-t-0 ios:open:animate-[sheet-in_0.38s_cubic-bezier(0.32,0.72,0,1)]"
    >
      {open && (
        <div className="px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {/* Pegangan sheet ala iOS; tak dipakai di tema Folio. */}
          <div
            aria-hidden
            className="mx-auto -mt-1 mb-3 hidden h-1.5 w-10 rounded-full bg-garis-kuat/50 ios:block"
          />
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl leading-tight font-bold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-2 grid size-12 shrink-0 place-items-center rounded-md text-tinta-pudar hover:bg-pulpen-50 active:bg-pulpen-100"
            >
              <IconX className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
