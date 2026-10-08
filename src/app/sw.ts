import { defaultCache } from "@serwist/next/worker";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, type PrecacheEntry } from "serwist";
import { BACKGROUND_SYNC_TAG, syncNow } from "../lib/sync/engine";

// Hanya bagian `self` yang dipakai di sini yang diketik (menghindari bentrok tipe lib dom vs webworker).
declare const self: { __SW_MANIFEST: (PrecacheEntry | string)[] | undefined };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Halaman dengan query (mis. /kegiatan/detail?id=...) memakai HTML yang sama; hanya `_rsc` yang dibedakan.
  precacheOptions: { ignoreURLParametersMatching: [/^(?!_rsc$)/] },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false, // offline-first: cangkang dilayani dari cache
  runtimeCaching: [
    // Gambar nota tak pernah berubah (ID unik): simpan setelah dilihat.
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/receipts/"),
      handler: new CacheFirst({
        cacheName: "nota",
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 90 })],
      }),
    },
    // API lain (sinkronisasi, login) tidak boleh pernah disajikan dari cache.
    { matcher: ({ url }) => url.pathname.startsWith("/api/"), handler: new NetworkOnly() },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/~offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();

// Background Sync (Chrome/Android). Tidak didukung iOS Safari, jadi sinkronisasi utama tetap dipicu dari halaman.
(self as unknown as EventTarget).addEventListener("sync", (e) => {
  const event = e as Event & { tag: string; waitUntil(p: Promise<unknown>): void };
  if (event.tag === BACKGROUND_SYNC_TAG) event.waitUntil(syncNow());
});
