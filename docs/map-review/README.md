# Peta dan koordinasi helikopter — review lanjutan

Halaman pemantauan kini memakai peta utama dengan panel detail 360 px pada desktop. Pada mobile, panel ringkas/diperluas berada di kaki peta dalam alur dokumen: tombol native `<summary>` dapat dibuka dengan sentuhan atau keyboard, tanpa drag, focus trap, scroll bersarang, maupun overlay yang menutupi kontrol/atribusi/navigasi bawah.

## Perubahan

- Header dan pengantar dipadatkan; pencarian/filter helikopter berada dalam toolbar lipat. Pilihan tetap disimpan di URL dan dipakai bersama oleh marker, kartu, panel ringkasan serta laporan.
- Marker helikopter SVG 48 px, fasilitas berbentuk kotak dengan simbol medis, dan permohonan berbentuk pin. Pilihan aktif memiliki halo, z-index lebih tinggi, label, status teks dan centang.
- Kontrol fokus pilihan, tampilkan seluruh objek, legenda lipat, zoom 44 px dan coba muat ulang tile. OpenStreetMap/Leaflet dan atribusinya dipertahankan.
- Kartu helikopter berisi kode, nama, status, waktu posisi, koordinat dan tombol pilih. Daftar mobile dapat digeser dan semua tombol tetap dapat difokuskan dengan keyboard; desktop menggunakan daftar vertikal.
- Panel objek terpilih memuat posisi tersimpan dalam bagian lipat, laporan awak terbaru, misi terkait jika ada, serta tautan menuju laporan lengkap/daftar misi. Snapshot hanya menyediakan ID/status misi, sehingga tautan misi membuka daftar yang tersedia; tidak dibuat rute detail berbasis ID permohonan palsu.
- Laporan awak ditata sebagai timeline dengan ikon kategori, waktu, status, isi asli, lokasi, pencarian, jumlah hasil, reset filter dan empty state yang memiliki tindakan nyata.
- Detail misi menampilkan asal, fasilitas penerima, tim, helikopter, tahap terakhir dan timeline vertikal. Tahap yang tidak punya kejadian ditandai **Belum tercatat**, tanpa menyimpulkan bahwa riwayat yang hilang telah selesai atau mengarang ETA/progres.
- Status offline, error data dan kegagalan tile dipisahkan. Data tersimpan tetap dapat dibaca tanpa menjanjikan basemap offline. Reduced-motion menonaktifkan playback dan menghentikannya bila preferensi berubah.

## Screenshot

Data sintetis dari paket latihan aplikasi; tile sengaja diblokir untuk memverifikasi fallback. Screenshot mobile 390 × 844 dan desktop 1366 × 768. Waktu, ID dan jumlah data antar capture dapat berbeda. Screenshot full-page merekam navigasi fixed pada viewport pengambilan.

| Halaman                | Mobile                         | Desktop                          |
| ---------------------- | ------------------------------ | -------------------------------- |
| Peta · panel ringkas   | [390 px](map-390-compact.png)  | [1366 px](map-1366-compact.png)  |
| Peta · panel diperluas | [390 px](map-390-expanded.png) | [1366 px](map-1366-expanded.png) |
| Detail misi            | [390 px](mission-390.png)      | [1366 px](mission-1366.png)      |

## Verifikasi

- `npm test`: 83 unit/mock tests lulus.
- `npm run build`: TypeScript, Vite dan pemeriksaan marker server-only lulus. Peringatan anotasi Zod dan chunk >500 kB masih ada.
- `npm run format:check` dan `git diff --check`: lulus.
- Suite regresi 68 skenario: 66 lulus pada run pertama; satu selector laporan menjadi ambigu karena ringkasan terbaru kini juga memuat isi laporan, dan satu pengujian sesi mobile gagal sementara. Selector dibatasi pada daftar laporan yang dimaksud. Seluruh 12 tes ulang modul helikopter, mobile dan peta baru lulus tanpa perubahan perilaku sesi.
- Lima tes peta baru memeriksa 320×568, 390×844, 430×932, 768×1024 dan 1366×768: pemilihan marker melalui keyboard, keselarasan kartu/peta, panel ringkas/diperluas, atribusi, reset laporan, overflow dan reduced-motion. Seluruh lima tes final juga lulus setelah memverifikasi filter marker dan reset pencarian.
- Suite yang tersedia juga menguji teks diperbesar, focus state, izin peran, draft/offline, timeline misi, serta ekspor CSV/PDF.

Batas: Chromium Linux; Safari/Firefox, screen reader/perangkat fisik, integrasi Google Sheets/Vercel produksi dan unduhan tile jaringan nyata belum diverifikasi. Gestur drag tidak ditambahkan; tersedia kontrol buka/tutup yang dapat diakses. Tidak ada deploy/publish, layanan berbayar, dependency baru, atau perubahan backend.

## File yang diubah pada lanjutan ini

- `src/pages/AirOperations.tsx`
- `src/pages/Internal.tsx`
- `src/components/AircraftMap.tsx`
- `src/components/LocationMap.tsx`
- `src/components/MapControls.tsx` (baru)
- `src/components/MissionOverview.tsx` (baru)
- `src/air-coordination.css` (baru)
- `src/main.tsx`
- `e2e/admin-flight.spec.ts`
- `e2e/map-coordination.spec.ts` (baru)
- `docs/map-review/README.md` dan enam screenshot
