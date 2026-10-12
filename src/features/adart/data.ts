/**
 * Naskah AD/ART Karang Taruna "Perdana" (disahkan 6 April 2018).
 * Isi aturan mengikuti naskah yang sudah dirapikan (AD-ART-Karang-Taruna-Perdana-Blorong.md);
 * nomor pasal tidak diubah. Perubahan AD/ART (Pasal 13 ayat 2) = ubah berkas ini.
 * Teks mendukung **tebal** untuk nominal.
 */

/** Satu ayat. `sub` = butir berhuruf (a, b, c) di bawahnya. */
export type Butir = { teks: string; sub?: string[] };

export type Pasal = {
  no: number;
  /** Judul pasal bila naskah memberinya (mis. "Hak anggota"). */
  judul?: string;
  /** Kalimat pengantar sebelum daftar ayat. */
  pengantar?: string;
  /** Pasal satu paragraf tanpa ayat. */
  teks?: string;
  ayat?: Butir[];
  /** Ayat diberi huruf (a, b, c), bukan angka. */
  huruf?: boolean;
  /** Naskah asli menandai pasal ini kosong ([BELUM DIATUR]). */
  belumDiatur?: boolean;
};

export type Bab = {
  /** Angka romawi, juga dipakai sebagai id anchor (`bab-vi`). */
  no: string;
  judul: string;
  /** Nama pendek untuk tombol lompat cepat. */
  singkat: string;
  bagian: "AD" | "ART";
  pasal: Pasal[];
};

export const JUDUL = 'Karang Taruna "PERDANA"';
export const DISAHKAN = "6 April 2018";

export const MUKADIMAH =
  "Untuk mewujudkan perkumpulan Karang Taruna ini menjadi organisasi yang dapat mengembangkan aktivitas dan kreativitas para anggotanya, serta menyadari hal tersebut, maka sebagai suatu organisasi perlu disusun Anggaran Dasar dan Anggaran Rumah Tangga (AD/ART) Karang Taruna sebagai berikut.";

export const BAGIAN_LABEL = {
  AD: "Anggaran Dasar (AD)",
  ART: "Anggaran Rumah Tangga (ART)",
} as const;

export const BAB: Bab[] = [
  {
    no: "I",
    judul: "Nama dan tempat kedudukan",
    singkat: "Nama",
    bagian: "AD",
    pasal: [
      { no: 1, teks: 'Organisasi ini bernama Karang Taruna "PERDANA".' },
      {
        no: 2,
        teks: 'Karang Taruna "PERDANA" berkedudukan di Dusun Blorong, Desa Blorong, Kecamatan Jumantono, Kabupaten Karanganyar.',
      },
    ],
  },
  {
    no: "II",
    judul: "Dasar / asas",
    singkat: "Asas",
    bagian: "AD",
    pasal: [
      {
        no: 3,
        teks: "Organisasi ini berdasar dan berasas pada Pancasila dan Undang-Undang Dasar 1945.",
      },
    ],
  },
  {
    no: "III",
    judul: "Lambang",
    singkat: "Lambang",
    bagian: "AD",
    pasal: [
      {
        no: 4,
        teks: "Lambang organisasi belum dijelaskan dalam naskah asli.",
        belumDiatur: true,
      },
    ],
  },
  {
    no: "IV",
    judul: "Tujuan",
    singkat: "Tujuan",
    bagian: "AD",
    pasal: [
      {
        no: 5,
        teks: "Tujuan organisasi Karang Taruna ini adalah sebagai sarana belajar berorganisasi bagi para pemuda di Dusun Blorong.",
      },
    ],
  },
  {
    no: "V",
    judul: "Keanggotaan",
    singkat: "Keanggotaan",
    bagian: "ART",
    pasal: [
      {
        no: 6,
        ayat: [
          {
            teks: "Anggota Karang Taruna adalah semua pemuda Dusun Blorong yang berusia minimal 12 tahun (setara usia SMP).",
          },
          { teks: "Bagi anggota Karang Taruna yang merantau berlaku kewajiban tersendiri." },
          { teks: "Anggota yang tidak menaati peraturan dikenai sanksi dari Karang Taruna." },
        ],
      },
      { no: 7, teks: "Ketentuan mengenai hak dan kewajiban anggota diatur dalam Bab VI." },
    ],
  },
  {
    no: "VI",
    judul: "Hak dan kewajiban anggota",
    singkat: "Hak & kewajiban",
    bagian: "ART",
    pasal: [
      {
        no: 8,
        judul: "Hak anggota",
        pengantar: "Setiap anggota mempunyai hak:",
        huruf: true,
        ayat: [
          { teks: "menghadiri pertemuan, mengemukakan pendapat, dan memberikan suara;" },
          { teks: "memilih dan dipilih menjadi pengurus;" },
          { teks: "mengikuti kegiatan yang diadakan Karang Taruna;" },
          {
            teks: "memberikan usulan, masukan, saran, dan koreksi/kritik kepada pengurus dengan cara dan tujuan yang baik.",
          },
        ],
      },
      {
        no: 9,
        judul: "Kewajiban anggota",
        pengantar: "Setiap anggota mempunyai kewajiban:",
        ayat: [
          {
            teks: "Menghadiri pertemuan rutin. Anggota yang tidak hadir tanpa alasan dikenai denda yang sudah ditetapkan. Apabila tidak hadir lebih dari 3 kali, dikenai sanksi yang berbeda sebagaimana yang sudah ditetapkan anggota Karang Taruna.",
          },
          { teks: "Setia dan patuh pada peraturan organisasi." },
          {
            teks: "Mengikuti kegiatan Karang Taruna. Anggota yang berhalangan hadir tanpa keterangan dikenai sanksi yang sudah ditetapkan. Apabila berhalangan hadir 3 kali berturut-turut tanpa keterangan, dikenai sanksi yang berbeda sebagaimana yang sudah ditetapkan.",
          },
          { teks: "Bertanggung jawab atas segala sesuatu yang dibebankan kepadanya." },
          { teks: "Membayar iuran wajib (iuran bulanan) yang jumlahnya telah ditetapkan." },
          {
            teks: "Membayar iuran tahunan (bagi anggota yang merantau) yang jumlahnya sudah ditentukan.",
          },
          {
            teks: "Menjaga nama baik Karang Taruna. Pelanggaran dikenai sanksi sesuai dengan kesalahan yang dibuat:",
            sub: [
              "Mencuri, tindak kriminal, dan perbuatan yang merugikan masyarakat luas dikenai denda sebesar **Rp3.000.000,00**.",
              "Perbuatan tidak terpuji seperti hamil di luar nikah, menghamili, dan perbuatan asusila yang meresahkan masyarakat dikenai denda sebesar **Rp5.000.000,00**.",
            ],
          },
        ],
      },
    ],
  },
  {
    no: "VII",
    judul: "Musyawarah",
    singkat: "Musyawarah",
    bagian: "ART",
    pasal: [
      {
        no: 10,
        ayat: [
          { teks: "Pertemuan rutin diadakan setiap 35 hari sekali, pada malam Minggu pertama." },
          { teks: "Apabila ada masalah mendesak, pertemuan dapat dimajukan atau diundur." },
        ],
      },
    ],
  },
  {
    no: "VIII",
    judul: "Pengurus",
    singkat: "Pengurus",
    bagian: "ART",
    pasal: [
      {
        no: 11,
        ayat: [
          {
            teks: "Pengurus Karang Taruna terdiri dari ketua, wakil ketua, sekretaris, bendahara, dan beberapa seksi.",
          },
          { teks: "Pengurus adalah anggota Karang Taruna yang dipilih melalui pemilihan." },
          {
            teks: "Masa jabatan pengurus dalam satu periode adalah 2 tahun dan dapat dipilih kembali.",
          },
        ],
      },
    ],
  },
  {
    no: "IX",
    judul: "Sumber dana",
    singkat: "Sumber dana",
    bagian: "ART",
    pasal: [
      {
        no: 12,
        ayat: [
          {
            teks: "Sumber dana keuangan diperoleh dari sumber-sumber yang resmi, halal, dan tidak mengikat.",
          },
          {
            teks: "Sumber dana keuangan berasal dari:",
            sub: [
              "iuran bulanan;",
              "iuran tahunan;",
              "rekening listrik;",
              "sumbangan warga;",
              "usaha-usaha lain yang halal.",
            ],
          },
        ],
      },
    ],
  },
  {
    no: "X",
    judul: "Penutup",
    singkat: "Penutup",
    bagian: "ART",
    pasal: [
      {
        no: 13,
        ayat: [
          {
            teks: "Segala sesuatu yang belum diatur dalam AD/ART ini akan ditetapkan oleh pengurus Karang Taruna.",
          },
          {
            teks: "Apabila terdapat kesalahan dalam AD/ART ini, dapat dilakukan perubahan melalui rapat pengurus.",
          },
        ],
      },
    ],
  },
];

/** Hal yang disebut "sudah ditetapkan" di naskah tetapi tidak tertulis. `isi: null` = belum tertulis. */
export const BELUM_TERTULIS: { pasal: string; hal: string; isi: string | null }[] = [
  { pasal: "Pasal 9 ayat 1", hal: "Denda tidak hadir pertemuan rutin", isi: null },
  { pasal: "Pasal 9 ayat 1", hal: "Sanksi tidak hadir lebih dari 3 kali", isi: null },
  { pasal: "Pasal 9 ayat 3", hal: "Sanksi tidak hadir kegiatan tanpa keterangan", isi: null },
  { pasal: "Pasal 9 ayat 3", hal: "Sanksi tidak hadir 3 kali berturut-turut", isi: null },
  { pasal: "Pasal 9 ayat 5", hal: "Jumlah iuran bulanan", isi: null },
  { pasal: "Pasal 9 ayat 6", hal: "Jumlah iuran tahunan (perantau)", isi: null },
  {
    pasal: "Pasal 6 ayat 2",
    hal: "Kewajiban tersendiri anggota perantau",
    isi: "Hanya iuran tahunan (Pasal 9 ayat 6)",
  },
];

export const CATATAN_PENYUSUNAN =
  "Naskah ini versi yang dirapikan dari AD/ART yang disahkan pada 6 April 2018. Isi aturan tidak diubah: yang diperbaiki hanya salah ketik, tata bahasa, dan susunan. Nomor pasal mengikuti naskah asli.";
