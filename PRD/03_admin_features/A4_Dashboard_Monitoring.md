# FEATURE A4 - Dashboard Monitoring Realtime

## Objective

Menyediakan dashboard operasional realtime untuk Manager — mencakup metrics penjualan, status meja, performa per kasir, dan status setiap kitchen/bar station.

## Scope

Metrics penjualan hari ini, status meja per zona, transaksi aktif, menu terlaris, grafik intraday, status per station, perbandingan per kasir.

---

## Functional Requirements

### Metrics Utama (Realtime)

| Metric | Keterangan |
|--------|------------|
| Total Penjualan Hari Ini | Revenue bersih semua transaksi PAID hari ini |
| Jumlah Transaksi | Count transaksi selesai hari ini |
| Rata-rata Nilai Order | Total revenue / jumlah transaksi |
| Kasir 1 Revenue | Revenue dari transaksi oleh Kasir 1 |
| Kasir 2 Revenue | Revenue dari transaksi oleh Kasir 2 |
| Self-Order Revenue | Revenue dari transaksi self-order QR |
| Meja Terisi | Jumlah meja OCCUPIED atau OPEN |
| Meja Tersedia | Jumlah meja AVAILABLE |

### Status Per Kasir (Realtime)

- Card per kasir yang sedang shift aktif:
  - Nama kasir
  - Jumlah transaksi shift ini
  - Revenue shift ini
  - Jam mulai shift
- Kasir yang belum buka shift hari ini: ditampilkan sebagai "Belum Aktif"

### Status Kitchen & Bar Station (Realtime)

Panel monitoring semua station:

| Station | Order Queued | In Progress | Done Hari Ini | Status |
|---------|-------------|------------|--------------|--------|
| Kitchen 1 | 4 | 2 | 45 | ACTIVE |
| Kitchen 2 | 1 | 1 | 38 | ACTIVE |
| Bar 1 | 3 | 1 | 52 | ACTIVE |
| Bar 2 | 0 | 0 | 31 | ACTIVE |

- Status OVERLOADED otomatis highlight merah
- Tombol "Monitor" → buka halaman Kitchen Monitor untuk redirect

### Status Meja per Zona (Realtime)

- Grid kecil semua meja dengan warna status, dikelompokkan per zona
- Realtime via WebSocket channel `table.floor`
- Klik meja → ringkasan order aktif

### Grafik Penjualan Intraday
- Line/bar chart: revenue per jam hari ini
- Breakdown: Kasir 1 vs Kasir 2 vs Self-Order (stacked atau multi-line)

### Menu Terlaris Hari Ini
- Top 5–10 item berdasarkan qty terjual hari ini
- Refresh setiap 5 menit

### Transaksi Terkini
- 10–20 transaksi terakhir
- Kolom: waktu, meja, kasir/self-order, metode bayar, total
- Klik → detail transaksi

---

## UI/UX Layout

**Konsep: "The Control Room"**
- Layout bento: card metric di atas (row 1), station status + grafik (row 2), meja + transaksi (row 3)
- Desktop-first, tablet friendly
- Realtime update via WebSocket
- Card angka besar, warna sesuai status
- Station cards: warna hijau (active), kuning (overloaded), abu (inactive)

---

## Data Model

Entity: `orders`, `transactions`, `tables`, `cashier_shifts`, `kitchen_orders`, `bar_orders`

Broadcast Events:
- `DashboardMetricsUpdated` → channel `dashboard`
- `TableStatusUpdated` → channel `table.floor`
- `KitchenStationUpdated` → channel `dashboard` (termasuk station load update)

---

## Acceptance Criteria

- [ ] Total penjualan akurat dan update saat ada transaksi baru (realtime)
- [ ] Breakdown per kasir akurat — kasir 1 dan kasir 2 terpisah
- [ ] Status station (queued, in_progress) update realtime
- [ ] Status meja update realtime
- [ ] Grafik intraday menampilkan data per jam yang benar
- [ ] Tombol "Monitor" di station yang overload membuka halaman Kitchen Monitor
- [ ] Dashboard tidak bisa diakses oleh kasir, waiter, dapur, bar (403)
