# PRD — Karcisqu POS V1

## Product Overview

**Karcisqu POS** adalah sistem Point of Sale untuk satu restoran/kafe dengan operasional multi-staf dan multi-station. Sistem dirancang untuk restoran yang memiliki beberapa kasir, beberapa dapur (kitchen station), beberapa bar station, dan waiter yang melayani zona-zona tertentu di area restoran.

**Tagline:** *"Satu sistem, semua station terkoordinasi."*

---

## Masalah yang Diselesaikan

| Masalah | Solusi Karcisqu |
|---------|----------------|
| Order kertas hilang atau salah antar ke dapur | Order digital otomatis masuk ke station yang tepat |
| Dapur 1 penuh, Dapur 2 idle — tidak ada koordinasi | Manager bisa redirect order manual saat overload |
| Waiter tidak tahu pesanan mana yang sudah selesai | Notifikasi realtime saat kitchen/bar selesai |
| Laporan kasir 1 vs kasir 2 tidak bisa dipisah | Breakdown per kasir + total keseluruhan |
| Pelanggan harus antre panggil waiter untuk pesan | Self-order via QR Code di meja |

---

## Konsep Utama: Zone-Based Routing

Restoran dibagi menjadi **zona-zona area** (misal: Zona A — Indoor, Zona B — Outdoor, Zona C — VIP). Setiap zona dikonfigurasi oleh Manager untuk terhubung ke:
- **Kitchen Station tertentu** (Kitchen 1, Kitchen 2, dst.)
- **Bar Station tertentu** (Bar 1, Bar 2, dst.)
- **Waiter** yang bertugas di zona tersebut

Saat kasir atau pelanggan membuat order di meja tertentu, sistem **otomatis merouting** pesanan ke station yang tepat berdasarkan zona meja tersebut.

```
Meja A3 (Zona Indoor)
  → Item makanan  → Kitchen 1
  → Item minuman  → Bar 1
  → Diantar oleh  → Waiter Zona Indoor

Meja D7 (Zona Outdoor)
  → Item makanan  → Kitchen 2
  → Item minuman  → Bar 2
  → Diantar oleh  → Waiter Zona Outdoor
```

Ketika Kitchen 1 overload, Manager bisa **redirect order secara manual** ke Kitchen 2 — keputusan tetap di tangan Manager, bukan otomatis.

---

## Role Hierarchy

```
Super Admin
└── Manager
    ├── Kasir (2+)        — buat order, proses pembayaran
    ├── Waiter (per zona) — antar makanan ke meja
    ├── Dapur (per station) — proses order makanan
    └── Bar (per station)   — proses order minuman
```

| Role | Akses Utama |
|------|------------|
| Super Admin | Semua fitur + user management level atas |
| Manager | Dashboard, laporan, zona, menu, staf, pengaturan |
| Kasir | POS — buat order, proses pembayaran, buka/tutup shift |
| Waiter | Lihat & update order di zona tugasnya |
| Dapur | Kitchen display per station, update status masak |
| Bar | Bar display per station, update status minuman |

---

## V1 Scope

### Fitur Inti (Wajib V1)
- Login semua role, redirect per role
- POS Kasir: buat order, bayar tunai & Xendit
- Kitchen Display per station (realtime, zona-aware)
- Bar Display per station (realtime, zona-aware)
- Waiter: lihat & update order per zona
- Zone management: konfigurasi zona → kitchen station → bar station → waiter
- Manual kitchen redirect saat overload (Manager)
- Self-order via QR Code per meja (routing otomatis ke station)
- Cashier shift management + ringkasan per kasir
- Dashboard realtime Manager
- Laporan penjualan: breakdown per kasir + total keseluruhan
- Menu management (kategori, item, promo, print_to)
- Thermal printer (kasir + kitchen station + bar station)
- Pending transaction safety net

### Di Luar V1 Scope
- Manajemen stok/inventory
- Loyalty program / membership
- Multi-outlet / multi-cabang
- Automated kitchen load balancing (otomatis — V1 manual saja)
- Mobile app native (iOS/Android)
- Akuntansi terintegrasi

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Laravel 13, PHP 8.2+ |
| Frontend | React 18 + Inertia.js 2.0, Vite 5 |
| Styling | Tailwind CSS 3 |
| Auth/RBAC | Spatie Laravel Permission + Laravel Breeze |
| Database | MySQL (production), SQLite in-memory (test) |
| Payment | Xendit (QRIS, e-wallet, VA, bank transfer) |
| Email | Resend |
| WebSocket | Laravel Reverb |
| Queue | Laravel Queue (database driver) |
| Printer | ESC/POS thermal via WiFi/LAN |

---

## Release Phases

### Phase 1 — Core Operations
Kasir POS, Kitchen/Bar Display (multi-station), Zone routing, Cashier shift, Pembayaran tunai + Xendit.

### Phase 2 — Self-Order & Waiter
Self-order QR, Waiter zone management, Open bill, Split bill.

### Phase 3 — Analytics & Management
Dashboard realtime, Laporan per kasir + total, Export PDF/Excel, Kitchen redirect (overload handling).

### Phase 4 — Polish & Optimization
Thermal print, Pending transaction, Performance tuning, Audit log lengkap.

---

## Success Criteria

- Kasir bisa selesaikan 1 transaksi (order → bayar → print) dalam < 60 detik
- Order makanan otomatis masuk ke kitchen station yang benar berdasarkan zona meja
- Kitchen redirect oleh Manager berhasil memindahkan order tanpa kehilangan data
- Laporan kasir 1 dan kasir 2 bisa dibedakan + total keseluruhan akurat
- Self-order QR pelanggan berhasil masuk ke kitchen/bar station yang tepat
