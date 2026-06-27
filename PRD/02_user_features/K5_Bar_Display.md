# FEATURE K5 - Bar Display System (Per Station)

## Objective

Menyediakan tampilan digital realtime untuk staf bar di setiap bar station — menampilkan hanya order minuman yang masuk ke station mereka berdasarkan zona routing.

## Scope

Bar display per station, realtime update via WebSocket, update status order, notifikasi order baru.

---

## Prerequisite

Staf bar harus login dengan akun role `bar`. Sistem resolve bar station berdasarkan assignment staf tersebut (diatur Manager). Jika belum di-assign ke station: "Anda belum ditugaskan ke Bar Station. Hubungi Manager."

---

## Functional Requirements

### Tampilan Bar Board

- Fullscreen display, landscape orientation
- Font besar — terbaca dari jarak 1–2 meter
- Hanya menampilkan order yang masuk ke **bar station ini** (berdasarkan `bar_orders.bar_station_id`)
- Realtime via WebSocket channel `bar.station.{station_id}`
- Hanya item dengan `print_to IN ('bar', 'kitchen_bar')` yang muncul

### Card Order

- Nama meja + Zona (contoh: "B2 — Outdoor")
- Timer: waktu tunggu sejak order masuk
- Daftar item minuman: nama + qty + catatan
- Status: QUEUED | IN PROGRESS | DONE
- Warna card per status: kuning / biru / hijau

### Update Status

- "Mulai Buat" → QUEUED → IN_PROGRESS
- "Selesai" → IN_PROGRESS → DONE
  - Broadcast ke `waiter.zone.{zone_id}`: minuman siap diantar
  - Broadcast ke `dashboard`: update metrics bar station

### Filter & Sorting

- Tab: Semua | Menunggu | Diproses | Selesai
- Sorting: FIFO (order lama duluan)
- Alert visual saat order baru masuk

---

## Routing: Siapa yang Dapat Order Ini?

```
Order di-submit untuk Meja B2 (Zona Outdoor)
  ↓
zone_station_assignments WHERE zone_id = Outdoor
  → bar_station_id = 2 (Bar Station 2)
  ↓
bar_orders dibuat dengan bar_station_id = 2
  ↓
Broadcast → bar.station.2
  ↓
Hanya Bar Station 2 yang tampilkan order ini
```

---

## Perbedaan Bar vs Kitchen

| Aspek | Kitchen | Bar |
|-------|---------|-----|
| Item yang tampil | `print_to = kitchen / kitchen_bar` | `print_to = bar / kitchen_bar` |
| Channel | `kitchen.station.{id}` | `bar.station.{id}` |
| Redirect | Manager bisa redirect antar kitchen | Tidak ada redirect di V1 |
| Notifikasi selesai | Ke `waiter.zone.{id}` | Ke `waiter.zone.{id}` |

---

## UI/UX Layout

**Konsep: "The Bar Board"**
- Identik dengan Kitchen Board tapi untuk minuman
- Header: nama station (contoh: "🍹 Bar 1")
- Warna tema sedikit berbeda untuk memudahkan bedakan layar kitchen vs bar

---

## Data Model

Entity: `bar_orders`, `bar_order_items`, `bar_stations`

```
bar_orders.bar_station_id → menentukan station yang handle
```

---

## Acceptance Criteria

- [ ] Bar staff hanya melihat order di bar station-nya
- [ ] Bar staff dari station lain tidak menerima broadcast station ini
- [ ] Hanya item dengan `print_to = bar` atau `kitchen_bar` yang tampil
- [ ] Order baru muncul realtime
- [ ] Update status berfungsi
- [ ] Setelah DONE: broadcast ke waiter zona yang sesuai
- [ ] Staf yang belum di-assign ke station mendapat pesan informatif
