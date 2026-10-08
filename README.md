# Perdana

Aplikasi administrasi **Karang Taruna** tingkat desa: **kas transparan**, **data anggota**, dan **kegiatan + absensi**.
Berupa PWA **offline-first**: semua fitur inti tetap jalan tanpa sinyal. Data ditulis ke HP lebih dulu, lalu disinkronkan
ke server saat internet tersedia. Antarmuka berbahasa Indonesia.

Stack: Next.js (App Router) · TypeScript strict · Tailwind CSS 4 · PostgreSQL + Prisma · Dexie (IndexedDB) · Serwist · Zod · Font Awesome 7 Free · pnpm.

## Menjalankan di komputer sendiri

Prasyarat: Node.js 20+, pnpm 10, PostgreSQL 14+ (diuji di 17).

```bash
pnpm install

# 1. Siapkan database (sekali), dari psql sebagai superuser:
#    CREATE ROLE perdana LOGIN PASSWORD 'perdana_dev_local' CREATEDB;
#    CREATE DATABASE perdana OWNER perdana;

# 2. Variabel lingkungan
cp .env.example .env        # lalu isi AUTH_SECRET (lihat tabel di bawah)

# 3. Skema + data contoh
pnpm db:generate
pnpm db:deploy              # terapkan migrasi
pnpm db:seed                # organisasi contoh, 12 anggota, kegiatan, kas, 4 akun

# 4. Jalankan
pnpm dev                    # pengembangan (service worker mati)
```

Untuk mencoba **mode offline / PWA**, jalankan versi produksi (service worker hanya aktif di sini):

```bash
pnpm build && pnpm start    # http://localhost:3000
```

### Akun contoh (hanya pengembangan, PIN semuanya `123456`)

| Username     | Peran      | Bisa                                                   |
| ------------ | ---------- | ------------------------------------------------------ |
| `ketua`      | Ketua      | Semua, termasuk kelola pengguna                        |
| `sekretaris` | Sekretaris | Anggota, kegiatan, absensi                             |
| `bendahara`  | Bendahara  | Kas                                                    |
| `ayu`        | Anggota    | Melihat kas/kegiatan/anggota (terbatas), absen sendiri |

> Jangan jalankan seed di produksi. Buat akun Ketua pertama lewat SQL atau skrip sendiri dengan PIN yang kuat.

### Variabel lingkungan

| Nama           | Wajib | Keterangan                                                                 |
| -------------- | ----- | -------------------------------------------------------------------------- |
| `DATABASE_URL` | ya    | `postgresql://user:sandi@host:5432/perdana`                                |
| `AUTH_SECRET`  | ya    | Minimal 32 karakter acak, untuk menandatangani sesi. Ganti = semua keluar. |

Membuat rahasia acak: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Cara menguji mode offline

1. `pnpm build && pnpm start`, buka `http://localhost:3000` di Chrome, masuk (butuh internet sekali).
2. Biarkan beranda terbuka beberapa detik sampai data diunduh (indikator di atas: **Tersinkron**).
3. DevTools → **Application → Service Workers** harus berstatus _activated_. Lalu **Network → Offline** (atau matikan Wi-Fi).
4. Masuk sebagai `bendahara`, **Kas → Catat**: simpan 2–3 transaksi. Umpan balik: _"Tersimpan di HP, menunggu sinkronisasi"_;
   di daftar tampil lencana **Menunggu kirim**, dan indikator atas berubah menjadi **Offline · n menunggu**.
5. Muat ulang halaman saat masih offline: cangkang terbuka dan data tetap ada.
6. Nyalakan jaringan. Dalam beberapa detik lencana hilang, toast berubah jadi _"Tersimpan dan tersinkron"_.
   Di **Akun → Sinkronisasi** tekan **Sinkronkan sekarang** berkali-kali: jumlah transaksi di server tetap sama (tanpa ganda).
7. Uji juga: absensi offline (Kegiatan → buka kegiatan), tambah anggota offline (sekretaris), dan _Sesi habis_:
   hapus cookie `perdana_session` lalu tekan Sinkronkan → aplikasi masuk **mode baca saja** dan data yang belum terkirim tetap aman.

Di iPhone: buka lewat Safari, **Bagikan → Tambah ke Layar Utama**. Aplikasi menampilkan petunjuk ini sendiri.
Service worker dan kamera membutuhkan **HTTPS** (kecuali `localhost`), jadi untuk uji di HP gunakan hasil deploy ber-HTTPS.

## Tes

```bash
pnpm test        # Vitest: saldo, koreksi, batas usia, hak akses, idempotensi sync, pull/paginasi
pnpm typecheck
pnpm lint
```

Tes server memakai database `perdana_test` di server PostgreSQL yang sama (dibuat otomatis, migrasi diterapkan otomatis).
Yang diuji antara lain: kirim ulang batch yang sama tidak menggandakan data (juga untuk dua kiriman bersamaan),
kas tidak bisa diubah/dihapus, koreksi hanya sekali, tiap peran hanya bisa menulis entitasnya, anggota hanya mengisi absensi dirinya,
dan anggota biasa tidak menerima kontak anggota lain.

## Perintah

| Perintah                         | Fungsi                                              |
| -------------------------------- | --------------------------------------------------- |
| `pnpm dev`                       | Server pengembangan (Turbopack)                     |
| `pnpm build` / `pnpm start`      | Build produksi (webpack, karena Serwist) / jalankan |
| `pnpm db:migrate`                | Buat migrasi baru dari `schema.prisma` (dev)        |
| `pnpm db:deploy`                 | Terapkan migrasi (produksi)                         |
| `pnpm db:seed` / `pnpm db:reset` | Isi data contoh / ulang dari nol (dev saja)         |
| `node scripts/make-icons.mjs`    | Buat ulang ikon PWA (butuh Chrome terpasang)        |

## Struktur

```
src/
  app/                   route Next.js
    (auth)/login
    (app)/beranda | kas | anggota | kegiatan | akun
    api/auth | sync/push | sync/pull | receipts/[id] | users
    sw.ts                service worker (Serwist)
  features/              kas, anggota, kegiatan: skema Zod, repository lokal (Dexie), komponen
  lib/
    db/local.ts          skema Dexie (versi dikelola)
    sync/                outbox, mesin sinkronisasi, protokol, status
    auth/                sesi di perangkat, hak akses (dipakai klien dan server)
    format/              rupiah, tanggal id-ID
  components/ui/         komponen dasar buatan sendiri; icons.tsx = satu-satunya tempat ikon Font Awesome didaftarkan
  server/                Prisma, otorisasi, logika push/pull
prisma/schema.prisma     skema server + migrasi (+ seed)
public/manifest.webmanifest
docs/keputusan.md        keputusan desain dan batasan
```

Aturan yang dijaga: komponen UI hanya memanggil **repository lokal** (tidak langsung ke jaringan); setiap tulis masuk IndexedDB
**dan** antrean outbox dalam satu transaksi; hak akses ditegakkan di **server** (UI hanya menyembunyikan tombol).
Menambah modul baru = folder baru di `features/`, satu entitas di `lib/sync/protocol.ts`, satu handler di `server/sync/push.ts`.

## Produksi (ringkas)

- Sediakan PostgreSQL, set `DATABASE_URL` dan `AUTH_SECRET`, jalankan `pnpm db:deploy`, `pnpm build`, `pnpm start`.
- Wajib **HTTPS** (syarat service worker dan cookie sesi `secure`).

Keputusan desain dan hal yang belum dikerjakan: lihat [docs/keputusan.md](docs/keputusan.md).
