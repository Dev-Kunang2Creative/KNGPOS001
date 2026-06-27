# FEATURE A2 - Menu Management

## Objective

Memungkinkan Manager mengelola data menu restoran secara lengkap: kategori, item menu, harga, ketersediaan, gambar, dan promo.

## Scope

CRUD kategori, CRUD menu item, upload gambar, toggle ketersediaan, manajemen promo/diskon.

---

## Functional Requirements

### Manajemen Kategori

- Tambah, edit, hapus (soft delete) kategori
- Field: nama, deskripsi, gambar kategori (opsional), urutan tampil (sort order)
- Toggle aktif/nonaktif kategori
- Hapus kategori hanya bisa jika tidak ada menu item aktif di dalamnya

### Manajemen Menu Item

- Tambah, edit, hapus (soft delete) menu item
- Field:
  - Nama item
  - Kategori (dropdown)
  - Harga (Rp)
  - Deskripsi singkat
  - Gambar item (upload ke `storage/menu/`)
  - **`print_to`**: `kasir` | `kitchen` | `bar` | `kitchen_bar`
    - `kasir` → hanya masuk struk kasir (contoh: minuman sachet, rokok)
    - `kitchen` → dikirim ke kitchen station zona meja
    - `bar` → dikirim ke bar station zona meja
    - `kitchen_bar` → dikirim ke keduanya
  - Ketersediaan: toggle "Tersedia" / "Habis"
  - Urutan tampil (sort order)
- Bulk actions: nonaktifkan beberapa item sekaligus
- Pencarian item menu

### Upload Gambar

- Format: JPG, PNG, WebP — max 2MB per gambar
- Gambar dikompres otomatis
- Preview gambar sebelum simpan

### Toggle Ketersediaan

- Toggle cepat dari halaman daftar menu
- Item `is_available = false` tampil sebagai "Habis" di self-order dan POS
- Perubahan broadcast realtime ke semua terminal yang terbuka

### Manajemen Promo

- Tipe promo:
  - **Persentase**: diskon X% dari subtotal
  - **Nominal Tetap**: potongan Rp X
- Berlaku untuk: semua item | kategori tertentu | item tertentu
- Periode validitas: `valid_from` dan `valid_until`
- Min. order amount (opsional)
- Toggle aktif/nonaktif
- Promo expired otomatis tidak berlaku

### Urutkan Tampilan

- Drag-and-drop urutan kategori
- Drag-and-drop urutan item dalam kategori
- Berdampak pada tampilan POS dan self-order

---

## UI/UX Layout

**Konsep: "The Menu Board Manager"**
- Tabel/daftar: gambar thumbnail, nama, kategori, harga, print_to (badge), status, aksi
- Toggle ketersediaan: switch langsung di kolom
- Filter by: kategori, status tersedia/habis
- Form tambah/edit: side panel atau modal
- Upload gambar: drag-and-drop zone

---

## Data Model

Entity: `menu_categories`, `menu_items`, `menu_promotions`

Key field `menu_items.print_to` — menentukan routing di `OrderRoutingService`:
- `kasir`: tidak membuat kitchen_order atau bar_order
- `kitchen`: membuat kitchen_order di station zona meja
- `bar`: membuat bar_order di station zona meja
- `kitchen_bar`: membuat keduanya

---

## Acceptance Criteria

- [ ] CRUD kategori berfungsi; hapus kategori dengan item aktif ditolak
- [ ] CRUD menu item berfungsi dengan upload gambar
- [ ] Field `print_to = kitchen` → order item masuk kitchen station zona meja yang benar
- [ ] Field `print_to = bar` → order item masuk bar station zona meja yang benar
- [ ] Field `print_to = kitchen_bar` → order item masuk keduanya
- [ ] Toggle ketersediaan langsung update di self-order dan POS (realtime)
- [ ] Promo persentase dan nominal dihitung benar saat checkout
- [ ] Promo expired tidak lagi berlaku di checkout
- [ ] Sort order berdampak pada tampilan POS dan self-order
