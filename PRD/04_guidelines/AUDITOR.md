# Panduan Audit & QA Testing — Karcisqu POS

## Tujuan

Checklist bagi Developer atau AI Assistant sebagai **Auditor dan QA Tester** untuk Karcisqu POS V1. Tujuan: memastikan kode aman, andal, akurat secara transaksi, dan zone routing berfungsi benar.

---

## 1. Ceklis Keamanan & Akses

- [ ] **Middleware auth aktif**: Setiap route dashboard dilindungi `auth`. Akses tanpa login → redirect ke `/login`.
- [ ] **Permission guard**: Setiap route dilindungi `permission:nama-permission` yang sesuai (`00_API_Spec.md`).
- [ ] **EnsureActiveShift**: Semua route transaksi POS kasir menggunakan middleware ini.
- [ ] **Role isolation**: Manager tidak bisa edit Super Admin. Kasir tidak bisa akses `/reports`. Dapur tidak bisa akses `/pos`.
- [ ] **Kitchen redirect only Manager**: Endpoint redirect dilindungi permission `kitchen.manage`.
- [ ] **Waiter zone isolation**: Waiter hanya bisa lihat order dari zona yang di-assign — divalidasi di query, bukan hanya UI.
- [ ] **Xendit webhook auth**: Handler `/api/xendit/callback` validasi `X-CALLBACK-TOKEN` dari `system_settings`.
- [ ] **No hardcoded secrets**: Tidak ada Xendit key di kode — selalu dari `system_settings`.

---

## 2. Ceklis Zone Routing Integrity

- [ ] **OrderRoutingService dipanggil saat submit order**: Jangan ada logika routing inline di controller.
- [ ] **Validasi zone assignment**: Jika zona meja belum punya assignment → order ditolak dengan pesan jelas (bukan error 500).
- [ ] **Routing benar**: Order di meja zona Indoor → kitchen_orders di Kitchen Station Indoor, bar_orders di Bar Station Indoor.
- [ ] **`print_to` dipatuhi**: Item `print_to=kitchen` tidak masuk bar_orders, dan sebaliknya.
- [ ] **Kitchen redirect atomic**: Gunakan `DB::transaction()` — tidak boleh ada state order "tidak di station manapun".
- [ ] **Redirect log lengkap**: `kitchen_order_reassignments` terisi (from, to, reason, by, at).
- [ ] **Broadcast correct channel**: Setelah redirect, broadcast hapus dari station asal dan tambah ke station tujuan.
- [ ] **Station isolation**: Kitchen staff A tidak bisa subscribe channel station B.

---

## 3. Ceklis Integritas Transaksi & Payment

- [ ] **Server-side kalkulasi**: Frontend tidak mengirim `total_amount` — backend menghitung dari `order_items`.
- [ ] **Xendit idempotency**: Cek `external_id` sebelum proses webhook — jika PAID, skip.
- [ ] **Webhook log lengkap**: Semua webhook dicatat di `xendit_webhook_logs` sebelum diproses.
- [ ] **Pending transaction safety**: Skenario offline kasir tidak menyebabkan kehilangan data.
- [ ] **Kembalian akurat**: `change = amount_paid - total_order` — tidak negatif.

---

## 4. Ceklis Audit Trail

- [ ] **Audit log wajib** untuk:
  - Pembatalan item order
  - Void transaksi
  - Perubahan role user
  - Reset password
  - Perubahan harga menu item
  - Regenerate QR Code meja
  - Kitchen redirect (from/to station + alasan)
  - Perubahan zone assignment
  - Perubahan konfigurasi Xendit / pajak
- [ ] **Isi audit log lengkap**: `user_id`, `role`, `action`, `resource_type`, `resource_id`, `old_value`, `new_value`, `ip_address`.

---

## 5. Ceklis Performa & Query

- [ ] **No N+1 query**: Listing order, menu item, kitchen orders → pakai Eloquent `with()`.
- [ ] **Index database**: `orders.status`, `kitchen_orders.kitchen_station_id`, `kitchen_orders.status`, `tables.zone_id` harus ada index.
- [ ] **Background job**: Generate laporan, print job, sync pending → queue, bukan blocking request.

---

## 6. Ceklis UI/UX & Spesifikasi

- [ ] **Acceptance criteria terpenuhi**: Cek file `K*.md` atau `A*.md` yang sesuai.
- [ ] **Responsive**: Tablet (1024px) untuk kasir/waiter; mobile (375px) untuk self-order.
- [ ] **Loading state**: Saat proses Xendit atau submit form — loading indicator + disable tombol.
- [ ] **Error feedback**: Pesan error informatif, termasuk "Zona meja belum dikonfigurasi" saat routing gagal.
- [ ] **Zone-aware UI**: Meja di denah berwarna sesuai zona. Kitchen board menampilkan nama zona meja.

---

## 7. Ceklis Kualitas Kode

- [ ] **Form Request**: Semua validasi input via Form Request.
- [ ] **Service layer**: Business logic (routing, redirect, payment) di `app/Services/`.
- [ ] **Soft delete**: `orders`, `menu_items`, `users`, `tables` menggunakan `deleted_at`.
- [ ] **Pint formatting**: `vendor/bin/pint` tidak ada warning/error.
- [ ] **Feature test**: Happy path + edge case (zona belum dikonfigurasi, redirect in-progress order, webhook duplikat).

---

## Penilaian Akhir (Auditor Verdict)

🟢 **APPROVE**: Semua ceklis terpenuhi. Zone routing benar, kode aman, transaksi akurat.

🟡 **REQUEST CHANGES**: Fungsionalitas berjalan tapi ada pelanggaran minor (missing audit log, N+1 query, acceptance criteria belum semua terpenuhi).

🔴 **REJECT (BLOCK)**: Pelanggaran serius — routing logika di controller (bukan service), redirect tidak atomic, kalkulasi harga di frontend, webhook tidak divalidasi, zone assignment tidak divalidasi sebelum submit order.
