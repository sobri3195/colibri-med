# Konfigurasi dan deployment

**PROTOTIPE SIMULASI — DATA SINTETIS.** Deployment publik belum dilakukan. Jangan mengubah izin akun atau spreadsheet tanpa kewenangan pemilik. Sistem belum ditinjau keamanannya untuk data kesehatan nyata.

## Demo lokal

Node.js 24 LTS dan npm. Jalankan dari root repositori:

```sh
npm ci
npm run dev
```

Mode default adalah demo: tidak memerlukan key, akun, server, WebGL, atau database eksternal. Login memilih peran simulasi, bukan autentikasi. Data demo bersama antar tab browser pada origin yang sama, dengan Web Locks untuk mencegah penulisan bersamaan. Draft dan outbox memakai IndexedDB. Data browser bukan penyimpanan permanen.

## Google Sheets dan Apps Script

1. Buat spreadsheet Google **privat**, khusus data sintetis. Jangan pilih akses publik atau membagikan link spreadsheet ke browser.
2. Buka Extensions → Apps Script pada spreadsheet. Jalankan `npm run build:gas`, lalu salin semua file `.gs` dari `apps-script/` ke proyek Apps Script. `entry.ts` adalah sumber build, tidak disalin sebagai file script. Aktifkan tampilan manifest di pengaturan proyek dan gunakan `appsscript.json` yang disediakan. Modul `Domain.gs` membundel Zod dan @noble/hashes; jangan mengedit hasil generasi secara manual.
3. Di Project Settings → Script Properties, atur `SPREADSHEET_ID` dan `PROXY_SHARED_SECRET`. Buat rahasia koneksi acak yang kuat di luar repositori. Jangan menyimpan rahasia di sheet atau log. Source tidak memuat nilai rahasia.
4. Jalankan `setupSheets` dari editor dengan akun pemilik yang berwenang dan berikan izin yang diminta setelah meninjaunya. Setup memvalidasi header yang sudah ada; tidak menghapus data. Jalankan `seedSyntheticData` untuk fasilitas dan sumber daya sintetis.
5. Untuk setiap akun undangan, atur `INVITE_USERNAME`, `INVITE_PASSWORD` (minimal 14 karakter), dan `INVITE_ROLE` melalui Script Properties. Jalankan `createInvitedAccount`. Password dihapus dari properties setelah berhasil; Sheets hanya menyimpan salt dan PBKDF2-HMAC-SHA256 (600.000 iterasi). Ulangi untuk peran yang diperlukan. Jangan memakai password akun nyata atau memasukkan password di source, chat, atau log.
6. Gunakan Deploy → New deployment → Web app. Script membutuhkan akses Sheets sebagai akun pemilik. Penghubung Vercel tidak mengikuti login Google interaktif, sehingga deployment harus mengizinkan request server tanpa halaman login Google; semua action tetap dilindungi shared secret dalam payload dan sesi aplikasi. Opsi akses yang tersedia berbeda menurut akun/domain. Jika administrator domain melarang opsi yang sesuai, **hentikan connected mode**; gunakan demo sampai tersedia deployment yang diizinkan. Jangan mengubah kebijakan domain untuk mengakali pembatasan.
7. Catat URL deployment `/exec`, bukan URL editor atau `/dev`. Jangan memasukkan shared secret ke query string. Apps Script tidak diasumsikan membaca arbitrary request headers.
8. `PUBLIC_SUBMISSIONS_ENABLED` default tidak aktif. Atur `true` hanya jika pemilik menyetujui endpoint permohonan simulasi publik. Tanpa itu form publik connected menampilkan penolakan. Pembatasan prototipe adalah 20 permohonan per jendela cache 10 menit secara global, bukan perlindungan DDoS/perangkat/IP. Cache dapat dieviksikan lebih awal. Tidak cocok untuk layanan publik yang berisiko penyalahgunaan.

## Vercel dan connected lokal

1. Impor repositori ke Vercel dengan preset Vite, build command `npm run build` dan output `dist`. Folder `api/` menyediakan Node Function. `vercel.json` menyediakan fallback SPA yang mengecualikan API dan aset.
2. Atur environment **server** di Vercel: `APPS_SCRIPT_WEB_APP_URL`, `APPS_SCRIPT_SHARED_SECRET` (sama dengan Script Properties), dan `APP_ORIGIN` (origin HTTPS aplikasi yang tepat, tanpa trailing slash). Jangan gunakan `VITE_` untuk rahasia.
3. Atur `VITE_APP_MODE=connected` ketika membangun frontend. Nilai ini hanya pilihan mode publik. Opsional: `VITE_PUBLIC_CONTACT` untuk kontak prototipe yang benar dan boleh dipublikasikan; kosong berarti tidak dikonfigurasi.
4. Untuk pengujian connected lokal, gunakan Vercel CLI tepercaya dan `vercel dev`, setelah mengonfigurasi environment lokal secara aman. `vite` saja tidak menjalankan folder `api`. Cookie menggunakan `Secure`; gunakan origin HTTPS lokal yang terpercaya untuk menguji sesi connected. Jangan melemahkan cookie di source demi HTTP lokal.
5. Deploy hanya setelah mendapatkan otorisasi pemilik. `APP_ORIGIN` harus cocok dengan domain yang dipakai mengakses aplikasi. Preview domain membutuhkan konfigurasi origin tersendiri. Origin yang tidak cocok ditolak, termasuk login, untuk perlindungan CSRF. CORS lintas origin tidak diaktifkan.
6. Dari origin aplikasi, kirim POST JSON ke `/api/gateway` dengan `{"action":"health","payload":{}}`. Browser menambahkan Origin. Health sukses hanya menandakan dispatcher dapat dihubungi dengan rahasia yang benar; tidak membuktikan login atau operasi Sheets sudah bekerja. Health tidak mengirim data sheet. Uji juga login, buat permohonan, dan alur serah terima dengan data sintetis.
7. Saat source `.gs` berubah: rebuild, salin source, buat versi baru, dan edit deployment yang ada agar memakai versi itu. Memperbarui source editor saja tidak membuktikan URL deployment sudah memakai source baru. Build frontend lagi untuk perubahan variabel `VITE_`.

## Batas platform dan pemeriksaan yang belum dilakukan

Apps Script memiliki kuota dan batas eksekusi; tidak ada klaim angka kuota resmi di sini. PBKDF2 murni JS, latensi Sheets, penguncian global, cold start, redirect ContentService, dan durasi function perlu diukur pada akun/plan deployment sebenarnya. Function meminta `maxDuration: 60`; plan Vercel harus mendukungnya. Jika hashing/latensi tidak sesuai, pertahankan demo dan lakukan kajian autentikasi terpisah; jangan menurunkan keamanan hashing untuk meloloskan pengujian.

Dokumentasi resmi yang perlu diperiksa sebelum deployment:

- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/guides/content
- https://developers.google.com/apps-script/guides/properties
- https://developers.google.com/apps-script/guides/services/quotas
- https://vercel.com/docs/functions
- https://vercel.com/docs/environment-variables
- https://operations.osmfoundation.org/policies/tiles/

Pada lingkungan implementasi ini, akses ke dokumentasi resmi Vercel/Apps Script dan referensi konsep Lovable tidak tersedia menurut kebijakan jaringan. Instruksi di atas disiapkan untuk ditinjau; opsi akun/domain dan connected end-to-end belum diverifikasi. Tidak ada klaim deployment nyata berhasil.

Gunakan tile standar OpenStreetMap hanya untuk tampilan interaktif. Jangan bulk download, prefetch offline, atau menyimpan tile lewat service worker. Jangan menjanjikan kapasitas/ketersediaan tile. Input koordinat manual dan daftar lokasi tetap tersedia ketika tile gagal.
