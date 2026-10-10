// Membuat ikon PNG dari SVG memakai Chrome yang sudah terpasang (tanpa dependensi tambahan).
// Pakai: node scripts/make-icons.mjs   (set CHROME_PATH bila Chrome tidak di lokasi umum)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chrome =
  process.env.CHROME_PATH ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].find(existsSync);
if (!chrome) throw new Error("Chrome tidak ditemukan. Set CHROME_PATH.");

// Logo organisasi (public/logo-karang-taruna.svg) di atas latar putih.
const logoSvg = readFileSync(new URL("../public/logo-karang-taruna.svg", import.meta.url), "utf8");
const [, viewBox, body] = logoSvg.match(/<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/);
const [, , vw, vh] = viewBox.split(" ").map(Number);

/** `bleed` = latar penuh (maskable/iOS) tanpa sudut membulat, logo lebih kecil agar muat di zona aman. */
const svg = (bleed) => {
  const w = bleed ? 330 : 400;
  const h = (w * vh) / vw;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" ${bleed ? "" : 'rx="112"'} fill="#fff"/>
  <svg x="${(512 - w) / 2}" y="${(512 - h) / 2}" width="${w}" height="${h}" viewBox="${viewBox}">${body}</svg>
</svg>`;
};

const out = new URL("../public/icons/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
mkdirSync(out, { recursive: true });
const work = join(tmpdir(), "perdana-icons");
mkdirSync(work, { recursive: true });

function render(name, size, bleed) {
  const html = join(work, `${name}.html`);
  writeFileSync(
    html,
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg(bleed)}`,
  );
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--default-background-color=00000000",
      `--window-size=${size},${size}`,
      `--screenshot=${join(out, name)}`,
      `file:///${html.replace(/\\/g, "/")}`,
    ],
    { stdio: "ignore" },
  );
}

render("icon-192.png", 192, false);
render("icon-512.png", 512, false);
render("icon-maskable-512.png", 512, true);
render("apple-touch-icon.png", 180, true); // iOS membulatkan sendiri, jadi latar penuh
rmSync(work, { recursive: true, force: true });
console.log("Ikon dibuat di public/icons/");
