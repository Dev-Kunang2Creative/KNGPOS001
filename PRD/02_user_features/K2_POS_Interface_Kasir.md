# FEATURE K2 - POS Interface Kasir

## Objective

Menyediakan antarmuka kasir yang cepat, intuitif, dan akurat untuk proses order dan checkout.

## Scope

Pilih meja, tambah item ke cart, apply diskon/promo, proses pembayaran tunai/non-tunai, cetak struk.

## Prerequisite

Shift kasir harus aktif (`EnsureActiveShift` middleware). Jika belum buka shift → redirect ke halaman buka shift.

## Functional Requirements

### Tampilan Utama POS
- Panel kiri: **Cart** (item yang dipilih, qty, subtotal)
- Panel kanan: **Menu Browser** (kategori tabs + daftar item dengan gambar dan harga)
- Header: nama kasir, meja aktif, waktu, tombol buka/tutup shift

### Pilih Meja
- Grid denah meja dengan status warna:
  - Hijau: tersedia
  - Merah: terisi (ada order aktif)
  - Kuning: open bill
- Klik meja → langsung masuk ke sesi order meja tersebut

### Cart & Order
- Tambah item: klik menu item → masuk cart
- Ubah qty: tombol +/- di cart
- Hapus item: tombol X di cart
- Tambah catatan item (notes per item)
- Cari menu: search bar di panel menu
- Filter menu by kategori

### Kalkulasi Otomatis
- Subtotal per item = qty × harga
- Diskon: input nominal atau persentase; atau pilih promo yang tersedia
- Service charge: otomatis dari `tenant_settings.service_charge_percentage` tenant ini
- Pajak (PPN): otomatis dari `tenant_settings.tax_percentage` tenant ini
- **Total = Subtotal - Diskon + Service Charge + Pajak**

### Submit Order → Zone Routing

Saat kasir klik "Submit Order" (sebelum bayar):
1. Backend panggil `OrderRoutingService`
2. Resolve: meja → zona → `zone_station_assignments` → kitchen station + bar station
3. Item `print_to=kitchen` → `kitchen_orders` di station yang benar
4. Item `print_to=bar` → `bar_orders` di station yang benar
5. Broadcast ke channel station masing-masing

Jika zona meja belum dikonfigurasi → tampilkan error: "Zona meja ini belum dikonfigurasi. Hubungi Manager."

### Proses Checkout
1. Klik tombol "Bayar"
2. Pilih metode pembayaran:
   - **Tunai**: input nominal diterima → sistem hitung kembalian → konfirmasi → order selesai
   - **QRIS / Non-Tunai**: generate Xendit payment (key dari `system_settings`) → tampil QR atau link → polling status → konfirmasi otomatis saat paid
3. Konfirmasi → trigger print struk (kasir + kitchen + bar sesuai item dan station)
4. Meja kembali ke status `AVAILABLE`

### Fitur Tambahan
- **Hold Order**: simpan cart sementara (open bill) tanpa proses pembayaran
- **Void Item**: batalkan item yang sudah dikirim ke kitchen (butuh approval manager jika sudah diproses)
- **Discount Override**: kasir bisa input diskon manual (sesuai batas permission)
- **Order History Hari Ini**: lihat transaksi yang sudah selesai di shift ini

## UI/UX Layout

**Konsep: "The Speed Desk"**
- Layout 2 kolom: cart (kiri 40%) + menu (kanan 60%)
- Tablet landscape sebagai device utama
- Font besar untuk harga dan total (mudah dibaca saat transaksi ramai)
- Tombol "Bayar" ukuran besar, warna primer, selalu visible di bawah cart
- Kategori menu sebagai horizontal tabs dengan icon
- Item menu: card dengan gambar kecil, nama, harga — grid 3–4 kolom

**Warna Status:**
- Cart item aktif: background putih bersih
- Total amount: font besar, bold, warna primer
- Meja tersedia: hijau; terisi: merah; open bill: kuning

## Data Model

Entity utama: `orders`, `order_items`, `transactions`, `cashier_shifts`

## Workflow

```
Buka Shift (jika belum) → Pilih Meja → Tambah Menu ke Cart
→ (Opsional: apply diskon/promo) → Klik Bayar → Pilih Metode
→ Proses Bayar → Cetak Struk → Meja Reset ke Available
```

## Acceptance Criteria

- [ ] Kasir bisa pilih meja dan melihat menu
- [ ] Tambah, ubah, hapus item dari cart berfungsi
- [ ] Total dihitung benar termasuk diskon, tax, service charge
- [ ] Bayar tunai: kembalian benar, transaksi tersimpan
- [ ] Bayar Xendit: QR tampil, callback konfirmasi otomatis
- [ ] Struk tercetak ke printer kasir setelah transaksi selesai
- [ ] Item makanan otomatis masuk kitchen print, minuman ke bar print
- [ ] Kasir tanpa shift aktif diblokir dari semua aksi order
