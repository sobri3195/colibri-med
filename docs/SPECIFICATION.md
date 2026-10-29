Bangun **COLIBRI MED — Sistem Koordinasi Helikopter Dokter dan Evakuasi Medis Udara**.

Fase awal berfokus pada website responsif yang dapat diuji melalui:

- Frontend: React + TypeScript + Vite.
- Hosting frontend: Vercel.
- Backend: Google Apps Script Web App.
- Database: Google Sheets.
- Peta: Leaflet + OpenStreetMap tanpa API key.

Target fase ini adalah prototipe fungsional dengan data sintetis, dari permohonan bantuan sampai serah terima pasien dan laporan.

APK Android merupakan fase berikutnya. Susun kode frontend agar nantinya dapat dibungkus menggunakan Capacitor, tetapi jangan mengalihkan pekerjaan fase awal ke pembuatan APK.

KERJAKAN IMPLEMENTASI, bukan hanya rencana atau desain.

## 1. RUANG LINGKUP DAN BATASAN

Aplikasi merupakan prototipe usulan untuk layanan Helikopter Dokter Colibri TNI AU.

Tampilkan:
**COLIBRI MED**
“Sistem Koordinasi Helikopter Dokter dan Evakuasi Medis Udara”
**PROTOTIPE SIMULASI — DATA SINTETIS**

Jangan:

- Mengklaim aplikasi sudah disahkan sebagai layanan resmi.
- Menggunakan data pasien nyata.
- Mengarang nomor layanan, kapasitas helikopter, batas operasi, atau cakupan pelayanan resmi.
- Membuat keputusan medis atau persetujuan penerbangan otomatis.
- Menganggap lokasi di peta sebagai bukti kelayakan pendaratan.

Referensi konsep:
https://efram-ops-notes.lovable.app/

Jika referensi tidak dapat diakses, lanjutkan berdasarkan spesifikasi ini dan jelaskan keterbatasan pemeriksaan. Fungsi utama wajib bekerja tanpa WebGL.

## 2. ARSITEKTUR

Gunakan struktur:

Browser pengguna
→ Frontend Vite di Vercel
→ Vercel Function sebagai penghubung same-origin
→ Google Apps Script Web App
→ Google Sheets

Google Apps Script tetap menjadi backend utama. Vercel Function hanya:

- Meneruskan permintaan.
- Menyimpan rahasia koneksi di environment server.
- Menormalisasi respons dan kesalahan.
- Membatasi ukuran payload.
- Mencegah rahasia masuk ke browser.

Jangan menghubungkan browser langsung ke Google Sheets.

Jangan memasukkan shared secret atau kredensial ke variabel berawalan VITE_. Variabel VITE_ dapat terbaca pada frontend.

Google Apps Script tidak memerlukan API key peta. Komunikasi frontend–backend tetap diperlukan untuk penyimpanan bersama.

Tidak menggunakan:

- Supabase.
- Firebase.
- Database berbayar.
- Google Maps.
- Mapbox.
- API AI.
- Layanan routing atau geocoding eksternal.

Sebelum implementasi, periksa repository dan AGENTS.md. Untuk konfigurasi Google Apps Script dan Vercel, periksa dokumentasi resmi yang relevan jika tersedia. Jangan mengarang cara deployment.

## 3. STRUKTUR PROYEK

Pisahkan:

- src/pages
- src/components
- src/features
- src/services
- src/types
- src/lib
- api untuk Vercel Functions
- apps-script untuk source Google Apps Script
- docs untuk panduan konfigurasi

Gunakan:

- React Router.
- Tailwind CSS.
- Leaflet.
- IndexedDB untuk draft dan outbox.
- Library PDF lokal.
- Validasi skema input.
- Library yang dibundel melalui package manager.

Jangan menggunakan CDN untuk library, ikon, atau font.

Sediakan:

1. Mode demo lokal yang langsung berjalan tanpa konfigurasi.
2. Mode connected dengan Google Apps Script.

Tampilkan mode aktif secara jelas. Jangan melakukan fallback diam-diam dari connected ke demo ketika backend gagal.

## 4. GOOGLE SHEETS SEBAGAI DATABASE

Buat script setup yang idempotent untuk membuat sheet dan header tanpa menghapus data lama.

Sheet minimal:

- Users
- Sessions
- Requests
- MedicalReviews
- FlightReviews
- Missions
- MissionAssignments
- PatientNotes
- Checklists
- Facilities
- Resources
- HandoverRecords
- ActivityLogs
- Settings
- ProcessedOperations

Setiap record relevan memiliki:

- id berupa UUID.
- createdAt.
- updatedAt.
- createdBy.
- updatedBy.
- revision.
- status.
- relasi ID yang sesuai.

Gunakan waktu ISO UTC pada penyimpanan dan tampilkan zona waktu secara jelas pada UI.

Ketentuan:

- ID bukan nomor baris spreadsheet.
- Validasi header dan skema.
- Gunakan pembacaan dan penulisan batch bila sesuai.
- Gunakan LockService untuk operasi perubahan yang memerlukan penguncian.
- Terapkan optimistic concurrency melalui revision.
- Gunakan operationId untuk mencegah duplikasi saat retry.
- Jangan menganggap Google Sheets menyediakan transaksi database penuh.
- Dokumentasikan penanganan kegagalan sebagian pada operasi yang mengubah beberapa sheet.
- Hindari pembacaan seluruh sheet berulang kali tanpa kebutuhan.
- Sediakan pagination dan filter server untuk daftar.
- Cegah formula injection ketika menyimpan input teks ke Sheets dan ketika mengekspor CSV.
- Jangan membagikan spreadsheet secara publik.

Data fasilitas, sumber daya, dan pasien dalam prototipe harus sintetis.

## 5. GOOGLE APPS SCRIPT BACKEND

Sediakan:

- Code.gs.
- Modul autentikasi.
- Modul validasi.
- Modul akses Sheets.
- Modul layanan setiap fitur.
- Setup dan seed data.
- appsscript.json jika diperlukan.
- Dokumentasi deployment.

Gunakan doPost sebagai dispatcher dengan action allowlist. Jangan mengeksekusi nama fungsi bebas dari input pengguna.

Contoh kelompok action:

- auth.login
- auth.logout
- auth.me
- requests.create
- requests.list
- requests.get
- requests.update
- requests.transition
- missions.list
- missions.get
- missions.assign
- missions.transition
- medicalReviews.save
- flightReviews.save
- patientNotes.create
- checklists.save
- facilities.list
- handovers.save
- reports.summary

Respons konsisten:

- ok.
- data.
- error dengan code dan message yang aman.
- requestId.
- serverTime.

Jangan mengirim stack trace, rahasia, atau isi spreadsheet lengkap ke browser.

Apps Script Web App tidak boleh diasumsikan dapat membaca arbitrary HTTP headers. Jika memakai shared secret antara Vercel dan Apps Script, kirim melalui payload server-to-server dan validasi sebelum menjalankan action.

Shared secret:

- Disimpan di Vercel environment.
- Disimpan di Apps Script Script Properties.
- Tidak disimpan di spreadsheet.
- Tidak dikirim ke browser.
- Tidak ditulis ke log.

Beri batas payload, validasi tipe data, serta pemeriksaan izin pada setiap action.

## 6. AUTENTIKASI DAN PERAN

Jangan menggunakan pergantian peran frontend sebagai autentikasi mode connected.

Untuk fase prototipe, gunakan akun undangan atau akun demo yang disiapkan administrator, tanpa pendaftaran publik.

Implementasikan:

- Login.
- Logout.
- Session kedaluwarsa.
- Pemeriksaan pengguna aktif.
- Pembatasan percobaan login.
- Password hashing menggunakan implementasi yang ditinjau dan sesuai; jangan menyimpan password plaintext atau menggunakan hash cepat tunggal.
- Session token acak yang kuat.
- Hash token pada penyimpanan server.
- Cookie HttpOnly, Secure, dan SameSite yang sesuai melalui Vercel Function.
- Perlindungan CSRF/validasi Origin untuk operasi perubahan.
- Role-based access di backend.

Jika metode autentikasi tidak dapat diimplementasikan dengan aman pada stack ini, jelaskan batasannya dan gunakan demo sintetis terbatas. Jangan membuat klaim keamanan palsu.

Peran:

- Operator.
- Koordinator medis.
- Koordinator penerbangan.
- Dokter/perawat.
- Rumah sakit penerima.
- Administrator.
- Viewer pimpinan.

Pemohon publik hanya dapat mengirim permohonan simulasi dengan data minimal. Jangan mengekspos daftar atau detail permohonan melalui endpoint publik.

## 7. HALAMAN WEBSITE

### Halaman publik

- Beranda.
- Tentang prototipe.
- Alur layanan.
- Form permohonan simulasi.
- FAQ.
- Kontak yang dapat dikonfigurasi.
- Login petugas.

Form permohonan:

- Nama pemohon sintetis.
- Kontak contoh.
- Fasilitas asal.
- Ringkasan kebutuhan.
- Jumlah pasien.
- Deskripsi lokasi.
- Koordinat opsional.
- Informasi akses lokasi.

Jangan menambahkan upload berkas pada fase awal.

Setelah submit, bedakan:

- Tersimpan sebagai draft lokal.
- Menunggu pengiriman.
- Berhasil tercatat di server.
- Diterima operator.

“Berhasil tercatat di server” tidak berarti bantuan sudah ditugaskan.

Jika endpoint publik diaktifkan, terapkan validasi, batas payload, dan pembatasan pengiriman yang sesuai. Dokumentasikan bahwa proteksi penyalahgunaan prototipe memiliki keterbatasan.

### Dashboard internal

- Ringkasan permohonan.
- Permohonan belum direspons.
- Penilaian tertunda.
- Misi aktif.
- Konfirmasi rumah sakit tertunda.
- Aktivitas terbaru.
- Waktu pembaruan terakhir.

### Modul utama

- Permohonan.
- Papan misi dalam tabel dan kanban.
- Penilaian medis.
- Tinjauan penerbangan.
- Penugasan tim.
- Kesiapan sumber daya.
- Direktori fasilitas.
- Peta.
- Checklist.
- Catatan pasien sintetis.
- Serah terima.
- Laporan.
- Pengaturan.

Sediakan pencarian, filter, empty state, loading state, error state, dan tombol retry.

## 8. STATUS DAN ALUR

Pisahkan status berikut:

Permohonan:
Draft Lokal → Menunggu Pengiriman → Tercatat di Server → Diterima Operator → Diverifikasi → Dalam Koordinasi → Ditutup.

Penilaian medis:
Belum Dinilai → Sedang Dinilai → Rekomendasi Dicatat.

Tinjauan penerbangan:
Belum Ditinjau → Dalam Peninjauan → Disetujui / Ditunda / Tidak Disetujui.

Misi:
Persiapan → Tim Ditugaskan → Berangkat → Tiba di Lokasi → Pasien Dijemput → Menuju Fasilitas Penerima → Serah Terima → Selesai.

Aturan:

- Transisi divalidasi server.
- Penilaian medis tidak otomatis memberikan persetujuan penerbangan.
- Keputusan penerbangan hanya dicatat peran yang berwenang.
- Penolakan, penundaan, dan pembatalan memerlukan alasan.
- Setiap perubahan penting mencatat pengguna dan waktu.
- Penyelesaian misi membutuhkan serah terima atau override yang diberi alasan dan dicatat.
- Jangan menyebut activity log di Sheets sebagai audit log yang tahan manipulasi.

## 9. PETA GRATIS

Gunakan:

- Leaflet.
- Tile OpenStreetMap:
  https://tile.openstreetmap.org/{z}/{x}/{y}.png
- Atribusi © OpenStreetMap contributors dengan tautan yang sesuai.

Tidak memerlukan API key.

Fitur:

- Klik peta untuk memilih lokasi.
- Input koordinat manual.
- Input alamat/deskripsi manual.
- Tombol “Gunakan Lokasi Saya” setelah tindakan pengguna.
- Marker permohonan dan fasilitas contoh.
- Popup ringkas.
- Filter marker.
- Alternatif daftar lokasi.

Pencarian lokasi hanya mencari direktori yang tersimpan di aplikasi/Sheets. Jangan menggunakan Nominatim atau geocoding eksternal.

Jika menghitung jarak:

- Hitung Haversine secara lokal.
- Label “Jarak garis lurus”.
- Jangan menyebutnya rute penerbangan atau ETA.

Tidak ada pelacakan armada nyata. Pergerakan marker demo wajib berlabel simulasi.

Ketentuan tile:

- Patuhi kebijakan penyedia.
- Jangan melakukan bulk download atau prefetch peta offline.
- Jangan meng-cache tile melalui service worker secara tidak sesuai ketentuan.
- Jangan menjanjikan ketersediaan atau kapasitas tanpa batas.
- Saat tile gagal, formulir dan daftar lokasi tetap bekerja.

## 10. OFFLINE DAN OUTBOX

Gunakan IndexedDB untuk:

- Draft permohonan.
- Draft checklist.
- Draft catatan.
- Outbox operasi yang belum dikirim.

Setiap operasi memiliki:

- operationId.
- entityId.
- baseRevision.
- createdAt.
- status.
- retryCount.

Aturan:

- Retry tidak membuat duplikasi.
- Server memeriksa operationId.
- Konflik revision ditampilkan untuk ditinjau.
- Jangan menimpa perubahan pengguna lain secara diam-diam.
- Pengiriman ulang memerlukan sesi yang masih valid.
- Saat logout, draft pengguna tidak boleh tampil kepada pengguna lain.
- Tampilkan batas penyimpanan dan kemungkinan data browser dihapus oleh perangkat.

Label:

- Tersimpan lokal.
- Menunggu jaringan.
- Mengirim.
- Tersimpan di server.
- Gagal dikirim.
- Konflik perubahan.

Jangan menjanjikan sinkronisasi latar belakang ketika browser ditutup.

## 11. PEMBARUAN DATA DAN NOTIFIKASI

Tidak menggunakan WebSocket atau push service.

Gunakan:

- Tombol refresh.
- Polling ringan yang dapat dikonfigurasi.
- Polling hanya saat halaman terkait aktif.
- Hentikan atau kurangi polling ketika tab tersembunyi atau perangkat offline.
- Backoff saat error atau kuota.
- Tampilkan waktu data terakhir diperbarui.
- Inbox notifikasi di dalam aplikasi.

Jangan menyebut pembaruan sebagai real-time tanpa jeda.

Jangan menampilkan data klinis rinci pada toast atau notifikasi umum.

## 12. DESAIN

Gunakan:

- Navy, putih, biru muda, dan teal.
- Merah untuk keadaan darurat.
- Amber untuk perhatian.
- Sidebar desktop.
- Navigasi mobile yang ringkas.
- Tombol besar.
- Status berupa teks dan ikon.
- Kontras baik.
- Bahasa Indonesia.
- Animasi ringan.

Fokus pada kejelasan alur dan kecepatan input.

Tidak menggunakan WebGL untuk komponen inti.

## 13. LAPORAN

Buat laporan dari data yang boleh diakses pengguna:

- Ringkasan permohonan.
- Riwayat misi.
- Durasi tiap tahap.
- Alasan penundaan/pembatalan.
- Kelengkapan checklist.
- Serah terima.
- Ringkasan sumber daya.

Ekspor PDF dan CSV dilakukan di frontend menggunakan library lokal.

Beri label simulasi pada laporan prototipe. Jangan mengarang target waktu atau indikator resmi.

## 14. DEPLOYMENT VERCEL DAN APPS SCRIPT

Sediakan panduan berurutan:

1. Membuat Google Sheets privat.
2. Menjalankan setup sheet.
3. Mengatur Script Properties.
4. Melakukan deployment Apps Script Web App.
5. Menentukan opsi eksekusi dan akses yang sesuai dengan akun/domain pengguna.
6. Mengisi environment variables Vercel.
7. Menjalankan lokal.
8. Build dan deploy Vercel.
9. Memeriksa koneksi melalui health check yang tidak membocorkan data.
10. Memperbarui deployment Apps Script ketika source berubah.

Gunakan nama environment server seperti:

- APPS_SCRIPT_WEB_APP_URL
- APPS_SCRIPT_SHARED_SECRET

Gunakan Script Properties seperti:

- SPREADSHEET_ID
- PROXY_SHARED_SECRET

Jangan menaruh nilai rahasia di README atau .env.example.

Dokumentasikan bahwa Apps Script memiliki kuota dan batas eksekusi. Hindari angka batas yang belum diverifikasi. Prototipe tidak boleh diposisikan sebagai satu-satunya saluran layanan darurat.

Jangan melakukan deployment publik atau mengubah izin akun tanpa otorisasi yang sesuai. Siapkan semua file dan langkah konfigurasi yang dapat ditinjau.

## 15. PENGUJIAN

Uji:

- Mode demo berjalan tanpa konfigurasi.
- Connected tidak berubah diam-diam menjadi demo saat error.
- Login, logout, sesi kedaluwarsa, dan pembatasan peran.
- Permohonan sampai serah terima.
- Penilaian medis terpisah dari persetujuan penerbangan.
- CRUD tersimpan di Sheets.
- Input berbahaya tidak menjadi formula spreadsheet.
- Retry tidak membuat data ganda.
- Konflik perubahan dari dua browser.
- Offline dan pengiriman outbox.
- Tile peta gagal.
- Izin lokasi ditolak.
- Polling berhenti saat tab tidak aktif.
- PDF dan CSV.
- Tampilan mobile.
- Build Vercel.
- Rahasia tidak masuk bundle frontend.

Jika kredensial atau deployment Apps Script belum tersedia, lakukan pengujian dengan adapter mock dan jelaskan pengujian integrasi yang belum dapat dilakukan. Jangan mengklaim koneksi nyata telah berhasil tanpa bukti.

## 16. DELIVERABLE

Serahkan:

- Source frontend lengkap.
- Vercel Functions penghubung.
- Source Google Apps Script.
- Setup Google Sheets.
- Seed data sintetis.
- .env.example tanpa rahasia.
- README instalasi dan deployment.
- Matriks hak akses.
- Dokumentasi action backend.
- Ringkasan pengujian.
- Daftar keterbatasan prototipe.
- Catatan persiapan fase APK berikutnya.

Mulai dari pemeriksaan repository, lalu implementasikan satu alur lengkap yang berjalan: permohonan → operator → penilaian → penugasan → catatan → serah terima → laporan. Setelah itu lengkapi modul pendukung.
