# COLIBRI MED

Sistem Koordinasi Helikopter Dokter dan Evakuasi Medis Udara.

**PROTOTIPE SIMULASI — DATA SINTETIS**

Prototipe usulan; bukan layanan darurat resmi. Jangan gunakan data pasien nyata.

## Jalankan

Node.js 24 LTS dan npm diperlukan.

```sh
npm ci
npm run dev
```

Mode demo langsung berjalan tanpa konfigurasi. Buka aplikasi melalui browser lokal, pilih **Login petugas**, lalu pilih peran demo. Semua data sintetis disimpan di IndexedDB pada browser ini. Jalankan alur sebagai Administrator untuk mencoba seluruh modul, atau berganti peran melalui logout/login. Pergantian peran demo bukan autentikasi connected.

## Alur yang diimplementasikan

Permohonan publik/draft → operator menerima, memverifikasi, mengoordinasikan → penilaian medis dan keputusan penerbangan dicatat terpisah → pembuatan misi dan penugasan tim → catatan/checklist → serah terima → penyelesaian dan ekspor laporan PDF/CSV.

Frontend React + TypeScript + Vite, React Router, Tailwind, Leaflet/OpenStreetMap. Browser hanya memanggil Vercel Function same-origin dalam connected mode. Google Apps Script menjadi backend utama dan Google Sheets menjadi penyimpanan bersama privat. Tidak ada Supabase, Firebase, AI, geocoding, routing service, atau WebGL.

## Pemeriksaan

```sh
npm run check       # build backend bundle, unit/mock tests, TypeScript, Vite production
npm run test:e2e    # Chromium: alur lengkap, mobile, peta gagal, offline, ekspor
```

Browser test memakai Chromium sistem bila tersedia atau browser terpasang Playwright. Pada mesin baru, pasang browser dari sumber tepercaya dengan `npx playwright install chromium`, atau set `CHROMIUM_PATH`. Jangan mematikan verifikasi TLS/download. `npm run build:gas` wajib dijalankan ketika domain/auth dependency berubah; `apps-script/Domain.gs` hasil bundle ikut disimpan agar source deployment dapat ditinjau.

## Connected dan dokumentasi

- [Deployment dan konfigurasi](docs/DEPLOYMENT.md): Sheets privat, Script Properties, akun undangan, Apps Script Web App, Vercel, health.
- [Matriks hak akses dan API](docs/ACCESS-AND-API.md): sesi, role, skema, concurrency, idempotency, penanganan partial failure.
- [Batas prototipe dan fase APK](docs/LIMITATIONS.md).
- [Ringkasan pengujian](docs/TESTING.md).
- [Spesifikasi pengguna](docs/SPECIFICATION.md).

Salin `.env.example` hanya sebagai template tanpa nilai rahasia. Rahasia koneksi harus berada di environment server Vercel dan Script Properties; **tidak boleh memakai prefix `VITE_`**. Vite saja menjalankan demo, bukan Vercel Functions. Connected tidak fallback otomatis ke demo saat backend gagal.

Tidak ada deployment publik atau koneksi Sheets nyata yang diklaim. Prototipe hanya untuk latihan menggunakan data sintetis; bukan sistem medis atau penerbangan siap operasional.
