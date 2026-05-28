# FEATURE A6 - Konfigurasi Meja & QR Code

## Objective

Memungkinkan Manager mengatur meja restoran, menetapkan setiap meja ke zona yang tepat, dan men-generate QR Code unik untuk self-order di setiap meja.

## Scope

CRUD meja, assignment meja ke zona, konfigurasi layout denah, generate dan regenerate QR Code per meja, print QR Code.

---

## Functional Requirements

### Manajemen Meja

- Tambah, edit, hapus meja
- Field per meja:
  - Nama meja (contoh: A1, B3, VIP-1)
  - Kapasitas (jumlah kursi)
  - **Zona** (dropdown — pilih zona yang sudah dikonfigurasi): menentukan ke kitchen/bar station mana order akan dikirim
  - Posisi di denah (koordinat X, Y)
  - Status default: `available`
  - Self-order enabled: toggle ya/tidak
- Hapus meja hanya bisa jika tidak ada order aktif
- Soft delete: meja terhapus tidak tampil di POS tapi data historis tetap ada

### Assignment Meja ke Zona

Assignment meja ke zona adalah yang menentukan **ke mana order di meja tersebut akan dirouting**. Saat Manager mengganti zona meja:
- Order baru setelah perubahan → menggunakan zona baru → station baru
- Order aktif yang sedang berjalan → tidak berubah

**Warning saat buat meja baru**: jika zona yang dipilih belum memiliki kitchen/bar station assignment, tampilkan warning "Zona ini belum terkonfigurasi. Order di meja ini akan ditolak sampai zona dikonfigurasi di menu Zone Management."

### Layout Denah

- Tampilan kanvas dengan posisi meja sesuai tata letak restoran
- Drag-and-drop posisi meja (update `position_x`, `position_y`)
- Meja ditampilkan dengan **warna zona** (sesuai `zones.color_hex`)
- Konfigurasi ini mempengaruhi tampilan denah di POS kasir dan waiter

### Generate QR Code

- Setiap meja punya QR Code unik yang mengarah ke URL: `/s/{qr_token}`
- QR Code auto-generate saat meja dibuat
- QR bisa di-regenerate: token lama langsung tidak valid
- QR tampil dalam format PNG

### Print QR Code

- Print single QR (satu meja) atau bulk (semua meja)
- Format print: A5 atau kartu custom
- Preview sebelum print: logo restoran + nama meja + zona + QR Code
- Download sebagai PDF atau PNG

### Enable / Disable Self-Order per Meja

- Toggle self-order aktif/nonaktif per meja
- Jika nonaktif: scan QR → pesan "Self-order tidak tersedia untuk meja ini"
- Override global: nonaktifkan self-order semua meja sekaligus

---

## UI/UX Layout

**Konsep: "The Floor Designer"**
- Tab: "Daftar Meja" (tabel) dan "Denah Visual" (kanvas)
- Tabel: nama, zona (badge warna), kapasitas, self-order status, QR, aksi
- Meja di kanvas diwarnai sesuai zona
- Legenda zona di sudut kanvas
- Card QR per meja: QR kecil, tombol "Regenerate" dan "Print"
- Modal print: preview dengan logo + nama meja + zona + QR

---

## Data Model

Entity: `tables`, `table_qrcodes`, `zones`

```
tables.zone_id → zones.id  (FK, nullable — meja bisa belum di-assign ke zona)
table_qrcodes.qr_token: UUID atau random string ≥ 32 chars
table_qrcodes.is_active: satu QR aktif per meja
```

Self-order URL: `/s/{qr_token}`

---

## Acceptance Criteria

- [ ] CRUD meja berfungsi; hapus meja dengan order aktif ditolak
- [ ] Meja bisa di-assign ke zona; perubahan zona efektif untuk order baru
- [ ] Meja tanpa zona menampilkan warning di daftar dan di POS
- [ ] Posisi meja bisa diatur di kanvas; warna zona tampil di kanvas
- [ ] QR Code auto-generate saat meja dibuat; URL format `/s/{qr_token}`
- [ ] QR Code lama tidak valid setelah di-regenerate
- [ ] Print QR menghasilkan PDF/PNG dengan nama meja, zona, dan logo restoran
- [ ] Toggle self-order per meja berfungsi
