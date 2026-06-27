# FEATURE K8 - Open Bill & Split Bill

## Objective

Memungkinkan pengelolaan order yang tetap terbuka (open bill) selama pelanggan makan, dan membagi tagihan ke beberapa grup pembayaran (split bill).

## Scope

Open bill multi-sesi, split bill per item atau per nominal, close bill serahkan ke kasir.

## Functional Requirements

### Open Bill
- Order dibuat tapi tidak langsung dibayar — status tetap `OPEN`
- Waiter atau kasir bisa tambah item ke order yang sama kapan saja
- Order `OPEN` tampil sebagai meja berstatus "Open Bill" (warna kuning di denah)
- Pelanggan bisa minta struk sementara (print daftar pesanan tanpa total bayar — opsional)
- Tidak ada batas waktu open bill; meja tetap `OCCUPIED` selama ada order `OPEN`

### Close Bill
- Waiter/kasir klik "Close Bill" pada order yang `OPEN`
- Order status berubah ke `PENDING_PAYMENT`
- Diserahkan ke kasir untuk proses pembayaran
- Setelah close bill, tidak bisa tambah item lagi kecuali kasir membuka kembali

### Split Bill
Metode 1 — **Split by Item:**
- Pilih item-item yang akan masuk ke tagihan grup A
- Sisa item otomatis masuk ke tagihan grup B
- Sistem buat 2 order baru dari 1 order induk (atau sub-order)
- Masing-masing dibayar secara terpisah

Metode 2 — **Split by Amount (Nominal):**
- Total tagihan dibagi rata atau per nominal yang diinput
- Cocok untuk grup yang ingin bayar sama rata
- Sistem buat multiple "split payment" dari satu order

### Rules
- Split bill hanya bisa dilakukan sebelum pembayaran pertama diproses
- Setelah sebagian tagihan dibayar, sisa tagihan tetap `OPEN` sampai selesai
- Diskon yang ada dibagi proporsional ke masing-masing split
- Pajak dan service charge dihitung ulang per split berdasarkan subtotal split

## UI/UX Layout

**Konsep: "The Bill Splitter"**
- Modal / side panel yang muncul saat "Split Bill" dipilih
- Tampilkan daftar semua item order
- Mode split by item: checkbox per item, assign ke "Grup 1" atau "Grup 2"
- Preview total per grup sebelum konfirmasi
- Warna: grup A (biru), grup B (oranye) untuk mudah dibedakan

## Data Model

Entity: `orders`, `order_items`, `transaction_splits`

- Order induk tetap ada sampai semua split selesai bayar
- Setiap split membuat record `transaction_splits` yang mereferensikan order induk

## Workflow

### Open Bill
```
Kasir/Waiter buat order → Kirim ke kitchen/bar → Tidak proses bayar
→ (Tambah item lagi di sesi berikutnya)
→ Pelanggan minta bayar → Close Bill → Kasir proses pembayaran
```

### Split Bill
```
Order OPEN → "Split Bill" → Pilih metode (item atau nominal)
→ Assign item ke grup → Preview total per grup → Konfirmasi
→ Buat 2 sub-order → Kasir proses bayar masing-masing grup secara terpisah
```

## Acceptance Criteria

- [ ] Open bill: item bisa ditambah di sesi berikutnya tanpa kehilangan item sebelumnya
- [ ] Close bill mengubah status order ke `PENDING_PAYMENT`
- [ ] Split by item: total dua grup = total order asli (setelah distribusi diskon)
- [ ] Split by amount: input nominal valid dan jumlahnya = total order
- [ ] Masing-masing split bisa diproses pembayarannya secara independen
- [ ] Split bill yang sudah dibayar sebagian tidak bisa di-split ulang
