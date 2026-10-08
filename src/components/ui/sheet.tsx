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
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-3xl bg-kapur p-0 text-tinta open:animate-sheet-in md:inset-0 md:m-auto md:h-fit md:max-w-lg md:rounded-3xl"
    >
      {open && (
        <div className="px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-2 grid size-11 place-items-center rounded-full text-tinta-lembut hover:bg-daun-100"
            >
              <IconX />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
