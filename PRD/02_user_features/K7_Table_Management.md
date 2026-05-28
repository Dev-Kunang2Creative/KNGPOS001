# FEATURE K7 - Table Management (Denah Meja)

## Objective

Menyediakan tampilan dan manajemen denah meja secara realtime — status meja per zona, pindah meja, merge, dan split meja. Meja ditampilkan dengan warna zona.

## Scope

Denah meja realtime, status per zona, pindah meja, merge meja, split meja.

---

## Functional Requirements

### Tampilan Denah Meja

- Kanvas visual posisi semua meja, dikelompokkan per zona
- Meja diwarnai sesuai **warna zona** (dari `zones.color_hex`)
- Status meja ditampilkan dengan ikon/border:
  - ⬜ **AVAILABLE**: tersedia, bisa dipilih
  - 🔴 **OCCUPIED**: ada order aktif
  - 🟡 **OPEN BILL**: order sudah selesai, belum bayar
  - ⬛ **BLOCKED**: nonaktif / reserved
- Realtime via WebSocket channel `table.floor`
- Klik meja → side panel: info meja, zona, order aktif, tombol aksi

### Pindah Meja

- Pindah order dari meja A ke meja B
- Jika meja B di zona berbeda: routing order lanjutan (yang belum di-submit) menggunakan station zona B
- Order yang sudah di-submit ke kitchen/bar tidak berubah stationnya

### Merge Meja

- Gabungkan order 2+ meja menjadi satu tagihan
- Pilih meja utama (yang akan jadi tagihan)
- Semua item dari meja lain dipindah ke meja utama
- Hanya Manager yang bisa unmerge

### Split Meja

- Pisahkan item dalam satu meja menjadi 2+ tagihan terpisah
- Split by item: pilih item mana yang masuk tagihan 1 vs tagihan 2
- Split by amount: bayar sebagian total

---

## UI/UX Layout

**Konsep: "The Floor View"**
- Kanvas denah dengan meja berwarna zona
- Legenda zona di sudut (nama zona + warna)
- Side panel saat klik meja: nama meja, zona, order aktif ringkas, tombol Pindah/Merge/Split/Close Bill
- Filter zona: tampilkan semua zona atau filter satu zona

---

## Data Model

Entity: `tables`, `zones`, `orders`, `order_items`

Warna meja di kanvas: `tables.zone_id → zones.color_hex`

---

## Acceptance Criteria

- [ ] Denah meja tampil dengan warna zona yang benar
- [ ] Status meja update realtime saat ada perubahan (available/occupied/open_bill)
- [ ] Pindah meja berhasil; order aktif terbawa ke meja tujuan
- [ ] Merge meja: semua item tergabung dalam satu order
- [ ] Split meja: tagihan terpisah berfungsi
- [ ] Hanya Manager yang bisa unmerge
- [ ] Kasir dan waiter bisa lihat dan interaksi denah sesuai permission
