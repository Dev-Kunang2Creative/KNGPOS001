# FEATURE K10 - Cashier Shift Management

## Objective

Mengelola siklus shift kasir — buka shift (dengan modal awal), tutup shift (dengan ringkasan lengkap), dan rekap kas harian.

## Scope

Buka shift, tutup shift, ringkasan shift, laporan kas per shift.

## Functional Requirements

### Buka Shift
- Kasir login → sistem cek apakah ada shift aktif
- Jika belum ada shift aktif → wajib buka shift sebelum akses POS
- Form buka shift:
  - Input modal awal (saldo kas awal yang ada di laci)
  - Timestamp otomatis dicatat sebagai `opened_at`
- Setelah buka shift → kasir bisa akses POS (`EnsureActiveShift` middleware pass)

### Tutup Shift
- Kasir klik "Tutup Shift" di akhir sesi
- Form tutup shift:
  - Input saldo akhir (hitung fisik kas di laci)
  - Sistem hitung selisih: `selisih = saldo_akhir - (modal_awal + total_transaksi_tunai)`
  - Catatan shift (opsional)
- Konfirmasi → shift ditutup, rekap dibuat
- Setelah tutup shift → kasir tidak bisa buat order baru sampai buka shift lagi

### Ringkasan Shift
Setelah shift ditutup, sistem generate ringkasan:
- Periode shift (jam buka — jam tutup)
- Total transaksi (jumlah)
- Total penjualan bruto
- Total diskon diberikan
- Total service charge
- Total pajak
- Total revenue bersih
- Rincian per metode pembayaran: tunai, QRIS, e-wallet, bank transfer, VA
- Modal awal + penerimaan tunai vs saldo akhir dihitung = selisih kas
- Export / print ringkasan shift

### Riwayat Shift
- Manager bisa lihat semua riwayat shift: kasir, tanggal, modal awal, total revenue, selisih
- Filter by kasir, by tanggal

## UI/UX Layout

**Konsep: "The Shift Gate"**
- Saat login, jika belum ada shift aktif → muncul overlay/modal buka shift (tidak bisa dismiss)
- Modal buka shift: simpel — satu input nominal modal awal + tombol "Buka Shift"
- Tutup shift: tombol di header POS → modal konfirmasi → input saldo akhir → submit
- Ringkasan shift: halaman terpisah atau modal besar dengan tabel breakdown

## Data Model

Entity: `cashier_shifts`, `cashier_shift_summaries`

- `cashier_shifts.status`: `OPEN`, `CLOSED`
- Satu kasir hanya bisa punya satu shift `OPEN` di waktu yang sama

## Workflow

```
Login → Cek shift aktif
  ├── Ada shift aktif → Langsung ke POS
  └── Belum ada shift → Modal buka shift → Input modal awal → Shift terbuka

Akhir shift:
  Tutup Shift → Input saldo akhir → Sistem hitung selisih → Ringkasan → Print/Export
```

## Acceptance Criteria

- [ ] Kasir tanpa shift aktif tidak bisa akses POS (redirect ke buka shift)
- [ ] Kasir yang sudah punya shift aktif tidak bisa buka shift kedua
- [ ] Modal awal tersimpan dan digunakan dalam kalkulasi ringkasan
- [ ] Ringkasan shift akurat: total transaksi, metode bayar, selisih kas
- [ ] Shift yang sudah ditutup tidak bisa dibuka kembali oleh kasir (hanya Manager)
- [ ] Riwayat shift bisa difilter dan dilihat oleh Manager
