# Hasil pengujian prototipe

Pengujian dijalankan dengan Node.js 24, npm 11 dan Chromium sistem dalam cloud environment. Semua data uji sintetis. Tidak menggunakan akun Google atau Vercel nyata.

| Pemeriksaan                    | Bukti dan ruang lingkup                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit/domain/storage            | 16 pengujian: permohonan publik, validasi, role, replay operationId, owner operasi, revision dua browser, transisi, persetujuan terbang terpisah, alasan, latest review, catatan/serah terima/laporan, relasi, IndexedDB pemilik, formula CSV, Haversine, filter/pagination dan pembatalan                                                                            |
| Gateway Vercel                 | 7 pengujian: Origin/CSRF, method, ukuran payload, config connected hilang, allowlist, token cookie aman, error upstream tanpa data demo, logout cookie                                                                                                                                                                                                                |
| Frontend connected             | 1 pengujian: backend gagal tetap error; tidak menciptakan state demo                                                                                                                                                                                                                                                                                                  |
| Apps Script dengan mock Sheets | 9 pengujian menjalankan source `.gs` asli: 17 sheet idempotent, secret/action/public access, hash PBKDF2 dibanding implementasi Node standar, token ter-hash/logout, expiry/rate limit, persistensi/idempotency/formula, journal partial failure dan larangan retry tidak aman                                                                                        |
| Browser end-to-end             | 24 skenario lulus: polling berhenti ketika tab hidden serta sesi UI berakhir; operator→penilaian medis→persetujuan penerbangan→misi→catatan→serah terima→PDF/CSV; form mobile 390px dengan tile gagal dan lokasi ditolak; operasi offline masuk outbox dan terkirim ulang lalu logout; draft antarform, konflik penilaian dua tab, pembatalan misi, pagination/filter |
| Production build               | TypeScript dan bundling Vite; Function diuji melalui handler asli dengan mock fetch. Build deployment Vercel remote belum dijalankan                                                                                                                                                                                                                                  |
| Rahasia pada frontend          | Build menggunakan penanda server-only nonrahasia; pemindaian output menolak nama konfigurasi server dan penanda jika masuk bundle. Tidak mengklaim pemindaian ini sebagai audit menyeluruh                                                                                                                                                                            |
| Dependensi produksi            | `npm audit --omit=dev --audit-level=high`: nol kerentanan setelah jsPDF diperbarui ke rilis 4.2.1 atau lebih baru dalam rentang lockfile                                                                                                                                                                                                                              |

Tambahan pengujian penyempurnaan: 5 pengujian fingerprint/validasi/concurrency penilaian dan ringkasan status; 6 pengujian antrean untuk urutan stabil, sesi pemilik, kegagalan parsial, arsip konflik, serta isolasi mode. Total **69 pengujian unit/mock** dan **24 skenario browser**. Pengujian Apps Script juga memverifikasi penolakan operationId dengan payload berbeda dan pembekuan perubahan baru setelah partial failure.

Pengujian mobile tambahan: bottom navigation tetap di bawah saat scroll, satu menu aktif, layout 320/390px tanpa overflow, konten akhir tidak tertutup navigasi, login kembali ke tujuan Misi, akses modul Akun/Peta, logout, serta kedaluwarsa sesi tetap di `/mobile/login`. Safe-area didukung melalui CSS; perangkat iOS/Android fisik belum diuji.

Pengujian pimpinan tambahan: 9 pengujian agregasi dan otorisasi; source Apps Script dengan mock memverifikasi proyeksi agregat dan tidak membaca PatientNotes yang rusak. Empat skenario browser menguji empat sudut pantau, bottom navigation 320/390px, periode dan unduhan CSV/PDF, larangan Operator, pengalihan Viewer dari endpoint/tampilan rinci, serta polling/sesi. Ekspor CSV diuji tidak memuat identitas pemohon, kontak, atau nama fasilitas. Pengujian sumber backend membuktikan redaksi terjadi di server, bukan hanya menyembunyikan field di UI.

Penyempurnaan mobile lengkap: 8 pengujian tambahan mencakup direktori, izin, revision, checklist boolean, perubahan tim, sesi demo, tujuan login dan bukti penerimaan. Mock Apps Script memverifikasi action baru benar-benar menulis sheet dan memakai journal/idempotency. Lima skenario mobile baru menjalankan form baru sampai laporan, perubahan tim, checklist yang dipulihkan dari server, catatan/serah terima, antrean offline setelah reload, pencegahan klik ganda pada form mengantre, direktori/peta, kesiapan, pengaturan per pengguna, serta URL tidak valid. Test lama diperbarui untuk pemulihan sesi demo dan menu Permohonan aktif; pembatasan Viewer tetap diperiksa backend.

Tambahan pemantauan helikopter: 8 unit test memeriksa seed, validasi laporan, peran, optimistic concurrency, idempotency, flag sintetis, posisi tanpa pengamatan baru, playback tanpa mutasi, dan migrasi demo lama. Mock Apps Script menjalankan dispatcher laporan, replay dan seed dua tabel baru. Empat skenario browser mencakup login admin dari index, playback/jeda/reset, laporan persisten dan ekspor, larangan Operator pada dashboard admin, pemantauan mobile baca-saja, serta laporan offline/retry. Pergerakan yang diuji adalah animasi sintetis, bukan telemetri armada.

Perintah reproduksi:

```sh
npm ci
npm run check
npm run test:e2e
npm run format:check
```

Build dapat menampilkan peringatan anotasi tree-shaking dari Zod dan ukuran chunk frontend. Peringatan ini tidak menggagalkan build, tetapi pemecahan bundle tambahan merupakan peningkatan performa berikutnya.

Belum diuji: deployment Google Sheets/Apps Script nyata, OAuth/domain Workspace, cookie pada domain Vercel HTTPS nyata, kuota dan latensi layanan, rilis Vercel remote, abuse/load test, keamanan independen, Android/Capacitor. Pengujian mock tidak membuktikan integrasi nyata telah berhasil. Daftar backend memfilter dan memaginasi hasil; laporan dan UI saat ini ditujukan untuk dataset sintetis kecil.

Tidak ada tes yang sengaja dinonaktifkan atau expected-failure dalam suite yang disediakan. Uji browser mensimulasikan jaringan offline, tile gagal, penolakan lokasi dan waktu sesi; tidak mengunduh tile secara massal.
