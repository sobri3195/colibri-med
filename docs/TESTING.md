# Hasil pengujian prototipe

Pengujian dijalankan dengan Node.js 24, npm 11 dan Chromium sistem dalam cloud environment. Semua data uji sintetis. Tidak menggunakan akun Google atau Vercel nyata.

| Pemeriksaan                    | Bukti dan ruang lingkup                                                                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit/domain/storage            | 16 pengujian: permohonan publik, validasi, role, replay operationId, owner operasi, revision dua browser, transisi, persetujuan terbang terpisah, alasan, latest review, catatan/serah terima/laporan, relasi, IndexedDB pemilik, formula CSV, Haversine, filter/pagination dan pembatalan |
| Gateway Vercel                 | 7 pengujian: Origin/CSRF, method, ukuran payload, config connected hilang, allowlist, token cookie aman, error upstream tanpa data demo, logout cookie                                                                                                                                     |
| Frontend connected             | 1 pengujian: backend gagal tetap error; tidak menciptakan state demo                                                                                                                                                                                                                       |
| Apps Script dengan mock Sheets | 6 pengujian menjalankan source `.gs` asli: 15 sheet idempotent, secret/action/public access, hash PBKDF2 dibanding implementasi Node standar, token ter-hash/logout, expiry/rate limit, persistensi/idempotency/formula, journal partial failure dan larangan retry tidak aman             |
| Browser end-to-end             | 4 skenario lulus: polling berhenti ketika tab hidden serta sesi UI berakhir; operator→penilaian medis→persetujuan penerbangan→misi→catatan→serah terima→PDF/CSV; form mobile 390px dengan tile gagal dan lokasi ditolak; operasi offline masuk outbox dan terkirim ulang lalu logout       |
| Production build               | TypeScript dan bundling Vite; Function diuji melalui handler asli dengan mock fetch. Build deployment Vercel remote belum dijalankan                                                                                                                                                       |
| Rahasia pada frontend          | Build menggunakan penanda server-only nonrahasia; pemindaian output menolak nama konfigurasi server dan penanda jika masuk bundle. Tidak mengklaim pemindaian ini sebagai audit menyeluruh                                                                                                 |
| Dependensi produksi            | `npm audit --omit=dev --audit-level=high`: nol kerentanan setelah jsPDF diperbarui ke rilis 4.2.1 atau lebih baru dalam rentang lockfile                                                                                                                                                   |

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
