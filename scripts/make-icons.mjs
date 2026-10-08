// Membuat ikon PNG dari SVG memakai Chrome yang sudah terpasang (tanpa dependensi tambahan).
// Pakai: node scripts/make-icons.mjs   (set CHROME_PATH bila Chrome tidak di lokasi umum)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
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

/** Tunas padi di atas petak berundak. `bleed` = latar penuh (maskable) tanpa sudut membulat. */
const svg = (
  bleed,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" ${bleed ? "" : 'rx="112"'} fill="#1a522f"/>
  <g ${bleed ? 'transform="translate(256 256) scale(.82) translate(-256 -256)"' : ""}>
    <path d="M0 392q128-52 256 0t256 0v120H0Z" fill="#143f25"/>
    <path d="M0 440q128-52 256 0t256 0v72H0Z" fill="#0e2c1a"/>
    <path d="M0 392q128-52 256 0t256 0" fill="none" stroke="#f4cd55" stroke-width="7" opacity=".8"/>
    <path d="M256 388V226" stroke="#f4cd55" stroke-width="16" stroke-linecap="round"/>
    <path d="M256 282c-60 0-100-38-110-98 60 0 104 38 110 98Z" fill="#f4cd55"/>
    <path d="M256 226c56 0 94-35 104-88-56 0-100 33-104 88Z" fill="#fdf0bd"/>
  </g>
</svg>`;

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
