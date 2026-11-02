# COLIBRI MED — pematangan pengalaman koordinasi

Perubahan ini melanjutkan fondasi login kartu peran dan desain mobile yang sudah digabung melalui PR #7/#8. Basis branch diperbarui ke `origin/main` (`1756735`) tanpa perubahan isi dari merge tersebut. Routing, enum status tersimpan, data, hak akses, dan backend dipertahankan.

## Perubahan yang selesai

- Beranda setelah login menjadi titik mulai kerja dengan sapaan, peran dan aksi sesuai kemampuan. Operator/Administrator diarahkan ke pekerjaan permohonan; petugas lain ke penilaian/koordinasi. Viewer melihat preview dari `leadership.summary`, bukan data operasional rinci.
- Daftar memakai nama fasilitas/tim, status berikon, waktu WIB ringkas dan tindakan **Lihat detail**. Waktu/referensi lengkap tetap ada pada detail. Baris yang dibuka memiliki selected state; detail mobile dibuka secara eksplisit dan dapat ditutup.
- Status filter berasal dari status aktual data, dengan **Semua status** dan **Reset filter**. Bila pilihan berada di luar hasil pencarian, identitas dan peringatan eksplisit tetap tampil sebelum tindakan; pilihan tidak diganti diam-diam.
- Papan misi memakai segmented control dengan `aria-pressed`, hitungan kolom dari data terfilter, empty state yang menuntun ke permohonan, serta penjelasan hubungan misi–permohonan.
- Formulir tetap satu alur tanpa tahap tersembunyi. Ringkasan pemeriksaan sebelum kirim, primary submit, secondary draft, serta tertiary load/outbox membedakan penekanan tindakan. Isian dan validasi tetap dipertahankan.
- Pemantauan helikopter memprioritaskan pilihan dan peta. Ringkasan pilihan menyediakan kode, nama, status dan waktu laporan terakhir. Detail posisi dapat dibuka/tutup; desktop memakai peta–detail berdampingan. Label posisi tersimpan berbeda dari animasi lokal. Animasi tidak mengubah posisi laporan.
- Pengawasan pimpinan memakai sistem visual yang sama, empat KPI utama, label **Rentang waktu**, penjelasan UTC ringkas, periode grafik, daftar nilai yang dapat diperiksa, empty state, serta tautan indikator ke rincian agregat. Viewer tidak mendapat akses record operasional baru.
- Mobile mempertahankan lima menu beserta `aria-current`, pill aktif, safe area, dan ruang bawah terukur. Desktop ≥1100px memakai sidebar. Login kartu peran dan ilustrasi asli dipertahankan.
- Label tabel dan aktivitas diterjemahkan pada lapisan presentasi. Status seed `Tercatat di Server` ditampilkan **Tersimpan di perangkat** hanya pada mode demo. Mode connected menampilkan label server dari record yang dikembalikan backend. Antrean ditampilkan **Menunggu sinkronisasi**; error/konflik tetap ditampilkan sesuai kondisi, bukan disamarkan sebagai sukses. Enum/internal queue tidak dimigrasi atau ditulis ulang.

## File yang diubah

| Area                      | File                                                                                                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presentasi dan waktu      | `src/lib/presentation.ts`, `tests/presentation.test.ts`                                                                                                                                                                     |
| Sistem visual             | `src/coordination-polish.css`, `src/mobile-experience.css`, `src/main.tsx`                                                                                                                                                  |
| Shell/navigasi            | `src/features/useNavigationClearance.ts`, `src/pages/Mobile.tsx`, `src/pages/Leadership.tsx`, `src/features/leadership/presentation.ts`                                                                                     |
| Ringkasan, daftar, status | `src/components/MobileOverview.tsx`, `src/components/RecordTable.tsx`, `src/components/MobileUI.tsx`                                                                                                                        |
| Operasional dan formulir  | `src/pages/Internal.tsx`, `src/pages/Public.tsx`, `src/features/OperationalForm.tsx`                                                                                                                                        |
| Helikopter/laporan awak   | `src/pages/AirOperations.tsx`, `src/features/aircraft/AircraftReportForm.tsx`                                                                                                                                               |
| Pengujian baru            | `e2e/coordination-polish.spec.ts`                                                                                                                                                                                           |
| Penyesuaian assertion UI  | `e2e/admin-flight.spec.ts`, `e2e/leadership.spec.ts`, `e2e/mobile-experience.spec.ts`, `e2e/mobile-functional.spec.ts`, `e2e/mobile-login.spec.ts`, `e2e/mobile.spec.ts`, `e2e/refinements.spec.ts`, `e2e/workflow.spec.ts` |
| Bukti review              | Dokumen ini dan `docs/screenshots/coordination-polish/*.png`                                                                                                                                                                |

Assertion lama diperbarui untuk label produk, pembukaan detail eksplisit, navigasi desktop di samping, dan pemilihan summary langsung pada disclosure konflik bersarang. Assertion alur, penyimpanan, konflik dua tab, ekspor, sesi dan pembatasan role tetap diuji.

## Screenshot yang ditinjau

Data sintetis memakai alur permohonan→verifikasi→koordinasi→penugasan melalui UI. Tile diblokir secara sengaja untuk memeriksa fallback. Snapshot halaman penuh menyertakan posisi navigasi fixed; tes layout terpisah memeriksa ruang konten akhir.

| Halaman                      | Mobile 390×844                                                | Desktop 1366×768                                               |
| ---------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Login                        | [Lihat](screenshots/coordination-polish/login-390.png)        | [Lihat](screenshots/coordination-polish/login-1366.png)        |
| Beranda petugas              | [Lihat](screenshots/coordination-polish/beranda-390.png)      | [Lihat](screenshots/coordination-polish/beranda-1366.png)      |
| Filter dan detail permohonan | [Lihat](screenshots/coordination-polish/permohonan-390.png)   | [Lihat](screenshots/coordination-polish/permohonan-1366.png)   |
| Formulir                     | [Lihat](screenshots/coordination-polish/formulir-390.png)     | [Lihat](screenshots/coordination-polish/formulir-1366.png)     |
| Misi                         | [Lihat](screenshots/coordination-polish/misi-390.png)         | [Lihat](screenshots/coordination-polish/misi-1366.png)         |
| Penilaian                    | [Lihat](screenshots/coordination-polish/penilaian-390.png)    | [Lihat](screenshots/coordination-polish/penilaian-1366.png)    |
| Sumber daya                  | [Lihat](screenshots/coordination-polish/sumber-daya-390.png)  | [Lihat](screenshots/coordination-polish/sumber-daya-1366.png)  |
| Peta fasilitas               | [Lihat](screenshots/coordination-polish/peta-390.png)         | [Lihat](screenshots/coordination-polish/peta-1366.png)         |
| Pemantauan helikopter        | [Lihat](screenshots/coordination-polish/helikopter-390.png)   | [Lihat](screenshots/coordination-polish/helikopter-1366.png)   |
| Laporan awak                 | [Lihat](screenshots/coordination-polish/laporan-awak-390.png) | [Lihat](screenshots/coordination-polish/laporan-awak-1366.png) |
| Akun                         | [Lihat](screenshots/coordination-polish/akun-390.png)         | [Lihat](screenshots/coordination-polish/akun-1366.png)         |
| Outbox                       | [Lihat](screenshots/coordination-polish/outbox-390.png)       | [Lihat](screenshots/coordination-polish/outbox-1366.png)       |
| Pengaturan                   | [Lihat](screenshots/coordination-polish/pengaturan-390.png)   | [Lihat](screenshots/coordination-polish/pengaturan-1366.png)   |
| Pimpinan                     | [Lihat](screenshots/coordination-polish/pimpinan-390.png)     | [Lihat](screenshots/coordination-polish/pimpinan-1366.png)     |
| Indikator perhatian          | [Lihat](screenshots/coordination-polish/perhatian-390.png)    | [Lihat](screenshots/coordination-polish/perhatian-1366.png)    |
| Kesiapan                     | [Lihat](screenshots/coordination-polish/kesiapan-390.png)     | [Lihat](screenshots/coordination-polish/kesiapan-1366.png)     |

## Hasil verifikasi

- `npm test`: 72/72 lulus, termasuk pengujian provenance label dan pergantian tanggal WIB.
- `npm run test:e2e -- --workers=2`: 56/56 lulus. Sepuluh tes baru mencakup filter/selection, kontrol misi, seluruh modul spesialis/pimpinan, drill-down agregat, keyboard dan teks diperbesar. Suite sebelumnya tetap mencakup semua nilai peran, mode connected mock, offline/retry, draft, konflik, transisi, PDF/CSV dan reload sesi.
- Viewport 320×568, 360×800, 390×844, 430×932, 768×1024 dan 1366×768: tidak ada overflow horizontal; konten akhir terpisah dari navigasi bawah/sidebar; seluruh menu aktif sesuai rute.
- Teks diperbesar 200% pada Sumber daya, Pemantauan helikopter dan Pimpinan; keyboard/focus dan ruang navigasi tetap bekerja. Pengujian reduced motion login yang sudah ada tetap lulus.
- Preview Viewer diverifikasi memakai data agregat dan tautan indikator. Regresi pimpinan dijalankan ulang setelah penambahan preview.
- Build TypeScript/Vite dan pemindaian marker konfigurasi server lulus. Warning Zod/chunk besar yang sudah ada tetap muncul.
- Prettier file yang diubah dan `git diff --check` lulus.
- Palet yang dipakai mempertahankan kontras teks: putih/teal 4.75:1, teks utama/putih 14.10:1, teks sekunder/latar 5.59:1, teal pada permukaan lembut 5.80:1, amber 6.64:1, merah 5.93:1. Focus memakai navy.

Belum diuji: perangkat fisik, keyboard virtual, VoiceOver/TalkBack, backend Google Sheets/Vercel nyata, dan pemuatan tile eksternal di produksi. Tidak ada deploy atau publish.
