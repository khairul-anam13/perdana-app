# Keputusan desain

Catatan keputusan yang ambigu di dokumen rancangan, beserta alasannya. Urutan: dari yang paling berpengaruh.

## Sinkronisasi

**Satu urutan global `server_seq`, ditulis serial per organisasi.**
Semua tabel data memakai satu `SEQUENCE` PostgreSQL (`server_seq`), jadi kursor pull cukup satu angka.
Masalah klasik kursor: dua transaksi terbit nomor 10 dan 11, yang 11 ter-commit lebih dulu, klien menarik sampai 11 dan
selamanya melewatkan 10. Solusi: setiap penulisan memegang `pg_advisory_xact_lock(hash(organization_id))` sampai commit
(`src/server/db.ts` → `withOrgLock`), sehingga nomor terbit dan ter-commit berurutan.
Batasnya: tulis per organisasi diserialkan. Untuk satu Karang Taruna (puluhan penulis) tidak terasa. Jika nanti ada
ribuan organisasi, kunci tetap per organisasi sehingga tidak saling menunggu.

**Idempotensi dengan ID baris dari klien.**
ID dibuat di klien (UUID v7). Server menjawab per item `ok` / `duplikat` / `ditolak`.
Kas: ID sudah ada → `duplikat` (tidak pernah menimpa). Data lain: last-write-wins; `updatedAt` server ≥ masuk → `duplikat`.
Dua pengiriman bersamaan untuk data yang sama diurutkan oleh kunci di atas, jadi satu `ok` dan satu `duplikat` (diuji).

**Bentuk API memakai camelCase**, bukan snake_case seperti contoh di dokumen.
Alasan: semua kode TypeScript (skema Zod bersama klien-server, Dexie, Prisma) memakai camelCase; mengubah-ubah nama di
tepi API hanya menambah kode pemetaan. Isi amplop push: `{ changeId, id, entity, op, payload, clientUpdatedAt }`.
`changeId` (ID antrean) ditambahkan karena satu baris bisa punya beberapa perubahan beruntun (buat lalu ubah) dan hasil
per item harus bisa dicocokkan satu per satu.

**Antrean berhenti hanya untuk kesalahan sementara.**
Jaringan/5xx → semua item batch naik `attempts` dan dijadwalkan ulang dengan backoff (2s, 4s, … maksimal 5 menit, acak ±25%);
data tidak pernah dihapus. `ditolak` → item tetap di antrean berstatus `ditolak` dan tampil di Akun › Perlu perhatian;
pengguna bisa "Buang perubahan ini" (baris lokalnya ikut dibuang). Item ditolak tidak menahan item lain.

**Pull tidak menimpa perubahan lokal yang belum terkirim.**
Baris dengan perubahan `menunggu` di antrean dilewati saat merge, dan baris lokal yang `updatedAt`-nya lebih baru dipertahankan.

**Absensi.** Kunci unik `(activity_id, member_id)` ada di DB. Klien memakai kembali ID baris yang sudah ada untuk pasangan itu.
Bila dua perangkat membuat baris berbeda untuk pasangan yang sama saat offline, server menggabungkannya ke baris pertama
(last-write-wins untuk statusnya) dan klien membuang duplikat lokal pada pull berikutnya.

**Kas koreksi.** Koreksi mempertahankan kategori transaksi asal dan bertipe berlawanan dengan nominal sama.
Di ringkasan bulanan dan laporan, koreksi dihitung sebagai **pengurang pos asalnya** (bukan menambah pos berlawanan),
supaya "pemasukan bulan ini" tidak membengkak. Saldo tetap penjumlahan biasa. Server menolak: koreksi dua kali,
koreksi atas koreksi, tipe/nominal tidak cocok.

**Nota (foto).** Diunggah lewat endpoint terpisah (`PUT /api/receipts/:id`, antrean sendiri di tabel `receipts` lokal).
`transactions.receipt_id` sengaja **tanpa foreign key**: transaksi boleh tiba di server sebelum fotonya.
File disimpan sebagai `bytea` di PostgreSQL (≤ 1 MB, target klien < 300 KB): sederhana, ikut cadangan DB, tanpa layanan
penyimpanan tambahan. Pindah ke object storage bila volume membesar.

**Background Sync** didaftarkan bila ada (Chrome/Android), tetapi pemicu utama tetap halaman: buka aplikasi, event
`online`, tab aktif lagi, tombol "Sinkronkan sekarang", dan setiap 60 detik. iOS Safari tidak mendukung Background Sync.

## Autentikasi

- **PIN 6 angka**: mudah bagi pengguna awam, tetapi hanya satu juta kombinasi. Mitigasi: 5 salah beruntun mengunci akun
  15 menit (per akun, di DB), dan respons "Username atau PIN salah" tidak membedakan penyebab. Pembatasan per IP belum ada
  (perlu lapisan di depan aplikasi, mis. reverse proxy).
- **bcryptjs (cost 10)** dipilih daripada argon2: murni JavaScript, tanpa build native di Windows/serverless. Dokumen
  membolehkan argon2 atau bcrypt.
- **Sesi**: JWT HS256 di cookie `httpOnly` 30 hari. **Peran dibaca dari database di setiap request**, bukan dari token,
  sehingga perubahan peran/penonaktifan langsung berlaku. Salinan sesi (nama, peran, kedaluwarsa) disimpan di
  `localStorage` agar aplikasi bisa dibuka offline. Server menjawab 401 → sesi lokal ditandai kedaluwarsa → mode baca saja,
  data yang belum terkirim tidak dihapus.
- **Ganti akun di satu HP**: bila masih ada antrean `menunggu` milik akun sebelumnya, login akun lain ditolak
  (supaya perubahan akun A tidak terkirim memakai sesi akun B). Tanpa antrean, data lokal dikosongkan.
- **Username unik per organisasi**; MVP satu organisasi sehingga login mencari username langsung. Saat multi-organisasi,
  tambahkan kode organisasi di formulir masuk.
- **Kontak anggota** (HP, alamat, tanggal lahir) disaring **di server** untuk peran Anggota; data dirinya sendiri utuh.
  Konsekuensi: data yang sudah pernah diunduh (mis. sebelum diturunkan perannya) tetap ada di HP itu. Saat peran berubah,
  klien mengambil ulang seluruh data agar naik-peran langsung terisi.

## Arsitektur klien

- **Semua halaman aplikasi dirender di klien** dan membaca IndexedDB; hak akses ditegakkan di API. Dengan begitu HTML
  halaman statis, bisa di-precache, dan cangkang terbuka offline. Konsekuensinya tidak ada route dinamis `[id]`:
  detail kegiatan memakai `/kegiatan/detail?id=…`, dan tambah/ubah anggota/kegiatan memakai lembar (sheet), agar semua
  rute dikenal service worker sejak pemasangan.
- **Serwist butuh webpack**: `next build --webpack`. Pendaftaran service worker dilakukan sendiri (`SwRegister`);
  opsi bawaan `register`/`reloadOnOnline` dimatikan karena memicu navigasi offline kembali ke halaman sebelumnya dan
  memuat ulang halaman (membuang isian formulir) saat sinyal kembali.
- **Dexie `version(1)`** tidak boleh diubah; perubahan skema = blok `version(n+1)` baru dengan `upgrade()` (lihat komentar
  di `src/lib/db/local.ts`). Data lokal dan antrean selamat saat aplikasi diperbarui.
- **Tanggal**: kolom tanggal saja (`YYYY-MM-DD`) diperlakukan sebagai string agar bebas pergeseran zona waktu; cap waktu
  memakai ISO UTC dengan milidetik. Jam perangkat yang meleset memengaruhi last-write-wins (risiko diterima di MVP).
- **Batas usia**: Karang Taruna 13–45 tahun. "Mendekati" = usia 44–45, "Lewat" = 46+. Anggota biasa tidak melihat
  penanda ini (tanggal lahir mereka tidak diunduh).
- **Hapus anggota/kegiatan** = soft delete (`deleted_at`) yang ikut tersinkron sebagai tombstone. Kas tidak pernah dihapus.

## Ikon

- **Font Awesome 7 Free** lewat paket npm (`@fortawesome/react-fontawesome` + `free-solid` + `free-brands`), bukan Kit/CDN:
  ikon ikut ter-bundle dan ter-precache sehingga tetap tampil offline, tanpa akun atau token.
- Gaya yang tersedia di Free hanya **Solid, Regular, Brands**. Gaya lain (Duotone, Sharp, Light, Thin) hanya Pro.
  Dipakai: Solid untuk antarmuka dan Brands untuk logo (WhatsApp, Android, Apple). Regular tidak dipasang.
- Semua ikon didaftarkan di **satu berkas** (`src/components/ui/icons.tsx`) dan komponen hanya memakai `IconXxx`.
  Pindah ke Pro/Duotone nanti = ubah berkas itu (dan setup paket), bukan puluhan halaman.
- CSS Font Awesome dimuat dengan `@import ... layer(components)` di `globals.css` agar kelas ukuran Tailwind menang atas
  `height:1em` bawaan FA. Tanpa ini ikon `size-5` tampil 1em. Ikon diberi `shrink-0` supaya tidak menyusut di baris flex.
- Ciri khas visual ada di `globals.css` (arah "Buku Kas Folio"): kolom tanggal bergaris merah ganda, jumlah bergaris bawah ganda, stempel LUNAS, coretan stabilo. Ikon hanya dipakai bila membantu fungsi (navigasi, aksi), bukan hiasan.

## Tema tampilan

- **Per perangkat, bukan per akun.** Pilihan di `localStorage` (`perdana.tema`): berlaku offline, tanpa migrasi database,
  dan HP bersama tidak saling menimpa. Konsekuensinya pilihan tidak ikut pindah ke HP lain.
- **Variabel CSS untuk warna/huruf/radius, varian `ios:` untuk bentuk.** Token `pulpen/merah/stempel/stabilo` tetap dipakai di
  semua komponen; tema iOS hanya mengganti nilainya, jadi satu komponen melayani dua tema.
- **Warna iOS disesuaikan untuk kontras.** Biru sistem #007AFF hanya 4:1 dengan putih; dipakai #0066CC (AA untuk teks kecil).
  Begitu juga merah #D70015 dan hijau #1F7A35.
- **Mode gelap belum ada** (iOS punya, tetapi bukan permintaan saat ini).
- **Saldo bisa disembunyikan** di kartu beranda (`perdana.saldoSembunyi`), seperti aplikasi bank; tersimpan per HP.

## Penerangan, struktur, denda

- **Hanya satu entitas sinkron baru (`lightingIssue`).** Struktur organisasi dan denda dihitung dari data yang
  sudah ada (jabatan anggota, absensi, kas), jadi tidak ada tabel dan tidak ada sumber kebenaran ganda.
- **Lampu: siapa pun melapor, hanya Ketua dan S. Kelistrikan yang menindaklanjuti.** Laporan dari lapangan paling
  berharga saat sinyal jelek, maka lewat antrean offline seperti kas. `create` pada baris yang sudah ada tidak menimpa;
  perubahan wajib `update` yang dibatasi peran.
- **Struktur = anggota aktif dengan jabatan selain "Anggota".** Mengubah jabatan di daftar anggota otomatis mengubah
  bagan. Periode (tahun mulai, +2 tahun menurut Pasal 11) disimpan di organisasi dan hanya bisa diubah online.
  Riwayat periode sebelumnya belum ada.
- **Denda = jumlah alpa x satu tarif; dibayar = kas kategori Denda per anggota.** Tarif tidak tertulis di naskah AD/ART
  (Pasal 9), jadi diisi Ketua atau S. Denda dan berlaku surut. Hanya "alpa" yang ditulis eksplisit yang didenda: anggota
  yang belum diabsen tidak dianggap alpa. Denda pelanggaran (Rp3.000.000/Rp5.000.000) tidak dihitung otomatis; dicatat
  sebagai pembayaran di kas. Anggota biasa hanya melihat dendanya sendiri.
- **Pengaturan organisasi lewat `PATCH /api/organization`, online saja**: jarang berubah, dan semua perangkat harus
  memakai nilai yang sama.

## Alat dan versi

- **TypeScript 6 + ESLint 9** (bukan 7 / 10): `typescript-eslint` belum mendukung TypeScript 7 dan
  `eslint-plugin-react` belum mendukung ESLint 10. Naikkan setelah keduanya mendukung.
- **Prisma 7** memakai driver adapter (`@prisma/adapter-pg`) dan `prisma.config.ts`; klien dibuat ke `src/generated/prisma`
  (tidak di-commit; `pnpm build` menjalankan `prisma generate`).
- Migrasi pertama menambahkan `CREATE SEQUENCE server_seq` secara manual di atas SQL yang dibuat Prisma.
- Tes server berjalan ke PostgreSQL asli (`perdana_test`, dibuat otomatis) karena yang diuji justru perilaku transaksi,
  kunci, dan batas unik.

## Belum dikerjakan (sengaja)

- **Foto profil anggota** (opsional di dokumen).
- **Gaya ikon Pro** (Duotone/Sharp/dst.): butuh langganan FA Pro dan Kit; lihat bagian Ikon.
- **Mode gelap** (prioritas rendah di dokumen).
- **Pengujian di perangkat nyata (Android dan iPhone)**: Fase 5 meminta ini. Yang sudah diuji: Chrome desktop (emulasi
  layar HP dan offline), termasuk mati-hidup jaringan dan muat ulang saat offline. Cek di iPhone terutama untuk:
  pemasangan ke layar utama, ketahanan IndexedDB, dan kamera untuk foto nota.
- **Audit Lighthouse** penuh. Yang sudah dicek: manifest valid dan Chrome melaporkan aplikasi dapat dipasang
  (tanpa galat installability), service worker aktif, rute cangkang ter-precache.
- Pembatasan percobaan login per IP; pembersihan tombstone lama; pemulihan PIN mandiri (saat ini lewat Ketua).
