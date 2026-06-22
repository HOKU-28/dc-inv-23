# Changelog

Semua perubahan pada proyek `dc-inv-22-master` dari sesi ini.

## [Unreleased]

### Added

#### 1. Dev server localhost
- Menjalankan `npm run dev` menggunakan Node.js lokal di `.tools/node`.
- Aplikasi dapat diakses di **http://localhost:3000**.

#### 2. Owner — Checklist Daftar Belanja
- Di kartu ungu **Daftar Belanja**, owner sekarang bisa checklist item yang sudah dibeli.
- Setiap item memiliki kotak centang di sebelah kiri.
- Item yang dicentang akan diberi coretan dan dihapus dari daftar belanja.
- Tombol **"Checklist Semua"** untuk menandai semua item sekaligus.
- Tombol **"Kosongkan Daftar"** tetap tersedia untuk mengosongkan tanpa checklist.

#### 3. Staff — Hapus Item di Cek Stok
- Di halaman **Cek Stok**, setiap kartu item memiliki ikon **sampah** di pojok kanan atas.
- Staff bisa menghapus/mengarsipkan item yang salah input atau tidak dipakai lagi.
- Sebelum dihapus muncul konfirmasi agar tidak terhapus secara tidak sengaja.

#### 4. Log Aktivitas Staff yang Lengkap
- Jenis log diperluas: `check`, `in`, `add`, `archive`.
- Saat staff **Tambah Item**, tercatat sebagai aktivitas `add`.
- Saat staff **Hapus Item**, tercatat sebagai aktivitas `archive`.
- Di halaman Owner → **Aktivitas Staff**, owner bisa melihat semua jenis aktivitas dengan badge warna:
  - **Cek** = biru
  - **Masuk** = hijau
  - **Tambah** = ungu
  - **Hapus** = merah

#### 5. Notifikasi Toast untuk Staff
- Staff mendapat notifikasi setelah melakukan aksi:
  - **Scan barcode ditemukan**: "Barcode ditemukan: [Nama Item]"
  - **Scan barcode tidak ditemukan**: "Barcode tidak ditemukan. Tambahkan item baru."
  - **Simpan Cek Stok**: "Cek stok [Nama Item] tersimpan."
  - **Simpan Stok Masuk**: "Stok masuk [Nama Item] tersimpan."
  - **Simpan Tambah Item**: "Item [Nama Item] berhasil ditambahkan."

### Fixed

- **Checklist Semua** sebelumnya menampilkan toast satu per satu untuk setiap item. Sekarang hanya muncul **satu toast**: "[Jumlah] item ditandai sudah dibeli."
- **Browser console bersih saat schema Supabase belum tersedia**: memperbaiki filter `.not("id", "in", ...)` yang salah syntax di `app/lib/sync-extra.ts`, dan menangani error schema-mismatch (`PGRST204`/`PGRST205`) agar tidak membanjiri console browser. Sekarang muncul satu peringatan saja dan sync cloud di-skip secara elegan.

### Added

#### 6. Owner — Kelola Staff
- Owner sekarang bisa mengelola akun staff dari dashboard.
- Section baru **"Kelola Staff"** di halaman owner.
- Fitur:
  - **Tambah staff**: nama, email, password.
  - **Edit staff**: ubah nama/email dan password (opsional).
  - **Hapus staff**: dengan konfirmasi dialog.
  - **Cari staff** berdasarkan nama atau email.
- Data staff disimpan di `localStorage` (`dominico-users`).
- Akun owner tidak dapat dihapus untuk menjaga akses sistem.

### Changed

#### Owner — Kartu Stok Habis
- Di kartu merah **"Item Habis"**, tulisan **"Sisa X <satuan>"** dihapus karena barang yang habis tidak memiliki sisa stok.
- Detail "Item Habis" sekarang menampilkan kategori item.

### Added

#### 8. Select-All Hapus Item di Cek Stok Staff
- Di halaman **Cek Stok**, staff sekarang bisa memilih banyak item sekaligus dengan tombol **"Pilih Semua"**.
- Setiap kartu item memiliki checkbox untuk seleksi individual.
- Tombol **"Hapus N item"** muncul saat ada item terpilih, dengan konfirmasi dialog sebelum dihapus.
- Item yang dihapus staff langsung diarsipkan (`isActive: false`) dan hilang dari daftar aktif.
- Setiap penghapusan tetap tercatat sebagai log `archive` dengan nama staff yang menghapus.

#### 9. Owner Dapat Mengembalikan atau Hapus Permanen Item
- Section baru **"Kelola Item"** di dashboard owner.
- Owner bisa melihat semua item aktif dan arsip, serta mengaktifkan kembali item yang sudah diarsipkan.
- Di tab **Arsip**, item yang dihapus oleh staff ditandai dengan keterangan **"Dihapus oleh [nama staff]"**.
- Tombol **"Hapus"** berwarna merah di item arsip untuk **menghapus item secara permanen**.
- Konfirmasi dialog muncul sebelum hapus permanen; log aktivitas tetap tersimpan sebagai jejak.
- Jadi keputusan akhir tetap di tangan owner: aktifkan kembali, biarkan di arsip, atau hapus permanen.

#### 10. Dashboard Lebih Cepat & Tidak Hang Saat Login
- Initial load dashboard staff dan owner tidak lagi menunggu sync ke Supabase selesai.
- Data lokal ditampilkan langsung; sync cloud berjalan di background.
- Indikator sinkronisasi kecil muncul di header saat sedang sync, tapi user tetap bisa pakai aplikasi.
- Transisi dari login ke dashboard terasa lebih cepat dan lancar.

### Changed

#### Login & Dashboard
- `app/dashboard/staff/page.tsx` dan `app/dashboard/owner/page.tsx`: sync `syncAll()` dan `syncExtra()` dijalankan non-blocking setelah UI muncul.

#### Layout Dashboard Owner
- Grid card abu-abu di owner dashboard diubah dari 3 kolom menjadi **4 kolom** di layar besar, sehingga **Kelola Item**, **Aktivitas Staff**, **Kelola Staff**, dan **Recovery Code** sejajar tanpa ruang kosong.

### Changed Files (Sesi Ini)

- `app/dashboard/staff/page.tsx`
- `app/dashboard/owner/page.tsx`
- `app/components/dashboard/owner-tab.tsx`
- `app/components/dashboard/item-tab.tsx`
- `app/lib/data.ts`
- `CHANGELOG.md`

### Added

#### 7. Autentikasi & Session yang Lebih Aman dan Lancar
- **Session fingerprint**: setiap session menyimpan sidik jari dari hash password user. Jika password diubah atau user dihapus, session langsung tidak valid.
- **Session refresh saat aktif**: session diperpanjang otomatis saat user berinteraksi (klik/scroll/ketik) sehingga tidak tiba-tiba logout saat sedang dipakai.
- **Remember me**: opsi "Ingat saya" saat login memperpanjang masa session hingga 30 hari.
- **Rate limiting login**: setelah 5x percobaan salah, login dikunci selama 15 menit untuk mencegah brute-force.
- **Recovery code auto-format**: input recovery code otomatis diberi tanda hubung dan dibatasi panjangnya.
- **Indikator kekuatan password**: muncul saat setup owner dan reset password.
- **Hook `useAuth`**: proteksi dashboard owner & staff menjadi satu tempat, dengan redirect yang menampilkan alasan jika session habis.
- **Recovery code owner**: owner bisa buat recovery code baru dari dashboard dengan memverifikasi password saat ini.

### Fixed

- **Build error**: `updateUser` di `staff-management.tsx` sekarang di-`await` karena `updateUser` sudah async.
- **Bug login redirect ganda**: setelah login pertama kali dengan akun yang masih pakai password plaintext (seed user), session sekarang langsung valid karena password di-migrate sebelum session dibuat.

### Changed Files

- `app/components/dashboard/owner-tab.tsx`
- `app/components/dashboard/staff-management.tsx`
- `app/dashboard/owner/page.tsx`
- `app/dashboard/staff/page.tsx`
- `app/hooks/use-auth.ts`
- `app/lib/auth.ts`
- `app/lib/crypto.ts`
- `app/lib/sync-extra.ts`
- `app/page.tsx`
- `app/types.ts`
- `CHANGELOG.md`

### Changed Files

- `app/components/dashboard/owner-tab.tsx`
- `app/components/dashboard/staff-management.tsx`
- `app/dashboard/owner/page.tsx`
- `app/dashboard/staff/page.tsx`
- `app/hooks/use-auth.ts` (file baru)
- `app/lib/auth.ts`
- `app/lib/crypto.ts`
- `app/lib/sync-extra.ts`
- `app/page.tsx`
- `app/types.ts`
- `CHANGELOG.md`
