"use client";

import { IconCircleCheck, IconPalette } from "@/components/ui/icons";
import { useTema } from "@/lib/use-tema";
import type { Tema } from "@/lib/tema";

/** Pratinjau memakai warna tetap (bukan token) supaya tiap pilihan selalu menampilkan temanya sendiri. */
function Pratinjau({ tema }: { tema: Tema }) {
  if (tema === "ios")
    return (
      <span
        aria-hidden
        className="flex h-24 flex-col gap-1.5 rounded-xl bg-[#f2f2f7] p-2.5 ring-1 ring-black/5"
      >
        <span className="h-10 rounded-[14px] bg-gradient-to-br from-[#0a6cf0] to-[#0050b8]" />
        <span className="h-3.5 rounded-lg bg-white" />
        <span className="h-3.5 rounded-lg bg-white" />
      </span>
    );
  return (
    <span
      aria-hidden
      className="flex h-24 flex-col gap-1.5 rounded-md bg-[#ecf0f3] p-2.5 ring-1 ring-[#cbd5df]"
    >
      <span className="h-10 rounded-sm border-l-[6px] border-[#b8261f] bg-[#0f1a33]" />
      <span className="h-3.5 border border-[#cbd5df] bg-white" />
      <span className="h-3.5 border border-[#cbd5df] bg-white" />
    </span>
  );
}

const PILIHAN: { id: Tema; nama: string; ket: string }[] = [
  { id: "folio", nama: "Buku Kas", ket: "Kertas bergaris, huruf kuitansi, stempel Lunas." },
  { id: "ios", nama: "iOS", ket: "Gaya Apple: bersih, sudut membulat, bilah buram." },
];

export function TemaPilihan() {
  const [tema, setTema] = useTema();
  return (
    <section aria-labelledby="tampilan" className="lembar p-4">
      <h2 id="tampilan" className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
        <IconPalette className="size-5 text-pulpen-600" /> Tampilan
      </h2>
      <p className="text-sm text-tinta-pudar">
        Pilih gaya tampilan aplikasi. Berlaku di HP ini saja dan tidak mengubah data.
      </p>
      <div role="radiogroup" aria-label="Gaya tampilan" className="mt-3 grid grid-cols-2 gap-3">
        {PILIHAN.map((p) => {
          const aktif = p.id === tema;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={aktif}
              onClick={() => setTema(p.id)}
              className={`flex flex-col gap-2 rounded-xl p-2 text-left transition-colors ${
                aktif
                  ? "bg-pulpen-50 ring-2 ring-pulpen-600"
                  : "ring-1 ring-garis-kuat hover:bg-pulpen-50"
              }`}
            >
              <Pratinjau tema={p.id} />
              <span className="flex items-center justify-between gap-2 px-1">
                <span className="font-bold">{p.nama}</span>
                {aktif && <IconCircleCheck className="size-5 text-pulpen-600" />}
              </span>
              <span className="px-1 pb-1 text-xs leading-snug text-tinta-pudar">{p.ket}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
