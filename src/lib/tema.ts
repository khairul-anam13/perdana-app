/**
 * Tema tampilan. Berkas ini sengaja tanpa "use client" agar konstantanya bisa dipakai layout server.
 * Pilihan disimpan per perangkat di localStorage (`perdana.tema`) dan dipasang sebagai `data-tema` pada <html>.
 */
export const TEMA = ["folio", "ios"] as const;
export type Tema = (typeof TEMA)[number];

export const TEMA_KEY = "tema";
export const TEMA_STORAGE = `perdana.${TEMA_KEY}`;

/** Warna bilah alamat/status HP per tema (sama dengan --color-sampul / --color-kertas). */
export const TEMA_WARNA: Record<Tema, string> = { folio: "#0f1a33", ios: "#f2f2f7" };

/**
 * Dijalankan di <head> sebelum cat pertama supaya halaman tidak berkedip dari Folio ke iOS.
 * Harus tanpa dependensi: ditulis sebagai string.
 */
export const SKRIP_TEMA = `try{var t=localStorage.getItem("${TEMA_STORAGE}");if(t==="ios"){document.documentElement.dataset.tema=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","${TEMA_WARNA.ios}")}}catch(e){}`;

export function terapkanTema(t: Tema) {
  const el = document.documentElement;
  if (t === "folio") delete el.dataset.tema;
  else el.dataset.tema = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", TEMA_WARNA[t]);
}
