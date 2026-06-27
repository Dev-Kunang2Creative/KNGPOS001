# FEATURE K11 - Pending Transaction & Auto-Sync

## Objective

Memastikan transaksi yang sudah dibayar pelanggan (via self-order) tidak hilang meskipun koneksi internet pada sisi kasir mengalami gangguan sementara.

## Scope

Penyimpanan transaksi pending, auto-sync setelah koneksi pulih, trigger cetak struk setelah sync.

## Functional Requirements

### Kapan Pending Transaction Terjadi
Skenario utama:
1. Pelanggan bayar via self-order QR (Xendit sukses di sisi Xendit dan pelanggan)
2. Webhook Xendit diterima oleh server
3. Server mencoba broadcast ke terminal kasir → tapi kasir sedang offline/putus
4. Transaksi disimpan sebagai `PENDING` di tabel `pending_transactions`

### Struktur Pending Transaction
`pending_transactions` menyimpan snapshot lengkap dari transaksi:
- `xendit_payment_id`, `xendit_reference`
- `payload` (JSON): semua data order, item, meja, total, metode bayar
- `payment_confirmed_at`: waktu Xendit konfirmasi
- `status`: `PENDING` → `SYNCED` / `FAILED`
- `sync_attempts`: counter retry

### Auto-Sync Mechanism
- Background job `SyncPendingTransaction` berjalan di queue
- Strategi retry: coba sync setiap X menit (konfigurabel), max 3x; setelah 3x → status `FAILED` dan alert ke manager
- Saat sync berhasil:
  1. Buat `order`, `order_items`, `transaction` dari payload snapshot
  2. Update `xendit_payments` sesuai data Xendit
  3. Trigger `kitchen_orders` dan `bar_orders` (distribusi ke kitchen/bar)
  4. Trigger `print_jobs` untuk cetak struk kasir, kitchen, bar
  5. Update `pending_transactions.status` → `SYNCED`
  6. Broadcast notifikasi ke terminal kasir yang sudah online

### Tampilan di Terminal Kasir
- Notifikasi kecil di POS saat ada transaksi yang berhasil di-sync
- Panel "Pending Transactions": kasir/manager bisa lihat daftar pending + status
- Tombol "Sync Manual" jika auto-sync belum berjalan

### Idempotency
- Sync tidak boleh membuat order duplikat
- Cek `xendit_payment_id` sebelum buat transaksi baru
- Jika sudah ada record dengan `xendit_payment_id` yang sama → skip, update status ke `SYNCED`

## UI/UX Layout

**Konsep: "The Sync Indicator"**
- Status bar di bagian bawah POS: "Koneksi Online ✓" atau "Offline — X transaksi pending"
- Panel `Pending Transactions` di menu kasir: tabel dengan kolom meja, waktu, total, status sync
- Notifikasi toast saat sync berhasil: "1 transaksi berhasil disinkronisasi. Struk dicetak."

## Data Model

Entity: `pending_transactions`, `orders`, `transactions`, `print_jobs`

- `pending_transactions.status`: `PENDING`, `SYNCED`, `FAILED`
- Job queue: `SyncPendingTransaction` di tabel `jobs`

## Workflow

```
Xendit callback diterima → Server proses
  → Cek koneksi kasir
      ├── Kasir online → Proses normal (order, print)
      └── Kasir offline → Simpan ke pending_transactions

Background job:
  → Cek pending_transactions status = PENDING
  → Coba sync → Buat order + distribusi kitchen/bar + print
  → Update status ke SYNCED
  → Notifikasi ke kasir
```

## Acceptance Criteria

- [ ] Transaksi yang dikonfirmasi Xendit tidak hilang meski kasir offline
- [ ] `pending_transactions` dibuat dengan snapshot lengkap saat kasir offline
- [ ] Auto-sync berjalan otomatis dalam < 5 menit setelah koneksi kasir pulih
- [ ] Sync tidak membuat order duplikat (idempotent berdasarkan `xendit_payment_id`)
- [ ] Print job (kasir, kitchen, bar) berjalan setelah sync berhasil
- [ ] Setelah 3x gagal sync, manager mendapat notifikasi
- [ ] Kasir bisa melihat dan trigger sync manual dari panel pending transactions
