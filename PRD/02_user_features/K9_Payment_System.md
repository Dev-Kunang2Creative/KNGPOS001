# FEATURE K9 - Payment System

## Objective

Memproses pembayaran tunai dan non-tunai (via Xendit) secara akurat dengan konfirmasi otomatis dan trail transaksi lengkap.

## Scope

Pembayaran tunai, Xendit (QRIS, e-wallet, bank transfer, VA), konfirmasi webhook idempotent, void.

---

## Functional Requirements

### Pembayaran Tunai

- Input nominal uang diterima dari pelanggan
- Kembalian: `kembalian = nominal_diterima - total_order`
- Konfirmasi → transaksi PAID, order PAID, meja AVAILABLE
- Print struk kasir otomatis

### Pembayaran Non-Tunai (Xendit)

Xendit credential diambil dari `system_settings` (satu set untuk seluruh restoran).

**QRIS:**
- Backend buat Xendit QR Code payment
- `external_id`: `karcisqu-{transaction_id}-{timestamp}`
- Tampilkan QR di layar kasir
- Polling status atau terima webhook

**E-Wallet (OVO, GoPay, Dana, dll):**
- Buat Xendit e-wallet charge → checkout URL
- Share link ke pelanggan

**Bank Transfer / Virtual Account:**
- Buat VA number via Xendit
- Tampilkan nomor VA dan instruksi

### Payment Status Flow

```
CREATED → PENDING → PAID / FAILED / EXPIRED
```

Polling setiap 5 detik. Jika EXPIRED → tawarkan buat pembayaran baru.

### Xendit Webhook Handler

- Route: `POST /api/xendit/callback`
- Validasi `X-CALLBACK-TOKEN` (dari `system_settings.xendit_webhook_token`)
- Log semua payload ke `xendit_webhook_logs`
- **Idempotent**: cek `xendit_payments.external_id` sebelum proses — jika sudah PAID, skip
- Setelah konfirmasi: update transaksi PAID, update order PAID, trigger print, update meja

### Void

- Void transaksi PENDING (sebelum dibayar)
- Tidak ada automated refund untuk non-tunai di V1 — dilakukan manual via Xendit dashboard
- Setiap void dicatat di `audit_logs`

### Ringkasan Shift (Per Kasir)

Semua transaksi dalam satu shift direkap:
- Total tunai
- Total per metode Xendit (QRIS, e-wallet, VA, bank transfer)
- Total diskon
- Total pajak & service charge
- Grand total revenue shift ini

---

## UI/UX Layout

**Konsep: "The Checkout Panel"**
- Modal atau full panel saat proses bayar
- Tampilan: daftar item, subtotal, diskon, tax, total (font besar)
- Tombol metode: "Tunai" | "QRIS" | "E-Wallet" | "Transfer"
- Tunai: input nominal, tampil kembalian real-time
- Xendit: tampilkan QR/VA/link + countdown timer
- Animasi kecil saat pembayaran berhasil

---

## Data Model

Entity: `transactions`, `xendit_payments`, `xendit_webhook_logs`

```
transactions.kasir_id     → user yang proses pembayaran
xendit_payments.external_id → UNIQUE, format: karcisqu-{transaction_id}-{timestamp}
```

---

## Acceptance Criteria

- [ ] Tunai: kembalian dihitung benar, transaksi tersimpan
- [ ] QRIS: QR tampil, webhook konfirmasi mengubah status ke PAID
- [ ] E-wallet: link checkout berfungsi, webhook konfirmasi berjalan
- [ ] VA: nomor VA tampil, webhook konfirmasi berjalan
- [ ] Webhook duplikat tidak membuat dua record transaksi PAID (idempotent)
- [ ] Void transaksi dicatat di audit log
- [ ] Ringkasan shift per kasir akurat (total sesuai jumlah transaksi shift ini)
- [ ] Jika Xendit API gagal: pesan error jelas, tidak ada transaksi gagal tanpa log
