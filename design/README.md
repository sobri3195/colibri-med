# Identitas visual COLIBRI MED

Logo utama menampilkan helikopter putih di atas perisai biru-hijau, sayap emas, serta ular dan tongkat medis. Warna, bentuk perisai, dan simbol medis mengambil inspirasi dari referensi Puskesau yang diberikan pengguna. Ini desain untuk prototipe COLIBRI MED; bukan pengganti atau pengesahan lambang resmi Puskesau.

Logo dibuat dengan image generation berdasarkan referensi pengguna. File sumber transparan disimpan di `colibri-med-logo.png`. Varian `colibri-med-icon.png` menyederhanakan detail kabin dan menghilangkan tongkat medis agar siluet helikopter tetap menonjol pada favicon. Wordmark COLIBRI MED tetap berupa teks HTML sehingga tajam dan dapat dibaca teknologi bantu.

Turunan produksi berada di `public/`: logo 96/192/512 px, favicon PNG 16/32 px dan ICO 16/32/48 px, Apple touch icon 180 px, serta ikon manifest 192/512 px. PNG tetap transparan; tidak menggunakan aset eksternal atau CDN. Aset master tidak disalin ke bundle produksi.

Rewrite SPA di `vercel.json` mengecualikan path branding, favicon, Apple touch icon, dan manifest agar request aset tidak diarahkan ke HTML aplikasi.

Untuk membuat ulang turunan tanpa mengubah desain, pasang ImageMagick 7 dan jalankan `npm run build:branding`. Build aplikasi biasa memakai file hasil konversi yang sudah di-commit dan tidak memerlukan ImageMagick. Manifest menyediakan metadata ikon dan pintasan `/mobile`; aplikasi belum menyediakan service worker atau jaminan penggunaan offline penuh.
