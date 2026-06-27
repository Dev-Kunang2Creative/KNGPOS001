# 00 - User Flows

## Purpose

Panduan flow per peran untuk UX dan pengembangan fitur Karcisqu POS.

---

## Flow 1 — Manager: Setup Awal Sistem

```
Manager login /login
  ↓
Wajib ganti password (must_change_password = true)
  ↓
Settings → Profil Restoran
  - Nama restoran, alamat, telepon
  - Logo (upload)
  - Header/footer struk
  ↓
Settings → Xendit
  - Input Secret Key + Webhook Token
  - Aktifkan metode: QRIS, E-Wallet, VA
  - Test koneksi
  ↓
Settings → Pajak & Service Charge
  - PPN: 11%, aktifkan
  - Service charge: 5%, aktifkan
  ↓
Zones → Buat Kitchen Station
  - Kitchen 1, Kitchen 2
  ↓
Zones → Buat Bar Station
  - Bar 1, Bar 2
  ↓
Settings → Meja
  - Buat zona: Indoor, Outdoor, VIP
  - Tambah meja: A1–A10 (Indoor), B1–B5 (Outdoor), VIP-1–VIP-3 (VIP)
  - QR Code auto-generate per meja
  ↓
Zones → Konfigurasi Assignment
  - Indoor  → Kitchen 1, Bar 1
  - Outdoor → Kitchen 2, Bar 2
  - VIP     → Kitchen 1, Bar 1 (atau sesuai kebutuhan)
  ↓
Zones → Assign Waiter ke Zona
  - Waiter A, B → Zona Indoor
  - Waiter C    → Zona Outdoor
  ↓
Menu → Buat Kategori & Item
  - Makanan Berat (print_to: kitchen)
  - Minuman (print_to: bar)
  - Snack (print_to: kitchen)
  ↓
Users → Buat akun staf
  - Kasir 1, Kasir 2
  - Waiter A, B, C
  - Kitchen 1 Staff, Kitchen 2 Staff
  - Bar 1 Staff, Bar 2 Staff
  ↓
Settings → Printer
  - Printer Kasir (type: kasir, IP: ...)
  - Printer Kitchen 1 (type: kitchen)
  - Printer Kitchen 2 (type: kitchen)
  - Printer Bar 1 (type: bar)
  ↓
Sistem siap operasional
```

---

## Flow 2 — Kasir: Order & Bayar (Tunai)

```
Kasir login → /pos
  ↓
Belum ada shift → Modal "Buka Shift"
  - Input modal awal: Rp 500.000
  - Shift aktif → POS terbuka
  ↓
Pilih Meja A3 (Zona Indoor)
  ↓
Browse menu → tambah ke cart:
  - Nasi Goreng ×2  (print_to: kitchen)
  - Es Teh ×2       (print_to: bar)
  - Notes: "Nasi goreng level 2"
  ↓
Cart kalkulasi:
  Subtotal:         Rp 80.000
  Service (5%):     Rp  4.000
  PPN (11%):        Rp  9.240
  TOTAL:            Rp 93.240
  ↓
Klik Submit Order
  ↓
OrderRoutingService:
  - Meja A3 → Zona Indoor → Kitchen 1, Bar 1
  - Nasi Goreng → kitchen_orders (Kitchen 1)
  - Es Teh → bar_orders (Bar 1)
  - Broadcast: kitchen.station.1, bar.station.1
  ↓
Klik "Bayar" → Metode: Tunai
  Input: Rp 100.000
  Kembalian: Rp 6.760
  ↓
Konfirmasi → PAID
  - Print struk kasir (Printer Kasir)
  - Meja A3 → status AVAILABLE
  - Shift summary update (+Rp 93.240 tunai)
```

---

## Flow 3 — Kasir: Bayar Non-Tunai (Xendit QRIS)

```
Cart selesai → Klik "Bayar" → Metode: QRIS
  ↓
Backend buat Xendit invoice
  external_id: karcisqu-{transaction_id}-{timestamp}
  ↓
QR Code tampil di layar kasir
  Countdown timer (15 menit expiry)
  ↓
Pelanggan scan QR → bayar di app bank/e-wallet
  ↓
Xendit kirim webhook POST /api/xendit/callback
  ↓
Backend validasi X-CALLBACK-TOKEN
Log payload → xendit_webhook_logs
Cek idempotency (external_id sudah PAID?)
  ↓
Konfirmasi → update order PAID → meja AVAILABLE
Print struk → broadcast konfirmasi ke POS kasir
```

---

## Flow 4 — Kitchen Station: Proses Order

```
Kitchen Staff login → /kitchen
  ↓
Sistem resolve: user ini assigned ke Kitchen Station mana?
  → Subscribe channel: kitchen.station.{stationId}
  ↓
Layar Kitchen Board tampil order dari zona yang di-assign ke station ini
  ↓
Order masuk (realtime) dari Meja A3:
  [QUEUED] Nasi Goreng ×2 — "Level 2"
  Timer: 00:00 (baru masuk)
  ↓
Klik "Mulai Proses" → status: IN_PROGRESS
  Timer: berjalan (tracking lama masak)
  ↓
Klik "Selesai" → status: DONE
  ↓
Broadcast ke:
  - waiter.zone.{zone_id}: "Pesanan meja A3 siap diantar"
  - dashboard: update metrics
```

---

## Flow 5 — Manager: Redirect Kitchen Overload

```
Manager buka /kitchen/monitor
  ↓
Tampil semua kitchen station dengan jumlah order:
  Kitchen 1: 12 order [OVERLOADED]
  Kitchen 2:  3 order [ACTIVE]
  ↓
Manager klik Kitchen 1 → lihat daftar order
  ↓
Pilih beberapa order yang masih QUEUED:
  [✓] Order Meja A5 — Nasi Goreng, Ayam Bakar
  [✓] Order Meja A8 — Mie Goreng
  ↓
Klik "Redirect ke Kitchen 2"
  ↓
Modal konfirmasi:
  - Dari: Kitchen 1
  - Ke: Kitchen 2
  - Alasan: "Kitchen 1 overload"
  ↓
Konfirmasi → KitchenRedirectService
  - UPDATE kitchen_orders SET kitchen_station_id = 2
  - INSERT kitchen_order_reassignments (log)
  - Broadcast kitchen.station.1: hapus order tsb
  - Broadcast kitchen.station.2: tambah order tsb
  ↓
Kitchen 2 display: order meja A5, A8 muncul (dengan label "Dialihkan dari Kitchen 1")
Kitchen 1 display: order meja A5, A8 hilang
Manager: konfirmasi sukses, Kitchen 1 load berkurang
```

---

## Flow 6 — Waiter: Antar Pesanan

```
Waiter login → /orders
  ↓
Sistem resolve: waiter ini di-assign ke zona mana?
  → Tampil hanya order dari zona tersebut
  ↓
List order ready:
  🟢 Meja A3 — Nasi Goreng ×2, Es Teh ×2 — SIAP
  🟡 Meja A5 — Ayam Bakar ×1 — DIMASAK (in progress)
  ↓
Waiter ambil pesanan A3 dari kitchen/bar
  → Antar ke Meja A3
  ↓
Klik "Sudah Diantar" pada order Meja A3
  → Status update: DELIVERED
  → Notifikasi ke kasir (opsional)
```

---

## Flow 7 — Self-Order via QR (Pelanggan)

```
Pelanggan scan QR di Meja B2 (Zona Outdoor)
  ↓
URL: /s/{qr_token}
  ↓
Backend: validasi qr_token → meja B2, aktif ✓
Halaman menu tampil (mobile):
  - Logo + nama restoran
  - Tab: Makanan | Minuman | Snack
  ↓
Pelanggan browse dan tambah ke cart:
  - Ayam Bakar ×1 (print_to: kitchen)
  - Jus Alpukat ×1 (print_to: bar)
  ↓
Review cart → total + pajak
  ↓
Klik "Bayar" → pilih QRIS
  ↓
Backend buat Xendit invoice → tampil QR
Pelanggan bayar
  ↓
Webhook Xendit → /api/xendit/callback
Konfirmasi → buat order (Meja B2, Zona Outdoor)
  ↓
OrderRoutingService:
  - Zona Outdoor → Kitchen 2, Bar 2
  - Ayam Bakar → kitchen_orders (Kitchen 2)
  - Jus Alpukat → bar_orders (Bar 2)
  ↓
Kitchen 2: order muncul realtime
Bar 2: order muncul realtime
Kasir: notifikasi "Self-order masuk di Meja B2"
Pelanggan: halaman "Pesanan Diterima!"
```

---

## Flow 8 — Manager: Monitor & Laporan Harian

```
Manager login → /dashboard
  ↓
Overview realtime:
  - Total penjualan hari ini: Rp 4.250.000
  - Kasir 1: Rp 2.100.000 (22 transaksi)
  - Kasir 2: Rp 2.150.000 (25 transaksi)
  - Meja terisi: 8/20
  - Kitchen 1: 4 order in progress
  - Kitchen 2: 2 order in progress
  ↓
/reports/kasir
  - Filter: hari ini
  - Kasir 1: 22 transaksi, Rp 2.100.000, diskon Rp 50.000
  - Kasir 2: 25 transaksi, Rp 2.150.000, diskon Rp 30.000
  - TOTAL: 47 transaksi, Rp 4.250.000
  ↓
Export PDF → background job → download link via notifikasi
```

---

## Flow 9 — Kasir: Tutup Shift

```
Kasir klik "Tutup Shift"
  ↓
Modal ringkasan shift:
  - Shift: 08:00 – 16:00
  - Modal awal: Rp 500.000
  - Total transaksi: 22
  - Total tunai: Rp 1.200.000
  - Total QRIS: Rp 900.000
  - Total diskon: Rp 50.000
  - Grand total revenue: Rp 2.100.000
  - Selisih kas: Rp 0
  ↓
Konfirmasi → shift ditutup
  → Kasir tidak bisa buat transaksi baru
  → Perlu buka shift baru untuk mulai lagi
```
