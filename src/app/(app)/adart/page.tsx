"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { IconSearch, IconX } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import {
  BAB,
  BAGIAN_LABEL,
  BELUM_TERTULIS,
  CATATAN_PENYUSUNAN,
  DISAHKAN,
  JUDUL,
  MUKADIMAH,
  type Bab,
  type Pasal,
} from "@/features/adart/data";
import { cariBelumTertulis, cariPasal, cocok, nomorPasal, tokenize } from "@/features/adart/search";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const babId = (b: Bab) => `bab-${b.no.toLowerCase()}`;
const JUMLAH_PASAL = BAB.reduce((n, b) => n + b.pasal.length, 0);

/** Sorot kata yang dicari dengan coretan stabilo. */
function Sorot({ text, tokens }: { text: string; tokens: readonly string[] }) {
  if (!tokens.length) return <>{text}</>;
  const re = new RegExp(`(${tokens.map(escapeRe).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((s, i) =>
        i % 2 ? (
          <mark key={i} className="stabilo text-tinta">
            {s}
          </mark>
        ) : (
          s
        ),
      )}
    </>
  );
}

/** Teks dengan **tebal** (nominal denda) dan sorotan pencarian. */
function Teks({ text, tokens }: { text: string; tokens: readonly string[] }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((s, i) =>
        s.startsWith("**") ? (
          <strong key={i} className="font-bold">
            <Sorot text={s.slice(2, -2)} tokens={tokens} />
          </strong>
        ) : (
          <Sorot key={i} text={s} tokens={tokens} />
        ),
      )}
    </>
  );
}

const daftarHuruf = "list-[lower-alpha] marker:font-bold marker:text-tinta-pudar";

function PasalBaris({ p, tokens }: { p: Pasal; tokens: readonly string[] }) {
  return (
    <li id={`pasal-${p.no}`} className="flex scroll-mt-36">
      {/* Kolom nomor di kiri, bergaris merah ganda seperti kolom tanggal buku kas. */}
      <div aria-hidden className="kolom-tanggal w-16 shrink-0 py-3 text-center">
        <span className="block text-xs text-tinta-pudar">Pasal</span>
        <span className="block font-display text-2xl leading-none font-bold">{p.no}</span>
      </div>
      <div className="min-w-0 flex-1 px-3 py-3 leading-relaxed">
        <h4 className={p.judul ? "mb-1 font-bold" : "sr-only"}>
          <span className="sr-only">Pasal {p.no}</span>
          {p.judul && (
            <>
              <span className="sr-only">, </span>
              <Teks text={p.judul} tokens={tokens} />
            </>
          )}
        </h4>
        {p.belumDiatur && (
          <span className="stabilo mb-1 inline-block text-sm font-bold">Belum diatur</span>
        )}
        {p.teks && (
          <p className="max-w-prose">
            <Teks text={p.teks} tokens={tokens} />
          </p>
        )}
        {p.pengantar && (
          <p className="max-w-prose">
            <Teks text={p.pengantar} tokens={tokens} />
          </p>
        )}
        {p.ayat && (
          <ol
            className={`mt-1 max-w-prose space-y-2 pl-6 ${
              p.huruf ? daftarHuruf : "list-decimal marker:font-bold marker:text-tinta-pudar"
            }`}
          >
            {p.ayat.map((a, i) => (
              <li key={i} className="pl-1">
                <Teks text={a.teks} tokens={tokens} />
                {a.sub && (
                  <ol className={`mt-1.5 space-y-1.5 pl-6 ${daftarHuruf}`}>
                    {a.sub.map((s, j) => (
                      <li key={j} className="pl-1">
                        <Teks text={s} tokens={tokens} />
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </li>
  );
}

export default function AdArtPage() {
  const [q, setQ] = useState("");
  const aktif = q.trim().length > 0;
  // "pasal 9" menyorot pasalnya saja; kata lain disorot di teks.
  const tokens = useMemo(() => (nomorPasal(q) === null ? tokenize(q) : []), [q]);
  const hasil = useMemo(() => cariPasal(q), [q]);
  const baris = useMemo(() => cariBelumTertulis(q), [q]);

  const jumlah = hasil.reduce((n, h) => n + h.pasal.length, 0);
  const tampilMukadimah = !aktif || cocok(tokenize(q), `mukadimah ${MUKADIMAH}`);
  const tampilBelum = !aktif || (nomorPasal(q) === null && baris.length > 0);
  const kosong = aktif && jumlah === 0 && !tampilMukadimah && !tampilBelum;

  return (
    <>
      <PageHeader
        title="AD/ART"
        subtitle={`${JUDUL}, disahkan ${DISAHKAN}. ${JUMLAH_PASAL} pasal dalam ${BAB.length} bab.`}
        back={{ href: "/beranda", label: "Beranda" }}
      />

      <div
        role="search"
        className="sticky top-[calc(3.5rem+1px+env(safe-area-inset-top))] z-20 -mx-4 border-b border-garis bg-kertas px-4 py-2 md:top-0"
      >
        <div className="relative">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tinta-pudar" />
          <Input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={'Cari kata, atau ketik "pasal 9"'}
            aria-label="Cari di AD/ART"
            className="pr-12 pl-10!"
          />
          {aktif && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Hapus pencarian"
              className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-md text-tinta-pudar -outline-offset-2 hover:text-tinta"
            >
              <IconX className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-6">
        {aktif ? (
          <p aria-live="polite" className="text-sm text-tinta-pudar">
            {kosong
              ? "Tidak ada yang cocok."
              : `${jumlah} pasal cocok${tampilBelum && baris.length ? `, ${baris.length} catatan belum tertulis` : ""}.`}
          </p>
        ) : (
          <nav aria-label="Lompat ke bagian" className="-mx-4 -mt-1">
            <ul className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-1">
              {[
                { href: "#mukadimah", label: "Mukadimah" },
                ...BAB.map((b) => ({ href: `#${babId(b)}`, label: `${b.no}. ${b.singkat}` })),
                { href: "#belum-tertulis", label: "Belum tertulis" },
              ].map((c) => (
                <li key={c.href} className="shrink-0">
                  <a
                    href={c.href}
                    className="inline-flex min-h-11 items-center rounded-md border border-garis-kuat bg-lembar px-3.5 text-sm font-bold whitespace-nowrap hover:bg-pulpen-50 active:bg-pulpen-100"
                  >
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {kosong && (
          <EmptyState
            title={`Tidak ada pasal yang memuat "${q.trim()}"`}
            hint={'Coba satu kata saja, atau ketik nomor pasal, mis. "pasal 9".'}
            action={
              <Button variant="secondary" onClick={() => setQ("")}>
                Hapus pencarian
              </Button>
            }
          />
        )}

        {tampilMukadimah && (
          <section id="mukadimah" aria-labelledby="h-mukadimah" className="lembar scroll-mt-36 p-4">
            <h2 id="h-mukadimah" className="font-display text-lg font-bold">
              Mukadimah
            </h2>
            <p className="mt-1 max-w-prose leading-relaxed">
              <Teks text={MUKADIMAH} tokens={tokens} />
            </p>
          </section>
        )}

        {(["AD", "ART"] as const).map((bagian) => {
          const babs = hasil.filter((h) => h.bab.bagian === bagian);
          if (!babs.length) return null;
          return (
            <section key={bagian} aria-labelledby={`h-${bagian}`} className="flex flex-col gap-5">
              <h2
                id={`h-${bagian}`}
                className="border-b-2 border-pulpen-600 pb-1 font-display text-xl font-bold"
              >
                {BAGIAN_LABEL[bagian]}
              </h2>
              {babs.map(({ bab, pasal }) => (
                <section key={bab.no} id={babId(bab)} className="scroll-mt-36">
                  <h3 className="mb-2 flex flex-wrap items-baseline gap-x-2 font-display text-lg font-bold">
                    <span className="text-tinta-pudar">Bab {bab.no}</span>
                    <Teks text={bab.judul} tokens={tokens} />
                  </h3>
                  <ol className="lembar divide-y divide-garis overflow-hidden">
                    {pasal.map((p) => (
                      <PasalBaris key={p.no} p={p} tokens={tokens} />
                    ))}
                  </ol>
                </section>
              ))}
            </section>
          );
        })}

        {tampilBelum && (
          <section id="belum-tertulis" aria-labelledby="h-belum" className="scroll-mt-36">
            <h2 id="h-belum" className="font-display text-lg font-bold">
              Belum tertulis di naskah
            </h2>
            <p className="mt-1 mb-2 max-w-prose text-tinta-pudar">
              Naskah beberapa kali menyebut ketentuan yang &quot;sudah ditetapkan&quot;, tetapi
              isinya tidak tertulis. Daftar ini untuk melacaknya.
            </p>
            <ul className="lembar divide-y divide-garis overflow-hidden">
              {(aktif ? baris : BELUM_TERTULIS).map((r) => (
                <li key={`${r.pasal}-${r.hal}`} className="flex flex-col gap-1 px-4 py-3">
                  <p className="text-sm font-bold text-tinta-pudar">
                    <Teks text={r.pasal} tokens={tokens} />
                  </p>
                  <p>
                    <Teks text={r.hal} tokens={tokens} />
                  </p>
                  {r.isi ? (
                    <p className="text-tinta-pudar">
                      <Teks text={r.isi} tokens={tokens} />
                    </p>
                  ) : (
                    <span className="stabilo self-start text-sm font-bold">Belum tertulis</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!aktif && (
          <footer className="max-w-prose space-y-2 text-sm text-tinta-pudar">
            <p>
              AD/ART ini telah disahkan pada tanggal <b className="text-tinta">{DISAHKAN}</b>.
              Blorong, {DISAHKAN}.
            </p>
            <p>{CATATAN_PENYUSUNAN}</p>
          </footer>
        )}
      </div>
    </>
  );
}
