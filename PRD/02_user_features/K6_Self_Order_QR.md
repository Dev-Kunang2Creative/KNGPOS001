# FEATURE K6 - Self-Order via QR Code

## Objective

Memungkinkan pelanggan memesan dan membayar mandiri dari meja menggunakan smartphone, tanpa memanggil waiter. Order otomatis dirouting ke kitchen/bar station sesuai zona meja.

## Scope

Halaman menu publik per meja via QR token, cart pelanggan, pembayaran non-tunai (Xendit), routing otomatis ke kitchen/bar station yang benar.

---

## Functional Requirements

### QR Code per Meja

- Setiap meja memiliki QR Code unik → URL: `/s/{qr_token}`
- Token dapat di-regenerate oleh Manager (token lama langsung expired)

### Validasi QR

- Backend validasi `qr_token` → temukan meja → cek meja aktif dan self-order enabled
- Cek zona meja: jika zona belum punya station assignment → tampilkan error "Sistem sedang tidak tersedia. Silakan hubungi staf."
- Token tidak valid → "QR Code tidak valid. Silakan minta staf."

### Halaman Menu (Public, Tanpa Login)

- Tampilkan nama + logo restoran
- Daftar menu per kategori (tab horizontal)
- Setiap item: gambar, nama, deskripsi, harga
- Item `is_available = false` → ditandai "Habis" atau disembunyikan
- Cart: floating button di bawah

### Cart & Order

- Tambah/ubah/hapus item
- Tambah catatan per item
- Review: daftar item, subtotal, pajak, service charge, total

### Pembayaran

- Hanya Xendit non-tunai (QRIS, e-wallet, bank transfer)
- Polling status setiap 5 detik
- Konfirmasi sukses → halaman terima kasih

### Routing Setelah Bayar

```
Webhook Xendit → /api/xendit/callback
  ↓
Konfirmasi → buat order (order_type: self_order, kasir_id: null)
  ↓
OrderRoutingService:
  meja {qr_token.table_id} → zone_id → zone_station_assignment
  → kitchen_station_id K, bar_station_id B
  ↓
Item makanan → kitchen_orders (station K)
Item minuman → bar_orders (station B)
  ↓
Broadcast: kitchen.station.K, bar.station.B
Broadcast: pos.{kasir_aktif} → "Self-order masuk di Meja X"
Waiter zona meja notifikasi (order akan segera masuk queue)
```

---

## UI/UX Layout

**Konsep: "The Guest Menu"**
- Mobile portrait, fullscreen
- Foto menu dominan, tampilan bersih
- Tab kategori: horizontal scrollable di atas
- Cart sticky di bawah: total + badge jumlah item
- Warna dan logo mengikuti profil restoran (dari `system_settings`)

**Flow Halaman:**
1. Menu utama
2. Cart
3. Pembayaran (Xendit)
4. Konfirmasi / Terima Kasih

---

## Data Model

Entity: `tables`, `table_qrcodes`, `orders`, `order_items`, `transactions`, `xendit_payments`

```
orders.order_type = 'self_order'
orders.kasir_id   = null
```

Routing tetap menggunakan `table.zone_id → zone_station_assignments`.

---

## Acceptance Criteria

- [ ] QR valid membuka menu dengan nama + logo restoran yang benar
- [ ] QR tidak valid menampilkan halaman error informatif
- [ ] Zona meja tanpa assignment → pesan error yang sesuai (bukan error 500)
- [ ] Item tidak tersedia ditandai atau disembunyikan
- [ ] Cart: tambah, ubah qty, hapus item berfungsi
- [ ] Pembayaran Xendit berhasil → order tersimpan dengan `order_type = self_order`
- [ ] Order dirouting ke kitchen/bar station yang benar berdasarkan zona meja
- [ ] Webhook duplikat tidak memproses order dua kali
- [ ] Kasir menerima notifikasi realtime ada self-order baru
