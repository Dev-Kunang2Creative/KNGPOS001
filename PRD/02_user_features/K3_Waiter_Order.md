# FEATURE K3 - Waiter Order Management

## Objective

Memungkinkan waiter melihat dan mengelola order di zona yang menjadi tugasnya — mulai dari order masuk, status kitchen/bar, hingga konfirmasi antar ke meja pelanggan.

## Scope

Lihat order per zona, tambah item ke open bill, tandai pesanan sudah diantar, transfer/merge meja.

---

## Prerequisite

Waiter harus sudah di-assign ke minimal satu zona oleh Manager (via Zone Management). Jika belum di-assign: tampilkan pesan "Anda belum ditugaskan ke zona manapun. Hubungi Manager."

---

## Functional Requirements

### Tampilan Order Waiter

Waiter hanya melihat order dari zona yang menjadi tugasnya.

- Daftar order per meja, dikelompokkan per zona tugas waiter
- Status tiap order item:
  - 🟡 **QUEUED**: sudah dikirim ke kitchen/bar, menunggu diproses
  - 🔵 **IN PROGRESS**: sedang dimasak/dibuat
  - 🟢 **READY**: siap diantar ke meja
  - ✅ **DELIVERED**: sudah diantar
- Notifikasi realtime (WebSocket channel `waiter.zone.{zone_id}`) saat ada item READY

### Tambah Item ke Order (Open Bill)

Waiter bisa tambah item ke order yang sudah ada:
- Pilih meja → lihat cart aktif → tambah item
- Submit tambahan → `OrderRoutingService` routing otomatis ke kitchen/bar station zona meja
- Waiter tidak perlu shift aktif

### Konfirmasi Antar

- Klik "Sudah Diantar" pada order yang sudah READY
- Status berubah ke DELIVERED
- Notifikasi ke kasir bahwa order sudah diantar (opsional)

### Transfer & Merge Meja

- **Transfer meja**: pindah order dari meja A ke meja B
- **Merge meja**: gabungkan 2+ meja menjadi satu tagihan
- Transfer antar zona tetap menggunakan kitchen/bar station zona meja tujuan

### Lihat Status Meja

- Mini denah meja untuk zona waiter ini
- Realtime via WebSocket `table.floor`

---

## UI/UX Layout

**Konsep: "The Floor Manager"**
- List view: order per meja dengan status item
- Tab filter: Semua | Menunggu | Siap Diantar
- Badge counter notifikasi saat ada item READY
- Tombol "Sudah Diantar" hijau, ukuran besar

---

## Data Model

Entity: `orders`, `order_items`, `kitchen_orders`, `bar_orders`, `waiter_zone_assignments`

Waiter scope:
```
auth()->user() → WaiterZoneAssignment → zone_ids[]
→ Table WHERE zone_id IN zone_ids
→ Order WHERE table_id IN table_ids AND status != 'paid'
```

---

## Acceptance Criteria

- [ ] Waiter hanya melihat order dari zona yang di-assign kepadanya
- [ ] Waiter yang belum di-assign ke zona mendapat pesan informatif
- [ ] Notifikasi realtime muncul saat ada item READY di zona waiter
- [ ] Konfirmasi "Sudah Diantar" berhasil update status
- [ ] Tambah item ke open bill → routing ke station yang benar (zona meja)
- [ ] Transfer/merge meja berfungsi
