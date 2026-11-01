# COLIBRI MED — pengalaman koordinasi mobile

Implementasi pada rute `/mobile` dan halaman turunannya. Desain memakai navy, teal, permukaan terang, font sistem, ikon Lucide, dan aset logo asli. Login pada perubahan sebelumnya ikut disertakan dalam branch ini. Tidak ada dependensi, API key, backend, atau autentikasi baru.

## Halaman yang selesai

| Halaman       | Implementasi                                                                                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login         | Radio native tujuh peran, tombol dinamis, ilustrasi generik, indikator konektivitas perangkat.                                                                                                                              |
| Beranda       | Sapaan dan peran dari sesi, aksi permohonan untuk publik/Operator/Administrator, dua indikator dari `reports.summary`, maksimal tiga misi tersimpan dengan tautan detail. Viewer tetap menggunakan dashboard agregatnya.    |
| Permohonan    | Pencarian/filter yang sudah bekerja, kartu dengan asal, referensi, waktu dan status; desktop memakai daftar–detail berdampingan.                                                                                            |
| Formulir      | Kelompok identitas/fasilitas, lokasi/akses, kebutuhan, dan peta. Label wajib, validasi native + Zod, error dekat field, fokus pada error pertama, isian dipertahankan.                                                      |
| Misi & detail | Tim, referensi, asal terkait, waktu pembaruan, status dan riwayat dari `ActivityLogs`. Jadwal/tujuan yang tidak tersedia dinyatakan belum tersedia; tidak ada progres persentase atau timeline masa depan yang dibuat-buat. |
| Peta          | Leaflet/OpenStreetMap tetap dipakai; marker fasilitas/permohonan dibedakan dengan legenda, popup bisa ditutup, marker dapat dibuka dengan keyboard, zoom dan tombol tutup 44px. Fallback daftar/koordinat tetap tersedia.   |
| Akun          | Profil dan peran dari sesi, daftar modul/preferensi yang berfungsi, logout, informasi aplikasi.                                                                                                                             |

Shell mempertahankan lima tujuan navigasi dan pengalihan Viewer. Header ringkas, badge mode, tautan kembali pada halaman turunan, safe area, focus, pressed/disabled/error/success/empty state, dan ruang bawah yang mengikuti tinggi navigasi. Tidak ada badge jumlah atau kesiapan palsu.

## File dan komponen

- `src/mobile-experience.css`: token dan primitive visual untuk header, navigasi, tombol, input, card, formulir, peta, daftar, status, dan layout tablet/desktop; dicakup pada `.coordination-app`.
- `src/main.tsx`: mengaktifkan cakupan visual hanya pada shell mobile operasional, bukan dashboard pimpinan.
- `src/pages/Mobile.tsx`: shell/header/navigasi, Beranda, Akun, tautan kembali dan pengukuran tinggi navigasi.
- `src/components/MobileOverview.tsx`: ringkasan dan misi dari data tersimpan; tidak dipasang untuk Viewer.
- `src/components/MobileUI.tsx`: status badge, empty state, section heading yang dipakai ulang.
- `src/components/FlightAccent.tsx`: ilustrasi helikopter generik yang dipakai Beranda dan Login; tidak mengklaim akurasi teknis Colibri.
- `src/components/RecordTable.tsx`: daftar compact, metadata, hubungan asal, badge, dan empty state. Tabel website tetap dipertahankan.
- `src/components/LocationMap.tsx`: legenda, marker dengan keyboard, warna jenis lokasi.
- `src/pages/Internal.tsx`: label filter, data terkait, ringkasan misi dan riwayat kejadian tersimpan, feedback hasil aksi.
- `src/pages/Public.tsx`: pengelompokan formulir dan error field; schema, field, draft/outbox dan submit yang sudah ada dipertahankan.
- `src/pages/MobileDemoLogin.tsx`, `src/pages/mobile-login.css`: menggunakan ilustrasi reusable dan menjaga style login dari perubahan shell bersama.
- `e2e/mobile-experience.spec.ts`: enam ukuran viewport untuk seluruh halaman, pemulihan validasi, serta ringkasan/riwayat dari alur misi nyata.
- Perubahan login terdahulu juga mencakup `src/pages/Login.tsx`, `e2e/mobile-login.spec.ts`, dan penyesuaian locator pada `e2e/mobile.spec.ts` / `e2e/mobile-functional.spec.ts`.

## Screenshot

Diambil dengan Chromium pada data sintetis. Misi dibuat melalui transisi dan penugasan yang benar-benar didukung aplikasi, bukan mengganti seed. Masing-masing viewport memakai penyimpanan browser terisolasi. Tile sengaja diblokir untuk menunjukkan fallback yang jujur; pengujian tidak mengunduh tile massal.

| Halaman        | Mobile 390×844                                                 | Desktop 1366×768                                                |
| -------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| Beranda        | [Screenshot](screenshots/mobile-experience/beranda-390.png)    | [Screenshot](screenshots/mobile-experience/beranda-1366.png)    |
| Permohonan     | [Screenshot](screenshots/mobile-experience/permohonan-390.png) | [Screenshot](screenshots/mobile-experience/permohonan-1366.png) |
| Formulir       | [Screenshot](screenshots/mobile-experience/formulir-390.png)   | [Screenshot](screenshots/mobile-experience/formulir-1366.png)   |
| Misi & riwayat | [Screenshot](screenshots/mobile-experience/misi-390.png)       | [Screenshot](screenshots/mobile-experience/misi-1366.png)       |
| Peta           | [Screenshot](screenshots/mobile-experience/peta-390.png)       | [Screenshot](screenshots/mobile-experience/peta-1366.png)       |
| Akun           | [Screenshot](screenshots/mobile-experience/akun-390.png)       | [Screenshot](screenshots/mobile-experience/akun-1366.png)       |
| Login          | [Screenshot](screenshots/mobile-experience/login-390.png)      | [Screenshot](screenshots/mobile-experience/login-1366.png)      |

Screenshot halaman penuh memperlihatkan konten yang bisa di-scroll, dengan navigasi fixed pada posisi viewport. Pengujian terpisah memastikan konten akhir dapat berada di atas navigasi.

## Validasi

- `npm test`: 69/69 unit/mock tests lulus.
- `npm run build`: TypeScript, Vite production build dan pemindaian marker server-only lulus. Warning anotasi Zod dan ukuran chunk yang sudah ada tetap muncul.
- Regresi Chromium: 46/46 lulus (38 yang sudah ada + 8 baru), termasuk run akhir setelah tinjauan screenshot.
- Seluruh halaman utama diuji pada 320×568, 360×800, 390×844, 430×932, 768×1024, 1366×768: tidak ada overflow horizontal, tab aktif sesuai rute, footer dapat di-scroll di atas navigasi.
- Alur permohonan→misi→penilaian→checklist→serah terima→ekspor, offline/retry, role restrictions, sesi/reload, serta halaman website/admin/pimpinan tercakup dalam regresi yang sudah ada.
- Login tetap memiliki pengujian tujuh nilai peran, label tombol, keyboard/focus, konektivitas perangkat, teks diperbesar 200%, dan reduced motion.
- Prettier pada file yang diubah dan `git diff --check` diperiksa.
- Kontras: tombol putih/teal 4.75:1; teks utama/putih 14.10:1; teks sekunder/latar 5.59:1; amber 6.64:1; merah 5.93:1; teal lembut 5.80:1; badge netral 7.67:1; disabled 5.10:1; putih/navy 14.64:1.

## Batas verifikasi

Belum diuji pada perangkat iOS/Android fisik, keyboard virtual, VoiceOver/TalkBack, atau backend Google Sheets/Vercel nyata. Tile eksternal tidak dinyatakan berhasil dimuat dalam pengujian fallback. Tes polling hidden pada halaman internal pernah gagal intermiten sebelum perubahan ini; logika polling tidak diubah oleh redesign. Tidak ada deploy atau publish.
