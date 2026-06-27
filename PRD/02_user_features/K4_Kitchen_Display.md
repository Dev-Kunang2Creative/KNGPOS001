# FEATURE K4 - Kitchen Display System (Per Station)

## Objective

Menyediakan tampilan digital realtime untuk staf dapur di setiap kitchen station — menampilkan hanya order yang masuk ke station mereka berdasarkan zona routing.

## Scope

Kitchen display per station, realtime update via WebSocket, update status order (queued → in_progress → done), tampilkan label redirect, notifikasi order baru.

---

## Prerequisite

Staf dapur harus login dengan akun role `dapur`. Sistem resolve kitchen station berdasarkan assignment staf tersebut (diatur oleh Manager). Jika staf belum di-assign ke station: tampilkan pesan "Anda belum ditugaskan ke Kitchen Station. Hubungi Manager."

---

## Functional Requirements

### Tampilan Kitchen Board

- Fullscreen display, landscape orientation
- Font besar — terbaca dari jarak 1–2 meter
- Hanya menampilkan order yang masuk ke **kitchen station ini** (berdasarkan `kitchen_orders.kitchen_station_id`)
- Realtime via WebSocket channel `kitchen.station.{station_id}`

### Card Order

Setiap order ditampilkan sebagai card:
- Nama meja + Zona (contoh: "A3 — Indoor")
- Timer: berapa lama sudah menunggu sejak order masuk
- Daftar item: nama + qty + catatan khusus
- Status badge: QUEUED | IN PROGRESS | DONE
- Label khusus (jika ada): **"🔀 Dialihkan dari Kitchen 2"** — untuk order yang di-redirect oleh Manager
- Warna card per status:
  - QUEUED: kuning
  - IN PROGRESS: biru
  - DONE: hijau (hilang setelah beberapa detik atau di-dismiss)

### Update Status

- Tombol "Mulai Proses" → QUEUED → IN_PROGRESS (timer mulai berjalan)
- Tombol "Selesai" → IN_PROGRESS → DONE
  - Broadcast ke `waiter.zone.{zone_id}`: "Pesanan meja X siap diantar"
  - Broadcast ke `dashboard`: update metrics station
- Tidak bisa kembali ke status sebelumnya (forward-only)

### Filter & Sorting

- Tab: Semua | Menunggu | Diproses | Selesai
- Default sorting: berdasarkan waktu masuk (FIFO — yang paling lama duluan)
- Alert visual (pulse/flash animasi) saat ada order baru masuk

### Kitchen Monitor Access (Manager Only)

Manager bisa akses `/kitchen/monitor` untuk melihat **semua** kitchen station sekaligus dan melakukan redirect — lihat `A8_Zone_Station_Management.md`.

---

## Routing: Siapa yang Dapat Order Ini?

```
Order di-submit untuk Meja A3 (Zona Indoor)
  ↓
zone_station_assignments WHERE zone_id = Indoor
  → kitchen_station_id = 1 (Kitchen Station 1)
  ↓
kitchen_orders dibuat dengan kitchen_station_id = 1
  ↓
Broadcast → kitchen.station.1
  ↓
Hanya Kitchen Station 1 yang tampilkan order ini
```

---

## UI/UX Layout

**Konsep: "The Kitchen Board"**
- Header: nama station (contoh: "🍳 Kitchen 1"), jumlah order per status (badge)
- Kanban columns: Menunggu | Diproses | Selesai
  - atau scroll vertical dengan tab filter (tergantung jumlah order)
- Card: warna per status, timer prominent, tombol aksi besar
- Alert bar di atas saat ada order baru (bisa ada suara notifikasi)

---

## Data Model

Entity: `kitchen_orders`, `kitchen_order_items`, `kitchen_stations`, `kitchen_order_reassignments`

```
kitchen_orders.kitchen_station_id → menentukan station yang handle
kitchen_order_reassignments → log redirect (from_station, to_station)
```

---

## Acceptance Criteria

- [ ] Kitchen staff hanya melihat order di kitchen station-nya
- [ ] Kitchen staff dari station lain tidak menerima broadcast station ini (channel isolated)
- [ ] Order baru muncul realtime tanpa refresh
- [ ] Update status QUEUED → IN_PROGRESS → DONE berfungsi
- [ ] Setelah DONE: broadcast ke waiter zona yang sesuai
- [ ] Order yang di-redirect dari station lain menampilkan label "Dialihkan dari Kitchen X"
- [ ] Staf yang belum di-assign ke station mendapat pesan informatif
- [ ] Timer menampilkan waktu tunggu yang akurat
