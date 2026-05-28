# 00 - Test Plan

## Purpose

Skenario kritis yang wajib diuji sebelum setiap release Karcisqu POS.

## Testing Stack

- **Unit/Feature Test**: Laravel Pest (atau PHPUnit)
- **Database**: SQLite in-memory untuk test
- **HTTP Test**: Laravel `actingAs()` + Inertia assertions
- **Manual QA**: Checklist per role di staging

---

## CRITICAL: Zone Routing Tests (Wajib Lulus)

- [ ] Order di meja zona Indoor → masuk Kitchen 1 dan Bar 1 (sesuai assignment)
- [ ] Order di meja zona Outdoor → masuk Kitchen 2 dan Bar 2
- [ ] Meja yang zona-nya belum di-assign → order ditolak dengan pesan error jelas
- [ ] Self-order pelanggan di meja zona Outdoor → kitchen/bar order masuk ke station yang benar
- [ ] Perubahan zone assignment oleh Manager → order baru menggunakan assignment baru (order lama tidak berubah)

---

## CRITICAL: Kitchen Redirect Tests (Wajib Lulus)

- [ ] Manager redirect order Kitchen 1 ke Kitchen 2 → order hilang dari K1, muncul di K2
- [ ] `kitchen_order_reassignments` tercatat lengkap (from, to, reason, by, at)
- [ ] Kitchen 1 dan Kitchen 2 display update realtime via WebSocket
- [ ] Order yang sudah DONE tidak bisa di-redirect
- [ ] Non-manager (kasir, dapur) tidak bisa akses endpoint redirect (expect 403)

---

## AUTH & RBAC

- [ ] Login semua role berhasil dan redirect ke halaman yang benar
- [ ] Role kasir tanpa shift aktif diblokir dari route transaksi POS
- [ ] Role dapur hanya bisa lihat order di kitchen station-nya
- [ ] Role bar hanya bisa lihat order di bar station-nya
- [ ] Role waiter hanya bisa lihat order di zona yang di-assign
- [ ] Role kasir tidak bisa akses `/reports` (expect 403)
- [ ] Role dapur tidak bisa akses `/pos` (expect 403)

---

## CASHIER SHIFT

- [ ] Kasir buka shift, tutup shift, ringkasan akurat
- [ ] Kasir tanpa shift aktif tidak bisa buat order
- [ ] Ringkasan shift kasir 1 tidak tercampur dengan kasir 2
- [ ] Total shift = total semua transaksi dalam shift tersebut (tunai + xendit)

---

## POS ORDER & PAYMENT

- [ ] Order dibuat dengan `kasir_id` kasir yang login
- [ ] Bayar tunai: kembalian benar, status PAID, meja AVAILABLE
- [ ] Bayar Xendit: webhook menggunakan token yang benar
- [ ] Webhook duplikat tidak buat transaksi ganda (idempotent)
- [ ] Order item dengan `print_to=kitchen` masuk kitchen, `print_to=bar` masuk bar
- [ ] Order item dengan `print_to=kitchen_bar` masuk keduanya

---

## SELF-ORDER QR

- [ ] QR valid membuka menu restoran yang benar
- [ ] QR tidak valid → halaman error
- [ ] Self-order setelah bayar → routing ke kitchen/bar station sesuai zona meja
- [ ] Pembayaran menggunakan Xendit key dari system_settings

---

## KITCHEN & BAR DISPLAY

- [ ] Order baru muncul di kitchen station yang tepat (realtime)
- [ ] Kitchen Staff station 1 tidak menerima broadcast station 2
- [ ] Update status (queued→in_progress→done) berfungsi
- [ ] Setelah DONE: broadcast ke waiter zona yang sesuai
- [ ] Kitchen redirect: order pindah realtime, label "Dialihkan dari Kitchen X" tampil

---

## TABLE MANAGEMENT

- [ ] Pindah/merge/split meja berfungsi
- [ ] Status meja update realtime di denah
- [ ] Meja yang di-transfer membawa order aktifnya

---

## PENDING TRANSACTION

- [ ] Pending transaction menyimpan data yang benar
- [ ] Sync job berhasil menyelesaikan pending transaction
- [ ] Tidak ada double-process pending transaction yang sama

---

## REPORTS & DASHBOARD

- [ ] Dashboard Manager menampilkan data realtime
- [ ] Laporan kasir breakdown per kasir: kasir 1 dan kasir 2 terpisah
- [ ] Total laporan = jumlah kasir 1 + kasir 2 + self-order
- [ ] Export PDF/Excel berhasil dan data akurat
- [ ] Laporan metode pembayaran: tunai + xendit = total revenue

---

## Regression Checklist (Per Release)

- [ ] `php artisan test` semua lulus
- [ ] Manual test semua 6 role
- [ ] Flow lengkap: Buka Shift → Order → Routing → Kitchen Update → Bayar → Print → Tutup Shift
- [ ] Self-order flow end-to-end
- [ ] Kitchen redirect flow (Manager)
- [ ] Zone assignment change → verifikasi order routing baru

---

## Test Data (Seeder)

```
Super Admin: superadmin@karcisqu.id / password
Manager:     manager@karcisqu.id / password

Kasir 1:     kasir1@karcisqu.id / password
Kasir 2:     kasir2@karcisqu.id / password

Waiter A:    waiter.a@karcisqu.id / password  (Zona Indoor)
Waiter B:    waiter.b@karcisqu.id / password  (Zona Indoor)
Waiter C:    waiter.c@karcisqu.id / password  (Zona Outdoor)

Kitchen 1:   kitchen1@karcisqu.id / password  (Kitchen Station 1)
Kitchen 2:   kitchen2@karcisqu.id / password  (Kitchen Station 2)

Bar 1:       bar1@karcisqu.id / password      (Bar Station 1)
Bar 2:       bar2@karcisqu.id / password      (Bar Station 2)

Zones:
  - Indoor  → Kitchen 1, Bar 1 | Waiter A, B | Meja A1-A10
  - Outdoor → Kitchen 2, Bar 2 | Waiter C    | Meja B1-B5
  - VIP     → Kitchen 1, Bar 1 | Waiter A    | Meja VIP-1-VIP-3

Menu: 10 item makanan (print_to: kitchen), 8 item minuman (print_to: bar)
```

---

## Notes

- Test menggunakan SQLite in-memory — hindari MySQL-specific syntax
- Jangan test Xendit live di test environment — gunakan mock atau Xendit sandbox di staging
- Zone routing test adalah yang paling kritis — jalankan di setiap PR
