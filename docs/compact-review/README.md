# Audit kepadatan dan komposisi COLIBRI MED

Revisi ini memisahkan kebutuhan halaman pengantar, login, daftar kerja, peta dan formulir. Identitas navy–teal, logo, ilustrasi helikopter, data dan integrasi yang ada tetap digunakan. Tidak ada deploy/publish atau perubahan backend.

## Hasil ukuran aktual

Diukur dengan Chromium pada halaman yang sama, Administrator demo, data seed awal, viewport dan waktu browser tetap. Nilai merupakan koordinat dokumen dari atas halaman, dibulatkan ke piksel; pengambilan dilakukan pada scroll awal 0. Tile peta sengaja diblokir untuk merekam fallback yang konsisten. ID sintetis dapat berbeda antar konteks browser.

| Ukuran                              | Viewport | Sebelum | Sesudah |
| ----------------------------------- | -------- | ------: | ------: |
| Tinggi header daftar                | 1366 px  |   80 px |   72 px |
| Tinggi header daftar                | 390 px   |   86 px |  107 px |
| Batas bawah judul daftar            | 1366 px  |  283 px |  154 px |
| Batas bawah judul daftar            | 390 px   |  425 px |  246 px |
| Batas bawah filter daftar           | 1366 px  |  467 px |  244 px |
| Batas bawah filter daftar           | 390 px   |  717 px |  421 px |
| Awal daftar permohonan              | 1366 px  |  505 px |  256 px |
| Awal daftar permohonan              | 390 px   |  735 px |  433 px |
| Awal peta helikopter                | 1366 px  |  620 px |  339 px |
| Awal peta helikopter                | 390 px   |  614 px |  472 px |
| Awal peta fasilitas                 | 1366 px  |  540 px |  269 px |
| Awal peta fasilitas                 | 390 px   |  830 px |  446 px |
| Lebar daftar tanpa detail eksplisit | 1366 px  |  444 px |  992 px |
| Lebar daftar tanpa detail eksplisit | 390 px   |  350 px |  350 px |
| Tinggi formulir                     | 1366 px  | 2248 px | 1802 px |
| Tinggi formulir                     | 390 px   | 2877 px | 2757 px |
| Tinggi dokumen formulir             | 1366 px  | 2586 px | 2023 px |
| Tinggi dokumen formulir             | 390 px   | 3303 px | 3105 px |
| Tinggi dokumen login                | 1366 px  |  986 px |  866 px |
| Tinggi dokumen login                | 390 px   | 1622 px | 1626 px |

Pada desktop, judul daftar selesai pada sekitar 154 px, filter 244 px, dan daftar mulai 256 px. Peta helikopter mulai 339 px dan fasilitas 269 px. Pengurangan berasal dari penggabungan header/status, penghilangan banner kerja dan kembali yang tidak diperlukan, filter inline, serta penempatan indikator refresh yang tidak mengubah tinggi layout. Input tetap minimal 16 px dan kontrol tetap minimal 44 px.

Sebelumnya desktop otomatis membuka detail pertama (daftar sekitar 444 px, detail 600 px) walau belum dipilih secara eksplisit. Kini daftar memakai lebar penuh sekitar 992 px, lalu beralih dua kolom setelah **Lihat detail**. Panel objek pada peta helikopter tetap 360 px; panel fasilitas 340 px ketika ruang mencukupi. Seluruh geometri mentah ada di [before-metrics.json](before-metrics.json) dan [after-metrics.json](after-metrics.json).

## Revisi per halaman

- **Beranda publik:** nama COLIBRI MED, tagline Koordinasi Medis Udara, heading dengan pembungkusan disengaja, CTA Coba simulasi dan Masuk petugas, Jelajahi demo, akses admin lebih ringkas dan alur simulasi empat tahap. Penjelasan lengkap tetap di halaman Tentang.
- **Shell kerja:** satu header ringkas mengelompokkan identitas, status perangkat, demo dan akun; judul, pembaruan, buat permohonan serta Refresh ditempatkan pada toolbar terang. Kembali hanya ditampilkan untuk konteks turunan/formulir yang membutuhkan.
- **Permohonan:** pencarian/filter/reset sejajar pada desktop, membungkus pada ponsel. Detail eksplisit dapat dibuka dan ditutup. Nama fasilitas/status menjadi prioritas; tombol terlihat sebagai Lihat detail dan referensi teknis tetap tersedia lewat metadata serta nama aksesibel.
- **Peta helikopter:** komposisi peta/panel yang sudah ada dipertahankan dengan ruang atas lebih ringkas. Kontrol fokus, semua objek, legenda, status posisi sintetis dan atribusi tetap ada.
- **Fasilitas:** peta di kiri dan direktori/ringkasan pilihan di panel kanan desktop. Pada mobile panel dapat diperluas. Marker menyelaraskan nama, status, deskripsi dan koordinat pada ringkasan pilihan; daftar dan pengelolaan yang ada tetap dapat diakses.
- **Formulir:** field di kolom utama dan pemeriksaan di panel samping desktop, sticky tanpa scroll internal. Mobile satu kolom, ringkasan dekat tindakan dan tombol kirim penuh. Draft dan validasi yang tersedia dipertahankan.
- **Login:** kartu peran dan ilustrasi dipertahankan; tagline konsisten, panel pada layar pendek dipadatkan, nama panjang tetap membungkus saat teks diperbesar, dan grid beralih satu kolom pada lebar menengah.
- **Loading:** refresh mempertahankan data lama dengan indikator kecil Memperbarui…. Ruang indikator umum tetap; pada toolbar daftar indikator ada di tombol dengan lebar tetap dan status pembaca layar. Error dan retry tetap ditampilkan.

## Screenshot sebelum–sesudah

Konteks awal/URL dan state default yang sama, 390×844 dan 1366×768. Perbedaan detail otomatis versus eksplisit adalah bagian revisi, bukan perubahan data. Browser memakai waktu tetap 3 November 2026 12:00 UTC untuk kedua fase. Screenshot full-page menempatkan navigasi fixed pada lokasi viewport saat capture. Kondisi tile gagal tidak mengklaim peta offline tersedia.

| Halaman    | Mobile sebelum                      | Mobile sesudah                    | Desktop sebelum                      | Desktop sesudah                    |
| ---------- | ----------------------------------- | --------------------------------- | ------------------------------------ | ---------------------------------- |
| Beranda    | [before](before-public-390.png)     | [after](after-public-390.png)     | [before](before-public-1366.png)     | [after](after-public-1366.png)     |
| Login      | [before](before-login-390.png)      | [after](after-login-390.png)      | [before](before-login-1366.png)      | [after](after-login-1366.png)      |
| Permohonan | [before](before-requests-390.png)   | [after](after-requests-390.png)   | [before](before-requests-1366.png)   | [after](after-requests-1366.png)   |
| Helikopter | [before](before-aircraft-390.png)   | [after](after-aircraft-390.png)   | [before](before-aircraft-1366.png)   | [after](after-aircraft-1366.png)   |
| Fasilitas  | [before](before-facilities-390.png) | [after](after-facilities-390.png) | [before](before-facilities-1366.png) | [after](after-facilities-1366.png) |
| Formulir   | [before](before-form-390.png)       | [after](after-form-390.png)       | [before](before-form-1366.png)       | [after](after-form-1366.png)       |

Untuk mengukur ulang state saat ini, jalankan server pada 5174 lalu `node scripts/audit-layout.mjs after`. `DESIGN_BASE_URL` dan `CHROMIUM_PATH` dapat disesuaikan. Capture sebelum berasal dari checkout awal sesi ini; jangan menimpa screenshot baseline dengan source sesudah.

## Verifikasi dan batas

- 83 unit/mock tests lulus.
- Build TypeScript/Vite, pemeriksaan marker server-only, Prettier dan diff checks lulus. Peringatan anotasi Zod dan chunk >500 kB tetap ada.
- Suite awal 73 browser tests: 67 lulus. Kegagalan mengungkap selector lama untuk detail/direktori yang sekarang dibuka eksplisit, pembungkusan teks login saat diperbesar, sinkronisasi formulir helikopter, serta timeout pada rangkaian 13 halaman. Setelah penyesuaian, uji ulang terkait mencatat 43/46 lulus; dua batas geometri dan sinkronisasi form yang masih gagal kemudian diperbaiki. Run final modul helikopter dan enam viewport lulus 10/10. Seluruh 79 skenario (73 lama dan 6 baru) telah lulus lintas run; ini bukan klaim satu eksekusi penuh 79/79.
- Enam tes tambahan memeriksa 320×568, 390×844, 430×932, 768×1024, 1366×768 dan 1440×900: buka/tutup detail, batas posisi isi desktop, kestabilan geometri saat refresh, sinkronisasi panel fasilitas, overflow, dan input minimal 16 px. Suite yang tersedia juga mencakup keyboard, zoom teks, draft, outbox, sesi, izin peran dan ekspor.
- Formulir laporan awak kini menampilkan identitas helikopter tujuan dan nama aksesibel. Tes menunggu identitas itu sesuai sebelum mengisi, sehingga navigasi pilihan tidak berlomba dengan pengisian form lama. API dan data penyimpanannya tidak diubah.

Belum diuji: Safari/Firefox, pembaca layar serta perangkat fisik, integrasi Google Sheets/Vercel produksi dan tile jaringan nyata. Tidak ada fitur operasional baru, dependency baru atau perubahan lockfile.

## File revisi ini

- `e2e/admin-flight.spec.ts`
- `e2e/compact-layout.spec.ts`
- `e2e/mobile-functional.spec.ts`
- `e2e/mobile.spec.ts`
- `e2e/refinements.spec.ts`
- `e2e/workflow.spec.ts`
- `scripts/audit-layout.mjs`
- `src/compact-layout.css`
- `src/components/AsyncState.tsx`
- `src/components/LocationMap.tsx`
- `src/components/RecordTable.tsx`
- `src/features/aircraft/AircraftReportForm.tsx`
- `src/main.tsx`
- `src/pages/Internal.tsx`
- `src/pages/Mobile.tsx`
- `src/pages/MobileDemoLogin.tsx`
- `src/pages/Public.tsx`

Dokumentasi: README ini, dua berkas metrik JSON dan 24 screenshot di `docs/compact-review/`.
