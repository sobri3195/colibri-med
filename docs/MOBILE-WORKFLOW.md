# Panduan uji `/mobile`

Gunakan data sintetis saja. `npm ci && npm run dev` menyiapkan demo. Seluruh navigasi tetap di `/mobile` kecuali akun Viewer pimpinan yang diarahkan ke `/pimpinan` untuk agregat baca-saja. Demo tidak menggantikan akun petugas sungguhan.

1. Dari Beranda atau menu Permohonan publik, isi form contoh. Simpan/muat draft, pilih koordinat manual atau peta, lalu kirim. Tunggu konfirmasi. Tombol kirim dinonaktifkan untuk pengiriman yang sama; pilih **Mulai permohonan baru** hanya untuk permohonan lain. Tidak ada upload atau geocoding.
2. **Bukti pencatatan saya** memuat referensi lokal dan waktu penerimaan, tanpa identitas/kontak. Buka melalui akun petugas dan login sebagai Operator/Administrator. ID permohonan yang sama dibawa ke halaman kerja setelah login. Ini bukan pelacakan permohonan publik atau jaminan penugasan bantuan.
3. Di daftar petugas, tekan **Buka permohonan** pada kartu, atau pilih pada dropdown. Terima, verifikasi, dan lanjutkan ke Dalam Koordinasi. Buat misi dengan nama tim sintetis. Jika perlu, ubah tim sebelum keberangkatan dengan alasan.
4. Melalui Akun → Penilaian & catatan, petugas berwenang mencatat penilaian medis dan keputusan penerbangan terpisah. Demo Administrator dapat mencoba seluruh alur; pengujian role terpisah tetap diperlukan. Rekomendasi medis tidak memberi izin terbang. Penundaan/penolakan wajib disertai alasan.
5. Simpan checklist koordinasi dan catatan sintetis. Checklist memiliki butir yang benar-benar disimpan sebagai boolean serta revision record. Tunggu informasi versi record sebelum reload. Draft milik tiap formulir tetap terpisah.
6. Lanjutkan misi dari Persiapan sampai Serah Terima. Keberangkatan memerlukan keputusan penerbangan Disetujui. Catat serah terima melalui peran yang sesuai, lalu selesaikan misi. Override penyelesaian tanpa rekam serah terima memerlukan alasan dan tetap tercatat. Pembatalan juga memerlukan alasan.
7. Akun → Laporan menyediakan CSV/PDF dari data yang boleh dibaca akun. Akun → Outbox menampilkan operasi menunggu jaringan, gagal atau konflik. Retry memakai ID sama; konflik harus ditinjau, sedangkan kegagalan parsial memerlukan rekonsiliasi administrator. Jangan membuat operasi pengganti untuk melewati partial failure.
8. Peta menampilkan direktori dan permohonan sintetis dengan alternatif daftar. Cari berdasarkan data yang tersimpan. Kartu permohonan membuka konteks kerja yang sama. Peta/tile atau izin lokasi yang gagal tidak menghentikan input manual dan daftar lokasi.
9. Administrator dapat membuka **Kelola fasilitas/sumber daya sintetis** untuk menambah atau memperbarui record. Operator hanya mencatat kesiapan sumber daya. Status tidak tersedia menonaktifkan record tanpa menghapus riwayat. Tidak ada klaim kapasitas/kelayakan resmi.
10. Akun → Pengaturan menyimpan interval polling per mode/pengguna pada perangkat. Tunggu **Pengaturan tersimpan**. Reload mempertahankan sesi demo selama expiry awal masih berlaku; logout dan expiry menghapus sesi tersebut.

## Uji offline

Setelah halaman terbuka, putuskan jaringan lalu kirim satu permohonan. Pastikan label antrean muncul. Hidupkan jaringan, muat ulang halaman, lalu gunakan **Kirim ulang outbox saya**. Bukti pencatatan baru muncul hanya setelah respons sukses. Kirim ulang lagi tidak membuat record baru. Form direktori dan catatan yang mengantre juga tidak dapat diklik ulang untuk operasi yang sama.

Offline berarti draft/outbox dalam tab yang sudah dimuat. Tidak ada service worker yang menjamin halaman baru dapat dibuka tanpa jaringan, tile offline, atau sinkronisasi ketika browser ditutup. Perangkat online bukan bukti backend sehat. Data IndexedDB dapat dibatasi/dihapus oleh perangkat.

## Mode connected

Ikuti DEPLOYMENT.md untuk Vercel, Apps Script dan Sheets privat. `vite` saja menjalankan demo, bukan Vercel Function. Cookie connected tetap HttpOnly/Secure dan tidak dipindahkan ke sessionStorage. Backend memeriksa role/revision/operationId pada setiap mutasi. Pengujian integrasi Google Sheets/Vercel nyata belum dilakukan; bukti yang tersedia adalah demo browser dan source Apps Script dengan mock.
