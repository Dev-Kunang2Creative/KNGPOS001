# FEATURE A5 - Laporan & Reporting

## Objective

Menyediakan laporan penjualan yang bisa difilter berdasarkan periode, dengan **breakdown per kasir** dan total keseluruhan, serta laporan menu, metode pembayaran, dan rekonsiliasi.

## Scope

Laporan penjualan (breakdown per kasir + total), laporan menu terlaris, laporan metode pembayaran, laporan per kasir detail, rekonsiliasi harian, export PDF/Excel.

---

## Functional Requirements

### Laporan Penjualan (Utama)

Filter: periode (harian, mingguan, bulanan, custom range)

Data yang ditampilkan:
- **Baris per kasir**: kasir 1, kasir 2, dst.
- **Baris self-order**: transaksi dari QR pelanggan
- **Total keseluruhan**: sum semua kasir + self-order

| Sumber | Transaksi | Revenue | Diskon | Revenue Bersih |
|--------|-----------|---------|--------|---------------|
| Kasir 1 | 47 | Rp 4.200.000 | Rp 150.000 | Rp 4.050.000 |
| Kasir 2 | 52 | Rp 4.800.000 | Rp 200.000 | Rp 4.600.000 |
| Self-Order | 18 | Rp 1.600.000 | Rp 0 | Rp 1.600.000 |
| **TOTAL** | **117** | **Rp 10.600.000** | **Rp 350.000** | **Rp 10.250.000** |

Grafik: stacked bar chart revenue per hari, dengan warna per kasir.

### Laporan Per Kasir (Detail)

Filter: periode + pilih kasir (dropdown)

Data untuk kasir terpilih:
- Daftar semua shift dalam periode: jam buka, jam tutup, modal awal, total revenue, selisih kas
- Total transaksi, total tunai, total non-tunai (breakdown per metode Xendit)
- Total diskon yang diberikan
- Rata-rata nilai order per shift

### Laporan Menu Terlaris

Filter: periode + kategori (opsional)

- Ranking item berdasarkan qty terjual
- Revenue per item
- % kontribusi dari total revenue
- Breakdown: dari kasir vs dari self-order
- Tabel + bar chart horizontal

### Laporan Metode Pembayaran

Filter: periode

| Metode | Jumlah Transaksi | Total Nilai | % |
|--------|-----------------|-------------|---|
| Tunai | 65 | Rp 5.800.000 | 55% |
| QRIS | 30 | Rp 2.700.000 | 26% |
| E-Wallet | 12 | Rp 1.100.000 | 11% |
| VA | 10 | Rp 900.000 | 9% |

Pie chart atau donut chart.

### Rekonsiliasi Harian

Tabel semua transaksi dalam satu hari:
- No. transaksi, waktu, meja, kasir/self-order, metode bayar, total, status
- Filter by: kasir, metode bayar, status
- Total di bawah tabel: per metode + grand total

### Export

- Format: PDF (laporan formal dengan header restoran) dan Excel (.xlsx)
- Export berjalan di background job (`GenerateReportJob`)
- Notifikasi setelah selesai dengan link download
- File disimpan sementara di `storage/reports/` selama 24 jam lalu dihapus otomatis

---

## UI/UX Layout

**Konsep: "The Analytics Desk"**
- Sidebar navigasi: Penjualan | Per Kasir | Menu | Metode Bayar | Rekonsiliasi
- Filter di atas tabel: date picker range, dropdown kasir/kategori
- Tombol "Export PDF" dan "Export Excel" di kanan atas
- Grafik di atas tabel data
- Tabel responsive: scroll horizontal di mobile/tablet
- Total baris selalu di-highlight (bold, background berbeda) di laporan penjualan

---

## Data Model

Entity: `transactions`, `order_items`, `cashier_shifts`, `cashier_shift_summaries`, `users`

Query utama laporan penjualan:
```sql
SELECT
  u.name as kasir_name,
  COUNT(t.id) as total_transaksi,
  SUM(t.amount_paid) as total_revenue,
  SUM(o.discount_amount) as total_diskon
FROM transactions t
JOIN orders o ON t.order_id = o.id
LEFT JOIN users u ON t.kasir_id = u.id
WHERE t.status = 'paid'
  AND DATE(t.paid_at) BETWEEN :start AND :end
GROUP BY t.kasir_id
WITH ROLLUP  -- total keseluruhan
```

---

## Acceptance Criteria

- [ ] Laporan penjualan menampilkan baris per kasir + baris total keseluruhan yang akurat
- [ ] Total = sum semua kasir + self-order (tidak ada yang terlewat)
- [ ] Laporan per kasir menampilkan detail shift yang cocok dengan ringkasan shift kasir
- [ ] Laporan menu ranking benar berdasarkan qty terjual
- [ ] Laporan metode pembayaran: total tunai + non-tunai = total revenue (balance check)
- [ ] Export PDF menghasilkan file dengan header nama restoran yang benar
- [ ] Export Excel bisa dibuka di Excel/Google Sheets
- [ ] Export berjalan background — halaman tidak freeze
- [ ] Kasir, waiter, dapur, bar tidak bisa akses laporan (403)
