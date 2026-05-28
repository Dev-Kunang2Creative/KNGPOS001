# 00 - API Spec

## Purpose

Kontrak route V1 Karcisqu POS untuk frontend (Inertia/React) dan integrasi eksternal (Xendit webhook).

---

## Inertia Shared Props

Tersedia di semua page via `usePage().props`:

```js
{
  auth: {
    user: { id, name, email, role },
    permissions: ['pos.create', 'reports.view', ...],
  },
  restaurant: { name, logo_url, receipt_header, receipt_footer },
  activeShift: { id, opened_at, opening_cash } | null,
  flash: { success, error, info } | null,
}
```

---

## Auth Routes

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/login` | Halaman login | — |
| POST | `/login` | Proses login | — |
| POST | `/logout` | Logout | auth |
| GET | `/forgot-password` | Form lupa password | — |
| POST | `/forgot-password` | Kirim email reset | — |
| GET | `/reset-password/{token}` | Form reset password | — |
| POST | `/reset-password` | Proses reset | — |

---

## POS — Kasir

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/pos` | Halaman POS utama | `pos.view` |
| GET | `/pos/tables` | Daftar meja + status | `pos.view` |
| POST | `/pos/orders` | Buat order baru | `pos.create` + shift aktif |
| GET | `/pos/orders/{id}` | Detail order | `pos.view` |
| PUT | `/pos/orders/{id}/items` | Update item di order | `pos.create` |
| DELETE | `/pos/orders/{id}/items/{itemId}` | Hapus item | `pos.cancel` |
| POST | `/pos/orders/{id}/submit` | Submit order → routing ke kitchen/bar | `pos.create` |
| POST | `/pos/orders/{id}/pay` | Proses pembayaran tunai | `pos.checkout` |
| POST | `/pos/orders/{id}/void` | Void order | `pos.void` |
| GET | `/pos/transactions/today` | Transaksi hari ini (kasir ini) | `pos.view` |

---

## Cashier Shift

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/shifts` | Daftar shift kasir ini | `shift.view` |
| POST | `/shifts` | Buka shift | `shift.open` |
| GET | `/shifts/{id}` | Detail shift | `shift.view` |
| POST | `/shifts/{id}/close` | Tutup shift | `shift.close` |
| GET | `/shifts/{id}/summary` | Ringkasan per shift | `shift.view` |

---

## Kitchen (Dapur per Station)

Setiap staff dapur hanya melihat order di station-nya.

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/kitchen` | Halaman kitchen display (station user ini) | `kitchen.view` |
| GET | `/kitchen/orders` | Daftar order di station ini | `kitchen.view` |
| PUT | `/kitchen/orders/{id}/status` | Update status (queued→in_progress→done) | `kitchen.update` |

Manager juga bisa akses semua station:

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/kitchen/monitor` | Monitor semua kitchen station | `kitchen.manage` |
| GET | `/kitchen/stations/{id}/orders` | Order di station tertentu | `kitchen.manage` |
| POST | `/kitchen/orders/{id}/redirect` | Redirect order ke station lain | `kitchen.manage` |

---

## Bar (per Station)

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/bar` | Halaman bar display (station user ini) | `bar.view` |
| GET | `/bar/orders` | Daftar order di bar station ini | `bar.view` |
| PUT | `/bar/orders/{id}/status` | Update status | `bar.update` |

---

## Waiter

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/orders` | Order di zona waiter ini | `waiter.view` |
| GET | `/orders/{id}` | Detail order | `waiter.view` |
| POST | `/orders/{id}/delivered` | Tandai order sudah diantar | `waiter.update` |

---

## Table Management

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/tables` | Denah meja semua zona | `tables.view` |
| GET | `/tables/{id}` | Detail meja + order aktif | `tables.view` |
| POST | `/tables/{id}/transfer` | Pindah order ke meja lain | `tables.manage` |
| POST | `/tables/merge` | Gabung 2+ meja | `tables.manage` |
| POST | `/tables/{id}/split` | Split meja | `tables.manage` |

---

## Xendit Payment

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| POST | `/pos/orders/{id}/xendit` | Buat Xendit invoice/QR | `pos.checkout` |
| GET | `/pos/orders/{id}/xendit/status` | Poll status pembayaran | `pos.checkout` |
| POST | `/api/xendit/callback` | Webhook dari Xendit (no auth) | — |

---

## Self-Order (Public)

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/s/{qr_token}` | Halaman menu self-order | Public |
| GET | `/s/{qr_token}/menu` | Data menu (JSON) | Public |
| POST | `/s/{qr_token}/orders` | Submit order self-order | Public |
| POST | `/s/{qr_token}/pay` | Buat pembayaran Xendit | Public |
| GET | `/s/{qr_token}/status/{orderId}` | Poll status pembayaran | Public |

---

## Manager — Dashboard & Reports

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/dashboard` | Dashboard realtime | `dashboard.view` |
| GET | `/reports/sales` | Laporan penjualan | `reports.view` |
| GET | `/reports/kasir` | Laporan per kasir | `reports.view` |
| GET | `/reports/menu` | Laporan menu terlaris | `reports.view` |
| GET | `/reports/payment-methods` | Laporan metode pembayaran | `reports.view` |
| GET | `/reports/reconciliation` | Rekonsiliasi harian | `reports.view` |
| POST | `/reports/export` | Export PDF/Excel (background) | `reports.export` |

---

## Manager — Zone & Station Management

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/zones` | Daftar zona | `zones.manage` |
| POST | `/zones` | Buat zona baru | `zones.manage` |
| PUT | `/zones/{id}` | Edit zona | `zones.manage` |
| DELETE | `/zones/{id}` | Hapus zona | `zones.manage` |
| PUT | `/zones/{id}/assignment` | Update assignment zona → station | `zones.manage` |
| GET | `/zones/{id}/waiters` | Waiter di zona ini | `zones.manage` |
| POST | `/zones/{id}/waiters` | Assign waiter ke zona | `zones.manage` |
| DELETE | `/zones/{id}/waiters/{userId}` | Unassign waiter dari zona | `zones.manage` |
| GET | `/stations/kitchen` | Daftar kitchen station | `zones.manage` |
| POST | `/stations/kitchen` | Buat kitchen station | `zones.manage` |
| PUT | `/stations/kitchen/{id}` | Edit kitchen station | `zones.manage` |
| GET | `/stations/bar` | Daftar bar station | `zones.manage` |
| POST | `/stations/bar` | Buat bar station | `zones.manage` |
| PUT | `/stations/bar/{id}` | Edit bar station | `zones.manage` |

---

## Manager — Menu

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/menu` | Daftar menu item | `menu.view` |
| POST | `/menu/categories` | Buat kategori | `menu.manage` |
| PUT | `/menu/categories/{id}` | Edit kategori | `menu.manage` |
| DELETE | `/menu/categories/{id}` | Hapus kategori | `menu.manage` |
| POST | `/menu/items` | Buat menu item | `menu.manage` |
| PUT | `/menu/items/{id}` | Edit menu item | `menu.manage` |
| DELETE | `/menu/items/{id}` | Hapus (soft delete) | `menu.manage` |
| PATCH | `/menu/items/{id}/availability` | Toggle tersedia/habis | `menu.manage` |
| GET | `/menu/promotions` | Daftar promo | `menu.manage` |
| POST | `/menu/promotions` | Buat promo | `menu.manage` |
| PUT | `/menu/promotions/{id}` | Edit promo | `menu.manage` |

---

## Manager — User Management

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/users` | Daftar staf | `users.view` |
| POST | `/users` | Buat akun staf | `users.manage` |
| PUT | `/users/{id}` | Edit akun staf | `users.manage` |
| POST | `/users/{id}/reset-password` | Reset password | `users.manage` |
| PATCH | `/users/{id}/status` | Aktifkan/nonaktifkan | `users.manage` |

---

## Settings

| Method | URL | Description | Permission |
|--------|-----|-------------|------------|
| GET | `/settings/restaurant` | Profil restoran | `settings.view` |
| PUT | `/settings/restaurant` | Update profil | `settings.manage` |
| GET | `/settings/tables` | Konfigurasi meja + QR | `settings.view` |
| POST | `/settings/tables` | Buat meja | `settings.manage` |
| PUT | `/settings/tables/{id}` | Edit meja | `settings.manage` |
| POST | `/settings/tables/{id}/qr` | Regenerate QR | `settings.manage` |
| GET | `/settings/printers` | Daftar printer | `settings.view` |
| POST | `/settings/printers` | Tambah printer | `settings.manage` |
| GET | `/settings/payment` | Konfigurasi Xendit | `settings.manage` |
| PUT | `/settings/payment` | Update Xendit config | `settings.manage` |
| GET | `/settings/tax` | Konfigurasi pajak | `settings.view` |
| PUT | `/settings/tax` | Update pajak | `settings.manage` |
| GET | `/audit-logs` | Log audit | `audit.view` |
