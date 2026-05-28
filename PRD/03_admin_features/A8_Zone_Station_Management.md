# FEATURE A8 - Zone & Station Management

## Objective

Memungkinkan Manager mengkonfigurasi zona area restoran, kitchen station, bar station, serta mengatur routing order dan penugasan waiter per zona. Ini adalah inti dari sistem zone-based routing Karcisqu POS.

## Scope

CRUD zona, CRUD kitchen station, CRUD bar station, konfigurasi assignment zona → station, assign waiter ke zona, monitor status station.

---

## Functional Requirements

### Manajemen Zona

Zona adalah area fisik restoran (contoh: Indoor, Outdoor, VIP, Rooftop).

- Tambah, edit, hapus zona
- Field per zona:
  - Nama (contoh: Indoor, Outdoor, VIP)
  - Deskripsi (opsional)
  - Warna (untuk visual denah meja)
  - Urutan tampil
  - Status aktif/nonaktif
- Hapus zona hanya bisa jika tidak ada meja aktif di dalamnya

### Manajemen Kitchen Station

Kitchen station adalah unit dapur terpisah yang bisa menangani order secara mandiri.

- Tambah, edit, hapus kitchen station
- Field per station:
  - Nama (contoh: Kitchen 1, Kitchen 2, Kitchen Lantai 2)
  - Deskripsi / lokasi
  - Status: `active` | `overloaded` | `inactive`
- Manager bisa ubah status station (misal: tandai Kitchen 1 sebagai "overloaded" sebagai sinyal visual)
- Hapus station hanya bisa jika tidak ada order aktif di dalamnya

### Manajemen Bar Station

Sama dengan kitchen station, untuk minuman.

- Tambah, edit, hapus bar station
- Field per station: nama, deskripsi, status
- Hapus station hanya bisa jika tidak ada order aktif

### Konfigurasi Zone Assignment

Setiap zona harus di-assign ke satu kitchen station dan satu bar station.

- Form assignment per zona:
  - Pilih Kitchen Station (dropdown semua kitchen station aktif)
  - Pilih Bar Station (dropdown semua bar station aktif)
- Assignment bisa diubah kapan saja oleh Manager (efektif untuk order baru)
- Order yang sudah di-submit menggunakan assignment lama (tidak berubah retroaktif)
- Zona yang belum memiliki assignment akan menampilkan warning: "Belum terkonfigurasi — order akan ditolak"
- History perubahan assignment tersimpan di `audit_logs`

**Visual representasi:**
```
Zona Indoor     → Kitchen 1  |  Bar 1
Zona Outdoor    → Kitchen 2  |  Bar 2
Zona VIP        → Kitchen 1  |  Bar 1
Zona Rooftop    → ⚠️ Belum dikonfigurasi
```

### Assignment Waiter ke Zona

- Daftar semua waiter (role: waiter)
- Assign waiter ke satu atau lebih zona
- Satu waiter bisa cover beberapa zona
- Satu zona bisa punya beberapa waiter
- Waiter yang belum di-assign ke zona manapun tidak menerima notifikasi order siap

### Monitor Station (Realtime)

Halaman overview semua station untuk Manager:
- Jumlah order per kitchen station (queued, in_progress, done hari ini)
- Jumlah order per bar station
- Status station (active/overloaded/inactive)
- Quick action: redirect order antar kitchen station

### Kitchen Redirect (Saat Overload)

Fitur untuk memindahkan order dari satu kitchen station ke station lain secara manual.

**Flow:**
1. Manager buka halaman Kitchen Monitor
2. Lihat station yang overload (banyak order queued)
3. Pilih satu atau beberapa order (checkbox)
4. Klik "Redirect ke Station Lain"
5. Modal: pilih kitchen station tujuan + input alasan
6. Konfirmasi → sistem memindahkan order (atomic)

**Aturan redirect:**
- Hanya order dengan status `queued` yang bisa di-redirect (in_progress tidak)
- Alasan wajib diisi (minimal 10 karakter)
- Semua redirect dicatat di `kitchen_order_reassignments`
- Kitchen display kedua station update realtime via WebSocket

---

## UI/UX Layout

**Konsep: "The Operations Hub"**

### Halaman Zones (Tab: Zona | Kitchen Stations | Bar Stations)

**Tab Zona:**
- Tabel zona dengan kolom: nama, warna, kitchen assigned, bar assigned, jumlah meja, status
- Baris yang belum di-assign ditandai dengan badge "⚠️ Belum Dikonfigurasi"
- Klik baris zona → side panel edit zona + konfigurasi assignment + waiter

**Tab Kitchen Stations:**
- Card per station dengan: nama, status badge, jumlah order hari ini (realtime)
- Tombol aksi: Edit, Lihat Order, Ubah Status

**Tab Bar Stations:**
- Sama dengan Kitchen Stations

### Halaman Kitchen Monitor (Manager)

- Layout 2 kolom: daftar station di kiri, detail order station terpilih di kanan
- Per station: progress bar jumlah order (queued/in_progress/done)
- Daftar order per station dengan checkbox untuk multi-select
- Tombol "Redirect" muncul saat ada order terselect
- Modal redirect: dropdown station tujuan + textarea alasan

---

## Data Model

Entity: `zones`, `kitchen_stations`, `bar_stations`, `zone_station_assignments`, `waiter_zone_assignments`, `kitchen_order_reassignments`

```
zones: id, name, description, color_hex, is_active, sort_order

kitchen_stations: id, name, description, status
bar_stations: id, name, description, status

zone_station_assignments: id, zone_id, kitchen_station_id, bar_station_id, assigned_by, assigned_at
  UNIQUE: (zone_id) — satu assignment aktif per zona

waiter_zone_assignments: id, user_id, zone_id
  UNIQUE: (user_id, zone_id)

kitchen_order_reassignments: id, kitchen_order_id, from_station_id, to_station_id, reason, reassigned_by, reassigned_at
```

---

## Acceptance Criteria

### Zone Management
- [ ] CRUD zona berfungsi; hapus zona dengan meja aktif ditolak
- [ ] Zona yang belum di-assign menampilkan warning di UI
- [ ] Order di meja zona yang belum di-assign ditolak dengan pesan error jelas
- [ ] Perubahan assignment berlaku untuk order baru (order lama tidak berubah)
- [ ] Perubahan assignment tercatat di `audit_logs`

### Station Management
- [ ] CRUD kitchen station dan bar station berfungsi
- [ ] Status station bisa diubah Manager (active/overloaded/inactive)
- [ ] Hapus station dengan order aktif ditolak

### Waiter Assignment
- [ ] Manager bisa assign/unassign waiter ke zona
- [ ] Waiter hanya menerima notifikasi order dari zona yang di-assign kepadanya

### Kitchen Redirect
- [ ] Manager bisa redirect order QUEUED ke kitchen station lain
- [ ] Order yang sudah IN_PROGRESS tidak bisa di-redirect
- [ ] Setelah redirect: order hilang dari station asal, muncul di station tujuan (realtime)
- [ ] `kitchen_order_reassignments` tercatat lengkap
- [ ] Non-manager tidak bisa akses endpoint redirect (403)
- [ ] Order yang di-redirect ditampilkan dengan label "Dialihkan dari [Station Asal]" di kitchen display tujuan
