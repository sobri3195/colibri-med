# COLIBRI Air Medical — review desain

Redesign menyatukan halaman publik, login demo, ruang petugas, mobile, peta helikopter dan pengawasan pimpinan. Data, API, perizinan, routing dan backend tetap memakai implementasi yang tersedia.

## Perubahan visual

- Header dan sidebar navy, permukaan terang, kartu putih beradius 20 px, tombol teal dan border lembut. Tanpa gradient pada kartu.
- Login demo mobile dan desktop memakai komponen kartu radio yang sama. Desktop menampilkan panel identitas dan ilustrasi di kiri, pilihan peran di kanan. Tidak ada autentikasi baru.
- Hero Beranda ringkas dengan ilustrasi SVG lokal, peran aktif, satu aksi utama, ringkasan dua kolom, dan indikator perhatian dari jumlah permohonan yang benar-benar tersedia.
- Daftar permohonan desktop berdampingan dengan detail. Nama fasilitas mendahului metadata, pilihan aktif memiliki border, ikon centang, dan teks “Dipilih”. Kartu misi dan permohonan memakai badge status bersama.
- Formulir memiliki kelompok berikon, input minimal 16 px, pesan error dekat field, dan perbedaan jelas antara kirim, simpan draft, dan tindakan tambahan.
- Peta Leaflet/OpenStreetMap lebih dominan dengan legenda, marker terpilih, kontrol 44 px, panel posisi, dan laporan awak sebagai aktivitas. Posisi laporan dan ilustrasi playback tetap dibedakan.
- Dashboard pimpinan mempertahankan empat KPI yang berasal dari data, tren harian nyata, daftar perhatian, periode dan rincian kesiapan. Label pada permukaan teal diperiksa kontrasnya.
- Navigasi mobile mempertahankan ikon, label, safe area, dan penanda aktif. Focus, disabled, error, empty state serta reduced motion didukung.

## Sistem visual

| Token                 | Nilai                 |
| --------------------- | --------------------- |
| Navy utama / gelap    | `#102A43` / `#0B1F33` |
| Teal utama / lembut   | `#087F8C` / `#E7F5F4` |
| Background / surface  | `#F4F7FB` / `#FFFFFF` |
| Teks utama / sekunder | `#172B4D` / `#526579` |
| Border                | `#D9E2EC`             |

`src/air-medical.css` menjadi lapisan tema bersama setelah stylesheet lama. Komponen baru `DesignSystem.tsx` menyediakan Button, DataCard, PageHeading, FormSection, Field, FilterBar dan NavigationLink. StatusBadge, EmptyState, BrandMark dan komponen peta yang tersedia tetap digunakan. Font sistem dan ikon outline Lucide tetap memakai dependensi yang ada; tidak ada tambahan dependensi.

## Screenshot sebelum dan sesudah

Screenshot memakai halaman, viewport, peran Administrator dan paket data sintetis yang sama. Waktu pembaruan/ID lokal dapat berbeda karena masing-masing sesi disiapkan ulang. Viewport mobile 390 × 844; desktop 1366 × 900. Screenshot full-page merekam navigasi fixed pada posisi viewport saat pengambilan, bukan elemen yang mengikuti seluruh tinggi gambar.

Tile OpenStreetMap sengaja diblokir oleh skrip capture untuk menampilkan fallback yang jujur dan konsisten. Latar abu-abu pada peta bukan basemap buatan. Kontrol, marker, koordinat dan panel laporan tetap ditampilkan.

| Halaman         | Mobile sebelum                                     | Mobile sesudah                                   | Desktop sebelum                                     | Desktop sesudah                                   |
| --------------- | -------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------- |
| Login           | [Before](screenshots/before-login-mobile.png)      | [After](screenshots/after-login-mobile.png)      | [Before](screenshots/before-login-desktop.png)      | [After](screenshots/after-login-desktop.png)      |
| Beranda         | [Before](screenshots/before-home-mobile.png)       | [After](screenshots/after-home-mobile.png)       | [Before](screenshots/before-home-desktop.png)       | [After](screenshots/after-home-desktop.png)       |
| Permohonan      | [Before](screenshots/before-requests-mobile.png)   | [After](screenshots/after-requests-mobile.png)   | [Before](screenshots/before-requests-desktop.png)   | [After](screenshots/after-requests-desktop.png)   |
| Formulir        | [Before](screenshots/before-form-mobile.png)       | [After](screenshots/after-form-mobile.png)       | [Before](screenshots/before-form-desktop.png)       | [After](screenshots/after-form-desktop.png)       |
| Peta helikopter | [Before](screenshots/before-map-mobile.png)        | [After](screenshots/after-map-mobile.png)        | [Before](screenshots/before-map-desktop.png)        | [After](screenshots/after-map-desktop.png)        |
| Pimpinan        | [Before](screenshots/before-leadership-mobile.png) | [After](screenshots/after-leadership-mobile.png) | [Before](screenshots/before-leadership-desktop.png) | [After](screenshots/after-leadership-desktop.png) |

Ambil ulang sesudah menjalankan `npm run dev -- --port 5173 --strictPort`:

```sh
node scripts/capture-design-review.mjs after
```

`CHROMIUM_PATH`, `DESIGN_BASE_URL` dan `DESIGN_OUTPUT_DIR` dapat menyesuaikan browser, server dan tujuan screenshot. Skrip hanya mengisi data demo sintetis melalui UI dalam konteks browser baru.

## Pemeriksaan

- `npm test`: 83 unit/mock tests lulus.
- `npm run build`: TypeScript, Vite dan pemeriksaan marker konfigurasi server lulus.
- `npm run format:check` dan `git diff --check`: lulus.
- Suite browser final: 67 dari 68 lulus pada eksekusi paralel. Satu skenario filter laporan awak gagal menemukan hasil setelah reload; keempat tes modul helikopter lulus pada pengulangan satu worker tanpa perubahan aplikasi/assertion. Dengan pengulangan tersebut, semua 68 skenario berhasil dijalankan. Kegagalan sementara ini tetap dicatat sebagai ketidakstabilan tes dan belum memiliki diagnosis akar penyebab yang pasti.
- Lebar 320, 360, 390, 430, 768 dan 1366 px; navigasi, overflow, zoom teks, keyboard, draft, offline/outbox, pergantian peran, polling/sesi, dan ekspor CSV/PDF diperiksa melalui suite yang tersedia.
- Tujuh tes baru memeriksa ilustrasi terpisah dari judul, tujuan login Viewer desktop, empat KPI, dan rasio kontras minimal 4.5:1 pada label perhatian pimpinan.

Peringatan build yang masih ada: anotasi tree-shaking Zod dan chunk frontend di atas 500 kB. Keduanya tidak menggagalkan build.

## Batas pengujian

Validasi menggunakan Chromium sistem pada Linux dan data sintetis. Safari/iOS, Firefox, perangkat Android/iOS fisik, pembaca layar nyata, integrasi Google Sheets/Apps Script/Vercel produksi dan pemuatan tile peta melalui jaringan nyata belum divalidasi. Tidak ada deploy, publish atau perubahan backend.

## File implementasi dan tes

- `e2e/admin-flight.spec.ts`
- `e2e/air-medical.spec.ts`
- `e2e/leadership.spec.ts`
- `e2e/mobile-experience.spec.ts`
- `e2e/mobile-login.spec.ts`
- `e2e/refinements.spec.ts`
- `e2e/workflow.spec.ts`
- `scripts/capture-design-review.mjs`
- `src/air-medical.css`
- `src/components/AircraftMap.tsx`
- `src/components/DesignSystem.tsx`
- `src/components/FlightAccent.tsx`
- `src/components/MobileOverview.tsx`
- `src/components/RecordTable.tsx`
- `src/main.tsx`
- `src/pages/Internal.tsx`
- `src/pages/Leadership.tsx`
- `src/pages/Login.tsx`
- `src/pages/Mobile.tsx`
- `src/pages/MobileDemoLogin.tsx`
- `src/pages/Public.tsx`

Dokumentasi: `docs/design-review/README.md` dan 24 screenshot di `docs/design-review/screenshots/`.
