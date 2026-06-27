# FEATURE A7 - System Settings & Configuration

## Objective

Memungkinkan Manager mengkonfigurasi sistem Karcisqu POS: profil restoran, printer thermal per station, gateway pembayaran Xendit, pajak, service charge, dan konfigurasi struk.

## Scope

Profil restoran, konfigurasi printer (per station), konfigurasi Xendit, pajak & service charge, konfigurasi struk.

---

## Functional Requirements

### Profil Restoran
- Nama restoran, alamat, nomor telepon
- Logo restoran (upload PNG/JPG max 1MB) — tampil di self-order dan header struk
- Jam operasional (informasi, tidak memblokir sistem)
- Header struk: teks di bagian atas struk cetak
- Footer struk: teks di bawah struk (contoh: "Terima kasih! Selamat makan.")
- Preview struk setelah ubah header/footer

### Konfigurasi Printer Thermal

Printer dikonfigurasi per tipe dan bisa di-assign ke station tertentu:

- Tambah, edit, hapus printer
- Field per printer:
  - Nama (contoh: Printer Kasir, Printer Kitchen 1, Printer Kitchen 2, Printer Bar 1)
  - Tipe: `kasir` | `kitchen` | `bar`
  - **Station assignment** (jika tipe kitchen/bar): pilih Kitchen Station atau Bar Station yang dilayani
  - IP Address dan Port (koneksi WiFi/LAN)
  - Lebar kertas (58mm atau 80mm)
  - Status aktif/nonaktif
- Test cetak: kirim print job test ke printer tertentu

**Contoh konfigurasi:**
```
Printer Kasir   → type: kasir   → (no station)
Printer Dapur 1 → type: kitchen → Kitchen Station 1
Printer Dapur 2 → type: kitchen → Kitchen Station 2
Printer Bar 1   → type: bar     → Bar Station 1
```

Saat order masuk ke Kitchen Station 2, sistem otomatis print ke "Printer Dapur 2".

### Konfigurasi Xendit

Satu konfigurasi Xendit untuk seluruh restoran, disimpan encrypted di `system_settings`:

- Input Xendit Secret Key dan Webhook Token
- Pilih metode pembayaran yang diaktifkan:
  - [ ] QRIS
  - [ ] E-Wallet (OVO, GoPay, Dana, ShopeePay, LinkAja)
  - [ ] Bank Transfer / Virtual Account
- Test koneksi Xendit (validasi API key)
- Callback URL ditampilkan (readonly): `{APP_URL}/api/xendit/callback`
- Tampilkan status koneksi: Connected / Error

### Pajak & Service Charge

- Persentase PPN (contoh: 11%)
- Persentase Service Charge (default: 0%)
- Toggle: aktif / nonaktif pajak
- Toggle: aktif / nonaktif service charge
- Konfigurasi: pajak dihitung dari subtotal sebelum atau sesudah diskon

### Konfigurasi Struk

Template struk kasir — pilih informasi yang ditampilkan:
- [ ] Logo restoran
- [ ] Nomor meja + zona
- [ ] Nama kasir
- [ ] Daftar item (nama, qty, harga)
- [ ] Breakdown diskon/tax/service charge
- [ ] Footer custom

Template struk kitchen: nama meja, zona, item, qty, catatan — tanpa harga
Template struk bar: sama dengan kitchen

### Audit Log

- Bisa diakses dari Settings → Audit Logs
- Filter by: user, aksi, tanggal
- Export audit log ke CSV

---

## UI/UX Layout

**Konsep: "The Control Panel"**
- Navigasi tab/sidebar: Profil | Printer | Pembayaran | Pajak | Struk | Audit
- Form save per section (tidak satu form besar)
- Status indikator untuk koneksi Xendit dan printer
- Preview struk: tampil di sisi kanan saat edit template

---

## Data Model

Entity: `system_settings`, `printers`

Key `system_settings`:
- `restaurant_name`, `restaurant_address`, `restaurant_phone`, `restaurant_logo`
- `receipt_header`, `receipt_footer`
- `xendit_secret_key` (encrypted), `xendit_webhook_token` (encrypted)
- `xendit_enabled`, `xendit_active_methods` (JSON)
- `tax_percentage`, `tax_is_active`
- `service_charge_percentage`, `service_charge_is_active`

`printers` table: id, name, type, kitchen_station_id (nullable), bar_station_id (nullable), ip_address, port, paper_width, is_active

---

## Acceptance Criteria

- [ ] Profil restoran bisa diupdate; logo tampil di self-order dan header struk
- [ ] Printer bisa dikonfigurasi per station; test cetak berfungsi
- [ ] Order ke Kitchen 1 otomatis print ke printer yang di-assign ke Kitchen Station 1
- [ ] Konfigurasi Xendit berhasil disimpan; test koneksi menampilkan status akurat
- [ ] Perubahan pajak/service charge langsung berlaku di transaksi baru
- [ ] Template struk berdampak pada format cetak
- [ ] Hanya Manager dan Super Admin yang bisa ubah konfigurasi Xendit dan pajak (kasir tidak bisa)
