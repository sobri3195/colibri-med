# Skenario demo terpadu

Implementasi tetap memakai React/TypeScript, IndexedDB, domain validator dan adapter Google Apps Script yang sudah tersedia. Tidak ada layanan baru atau deployment dalam perubahan ini. Seluruh identitas, pasien, fasilitas, tim, helikopter dan riwayat adalah sintetis.

## Mulai demonstrasi

1. Jalankan `npm ci`, lalu `npm run dev`. Buka `/mobile/login`, pilih **Operator**, lalu buka **Skenario demo** dari Beranda atau Akun (`/mobile/skenario`).
2. Muat **Permohonan baru**, kemudian **Buka permohonan**. Paket ini belum ditinjau. Operator meneruskan proses satu tahap melalui Diterima Operator, Diverifikasi, lalu Dalam Koordinasi.
3. Gunakan **Akun → Keluar → Login** untuk menjadi **Koordinator medis**. Buka permohonan yang sama dan catat penilaian. Pergantian peran ini simulasi, bukan autentikasi akun.
4. Sebagai **Koordinator penerbangan**, catat tinjauan penerbangan. Rekomendasi medis tidak menggantikan keputusan ini. Pilih Disetujui hanya sebagai keputusan latihan yang Anda masukkan sendiri.
5. Sebagai **Operator**, buka kesiapan sumber daya, pilih tim latihan milik paket, tinjau lalu ubah menjadi **Siap simulasi**. Kembali ke permohonan yang sama, isi tim dan pilih sumber daya, helikopter sintetis serta fasilitas penerima. Bentuk misi Persiapan, kemudian lanjutkan ke Tim Ditugaskan.
6. Sebagai **Dokter/perawat**, buka permohonan/misi terkait, simpan lima butir checklist dan catatan perkembangan sintetis. Koordinator penerbangan juga dapat menyimpan checklist.
7. Sebagai **Operator**, lanjutkan misi satu tahap: Berangkat → Tiba di Lokasi → Pasien Dijemput → Menuju Fasilitas Penerima → Serah Terima. UI memberi alasan bila prasyarat belum terpenuhi. Berangkat mensyaratkan tinjauan penerbangan Disetujui dan sumber daya tertaut yang masih siap.
8. Sebagai **Rumah sakit penerima** atau **Dokter/perawat**, catat serah terima pada misi tersebut. Sebagai Operator, selesaikan misi. Paket selesai menggunakan serah terima, tanpa override. Permohonan dapat ditutup melalui transisi permohonan yang sudah tersedia.
9. Periksa Beranda, Permohonan, Misi, Kesiapan dan Laporan. Sebagai **Viewer pimpinan**, buka `/pimpinan`: hanya agregat, tanpa tombol perubahan, data rinci atau catatan klinis. Administrator dapat meninjau semua modul.

Pilihan cepat: **Koordinasi berlangsung** sudah memuat riwayat penilaian terpisah, penugasan, checklist dan catatan; lanjutkan dari Tim Ditugaskan. **Misi selesai** memuat seluruh riwayat sampai serah terima dan penyelesaian. Keduanya adalah paket riwayat latihan yang telah disiapkan, bukan persetujuan baru yang dijalankan panduan secara otomatis. Tautan setiap paket mempertahankan ID permohonan; detail menyediakan tautan ke misi dan helikopter yang tepat.

## Model, kewenangan dan transisi

- `src/lib/permissions.ts` menjadi sumber pemeriksaan kemampuan UI dan domain; `Services.gs` memakai helper baca yang sama dari bundle. Viewer tetap hanya mendapat `leadership.summary`. Catatan pasien hanya dapat dibaca Dokter/perawat, Koordinator medis dan Administrator. Operator/Admin menyiapkan atau mereset paket; mode connected menolak fungsi paket sebelum menyentuh penyimpanan.
- `src/lib/workflow.ts` memusatkan aturan urutan status yang sebelumnya ada di dispatcher. Enum tersimpan dan kontrak lama tetap berlaku. Persiapan dengan nama tim tetap didukung; penilaian bukan prasyarat baru yang dipaksakan pada pembuatan misi lama. Keberangkatan memeriksa persetujuan penerbangan dan kesiapan sumber daya yang dipilih. Penyelesaian memerlukan serah terima tertaut atau alasan override eksplisit Operator/Admin, sebagaimana model sebelumnya.
- Penugasan kini dapat menyimpan `resourceIds`, `aircraftId`, `receivingFacilityId`. Domain memvalidasi sumber daya siap, helikopter sintetis dan fasilitas yang ada, lalu mempertahankan referensi pada misi/riwayat penugasan. Relasi permohonan/misi divalidasi saat menyimpan catatan.
- Ringkasan detail memperlihatkan penilaian yang belum/sudah tercatat, sumber daya, checklist, catatan yang boleh dibaca dan serah terima. Pencarian yang menyembunyikan pilihan tetap dijelaskan secara eksplisit; hasil kosong tidak diam-diam mengganti record terpilih.

## Paket, penyimpanan dan reset

Tiga namespace deterministik `baru`, `koordinasi`, `selesai` memakai UUID berawalan `d301`, `d302`, `d303`. Bagian delapan digit pertama menyertakan indeks objek sehingga referensi pendek dapat dibedakan. Record mempunyai penanda `demoScenario`; manifest versi 1 menyimpan requestId dan waktu pemuatan. Riwayat mulai sekitar 90 menit sebelum pembuatan paket, berurutan satu menit per operasi; tidak memakai waktu masa depan. Fixture dijalankan melalui validator domain yang sama sebelum digabungkan.

Pemuatan dilakukan dalam satu transaksi IndexedDB. Klik berulang, dua pemuatan bersamaan dan reload tidak membuat salinan atau mengganti edit pengguna. Benturan ID, manifest tidak lengkap atau antrean yang memakai ID paket menghentikan pemuatan. Kegagalan transaksi tidak menghasilkan pesan sukses atau data setengah tersimpan.

**Reset** memerlukan konfirmasi cakupan. Hanya record bertanda paket itu dan journal hasil terkait yang dihapus. Paket lain, data demo lain, draft, receipts, arsip dan outbox tetap ada. Reset ditolak bila ada antrean pemilik mana pun atau record lain yang merujuk objek paket. Tinjau antrean/relasi dahulu. Draft lama tetap harus ditinjau sebelum dipulihkan setelah reset; reset bukan penghapusan seluruh browser.

Status proses dipisahkan dari sumber penyimpanan: enum lama `Tercatat di Server` ditampilkan sebagai **Permohonan baru**, dengan **Tersimpan di perangkat** dalam demo atau **Tersinkron ke server** untuk hasil baca connected yang berhasil. Antrean mempunyai status **Menunggu sinkronisasi**, **Gagal dikirim**, atau **Perlu tinjauan konflik** sesuai bukti. Indikator perangkat online tidak membuktikan server sehat.

Form memiliki pengunci submit langsung dan menampilkan proses nyata. Field editor tidak ditimpa hasil penyimpanan yang tertunda. Memulihkan draft di atas isian yang berubah meminta pilihan eksplisit ganti/pertahankan. Draft tetap dipisah menurut mode/pemilik/objek/form yang sudah didukung.

Respons mutasi wajib berisi ID objek yang cocok dan revision positif sebelum bukti dibuat atau operasi dihapus. Kegagalan respons/penyimpanan meninggalkan operasi untuk retry dengan operationId, entityId dan payload yang sama. Konflik tidak dikirim ulang otomatis. Antrean browser tidak mengirim ketika aplikasi ditutup. Commit data memberi sinyal lokal dan BroadcastChannel ke tab lain; polling tetap menghormati offline/visibility dan tidak menimpa draft.

## Indikator dan ekspor

Dashboard memakai data sumber yang sama. Notifikasi commit memperbarui Beranda, ruang kerja, misi, kesiapan, laporan serta agregat pimpinan. Tidak ada jumlah misi atau pasien yang ditambahkan sebagai angka tampilan tetap.

Jumlah pasien permohonan adalah kebutuhan yang diajukan. Jumlah serah terima adalah **jumlah record serah terima**, bukan jumlah pasien yang sudah diserahterimakan: model sekarang belum menyimpan hitungan pasien pada serah terima. UI menjelaskan perbedaan tersebut.

Laporan operasional mengekspor seluruh snapshot yang boleh dibaca peran, bukan filter daftar tersembunyi. UI menyebut cakupan itu. CSV berisi kolom Peran, Cakupan, Simulasi, Modul, Referensi, Status proses, Penyimpanan sumber, Pembaruan (WIB) dan Rincian JSON (waktu ISO UTC). Teks CSV tetap di-escape termasuk formula. PDF adalah ringkasan seluruh baris (bukan seluruh JSON), memakai pagination dan pembungkusan teks. Catatan klinis tidak ikut laporan Operator. Ekspor dinonaktifkan ketika snapshot sedang dimuat atau gagal. Laporan Viewer tetap hanya agregat dengan cakupan periodenya sendiri.

## Verifikasi

- `npm run check`: 83 pengujian unit/mock berhasil, bundle Apps Script, TypeScript, build Vite serta pemeriksaan konfigurasi server dalam bundle berhasil.
- `npm run test:e2e -- --workers=2`: seluruh **61 pengujian browser berhasil**, menggunakan Chromium dan data sintetis lokal. Cakupan baru meliputi tiga paket idempoten, reload, reset/cancel terisolasi, alur nyata lintas peran sampai Selesai, draft ganti/pertahankan, submit ganda, kegagalan penyimpanan dan pembaruan agregat lintas tab.
- Unit/mock mencakup penolakan transisi/Viewer, transaksi rollback, reset yang melindungi antrean/relasi, retry identitas sama, respons sukses tanpa acknowledgment valid serta dispatcher Apps Script.
- Screenshot skenario diperiksa pada mobile 390 × 844 dan desktop 1366 × 768. Pengukuran halaman skenario tidak menemukan horizontal overflow pada lebar 320, 360, 390, 430, 768 dan 1366. Suite regresi juga memeriksa permukaan mobile lama.
- CSV dari tombol nyata dibuka dengan parser CSV; PDF dari tombol nyata dibuka dengan `pdfinfo` dan `pdftotext` (A4, dua halaman pada snapshot uji). Header simulasi/peran/sumber/WIB dan baris akhir terbaca, tanpa catatan klinis Operator.

Peringatan build yang tersisa: anotasi dependency Zod dan ukuran chunk utama >500 kB; tidak menghalangi build. Tidak ada pengujian akun Sheets/Vercel aktif, gangguan jaringan deployment nyata, perangkat fisik atau screen reader manusia. Adapter backend diuji dengan Sheets in-memory. Tidak ada klaim keamanan produksi, kesiapan medis/penerbangan atau sinkronisasi saat browser ditutup. Perubahan bundle Domain.gs dan Services.gs perlu dirilis bersama frontend saat kelak diotorisasi; tugas ini tidak melakukan deploy.

## Screenshot dan berkas perubahan

| Tahap           | Mobile                                                       | Desktop                                                        |
| --------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| Pilih paket     | [390](screenshots/integrated-demo/scenario-manager-390.png)  | [1366](screenshots/integrated-demo/scenario-manager-1366.png)  |
| Permohonan baru | [390](screenshots/integrated-demo/request-new-390.png)       | [1366](screenshots/integrated-demo/request-new-1366.png)       |
| Koordinasi      | [390](screenshots/integrated-demo/coordination-390.png)      | [1366](screenshots/integrated-demo/coordination-1366.png)      |
| Misi selesai    | [390](screenshots/integrated-demo/mission-completed-390.png) | [1366](screenshots/integrated-demo/mission-completed-1366.png) |
| Pengawasan      | [390](screenshots/integrated-demo/leadership-390.png)        | [1366](screenshots/integrated-demo/leadership-1366.png)        |
| Laporan         | [390](screenshots/integrated-demo/reports-390.png)           | [1366](screenshots/integrated-demo/reports-1366.png)           |

[Konfirmasi reset](screenshots/integrated-demo/reset-confirmation.png). Bottom navigation pada screenshot full-page berada di posisi viewport saat capture; halaman tetap dapat di-scroll sampai footer dan memiliki ruang bawah.

Berkas utama:

- Paket/routing: `src/lib/scenarios.ts`, `src/services/demoScenarios.ts`, `src/pages/DemoScenarios.tsx`, `src/main.tsx`, `src/lib/mobile.ts`, `src/pages/Mobile.tsx`.
- Domain/izin/backend: `src/lib/permissions.ts`, `src/lib/workflow.ts`, `src/services/demo.ts`, `apps-script/entry.ts`, `apps-script/Services.gs`, `apps-script/Domain.gs` (generated).
- Penyimpanan/refresh: `src/services/storage.ts`, `src/services/api.ts`, `src/features/usePolling.ts`.
- Ruang kerja/detail/laporan: `src/components/WorkflowSummary.tsx`, `src/components/RecordTable.tsx`, `src/pages/Internal.tsx`, `src/features/MissionControls.tsx`, `src/lib/presentation.ts`, `src/lib/reports.ts`, `src/pages/AirOperations.tsx`, `src/coordination-polish.css`.
- Form/draft: `src/features/useDraftRestore.tsx`, `src/pages/Public.tsx`, `src/features/OperationalForm.tsx`, `src/features/CatalogueManager.tsx`, `src/features/aircraft/AircraftReportForm.tsx`.
- Pengujian: `tests/scenarios.test.ts`, `tests/apps-script.test.ts`, `tests/sync.test.ts`, `tests/presentation.test.ts`, `e2e/integrated-demo.spec.ts`, `e2e/mobile-functional.spec.ts`, `e2e/coordination-polish.spec.ts`, `e2e/refinements.spec.ts`.
- Dokumentasi: panduan ini, `README.md`, `docs/ACCESS-AND-API.md`, dan `docs/screenshots/integrated-demo/`.
