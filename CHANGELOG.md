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

### Changed Files

- `app/components/dashboard/owner-tab.tsx`
- `app/dashboard/staff/page.tsx`
- `app/types.ts`
- `CHANGELOG.md` (file baru)
