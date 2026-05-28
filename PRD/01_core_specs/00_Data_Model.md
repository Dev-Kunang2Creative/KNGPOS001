# 00 - Data Model

## Purpose

Sumber kebenaran untuk semua entity database Karcisqu POS. Semua feature docs wajib mengikuti nama tabel, field, dan status enum di sini.

---

## Entity Overview

```
users                    — semua staf (super_admin, manager, kasir, waiter, dapur, bar)
zones                    — zona area restoran (Indoor, Outdoor, VIP, dll)
zone_station_assignments — zona → kitchen station + bar station (bisa diubah Manager)
kitchen_stations         — unit dapur (Kitchen 1, Kitchen 2, dst.)
bar_stations             — unit bar (Bar 1, Bar 2, dst.)
waiter_zone_assignments  — waiter yang bertugas di zona tertentu
tables                   — meja restoran, terhubung ke zona
table_qrcodes            — QR token per meja untuk self-order
menu_categories          — kategori menu
menu_items               — item menu (dengan field print_to)
menu_promotions          — promo/diskon
orders                   — order per meja per sesi
order_items              — detail item per order
kitchen_orders           — item makanan yang dikirim ke kitchen station
bar_orders               — item minuman yang dikirim ke bar station
kitchen_order_reassignments — log redirect order antar kitchen station
transactions             — record pembayaran per order
xendit_payments          — detail pembayaran Xendit
xendit_webhook_logs      — log semua incoming webhook Xendit
cashier_shifts           — shift buka/tutup kasir
cashier_shift_summaries  — ringkasan kas per shift
pending_transactions     — safety net saat kasir offline
print_jobs               — antrian cetak thermal printer
audit_logs               — log semua aksi sensitif
system_settings          — konfigurasi sistem (key-value)
printers                 — daftar printer thermal
```

---

## Tabel Detail

### users
```sql
id, name, email, password, role, is_active, must_change_password,
last_login_at, created_at, updated_at, deleted_at

role: ENUM('super_admin', 'manager', 'kasir', 'waiter', 'dapur', 'bar')
```
Catatan: email unik platform-wide (satu restoran, satu sistem).

---

### zones
```sql
id, name, description, color_hex, is_active, sort_order,
created_at, updated_at
```
Contoh: `{name: "Indoor", color_hex: "#2563EB"}`, `{name: "Outdoor", color_hex: "#16A34A"}`, `{name: "VIP", color_hex: "#D97706"}`

---

### kitchen_stations
```sql
id, name, description, status, created_at, updated_at

status: ENUM('active', 'overloaded', 'inactive')
```
Contoh: `{name: "Kitchen 1", status: "active"}`, `{name: "Kitchen 2", status: "active"}`

---

### bar_stations
```sql
id, name, description, status, created_at, updated_at

status: ENUM('active', 'overloaded', 'inactive')
```

---

### zone_station_assignments
```sql
id, zone_id, kitchen_station_id, bar_station_id,
assigned_by, assigned_at, created_at, updated_at

FK: zone_id → zones.id
FK: kitchen_station_id → kitchen_stations.id
FK: bar_station_id → bar_stations.id
UNIQUE: (zone_id) — satu zona hanya punya satu assignment aktif
```
Saat Manager mengubah assignment, record ini di-update (bukan soft-delete).

---

### waiter_zone_assignments
```sql
id, user_id, zone_id, assigned_at, created_at, updated_at

FK: user_id → users.id (role: waiter)
FK: zone_id → zones.id
UNIQUE: (user_id, zone_id)
```
Satu waiter bisa di-assign ke lebih dari satu zona.

---

### tables
```sql
id, name, capacity, zone_id, position_x, position_y,
status, self_order_enabled, created_at, updated_at, deleted_at

status: ENUM('available', 'occupied', 'open_bill', 'reserved', 'blocked')
FK: zone_id → zones.id
```

---

### table_qrcodes
```sql
id, table_id, qr_token, is_active, generated_at, regenerated_at

qr_token: string unik ≥ 32 char
FK: table_id → tables.id
UNIQUE: (table_id, is_active) — hanya satu aktif per meja
```
Self-order URL: `/s/{qr_token}`

---

### menu_categories
```sql
id, name, description, image_path, sort_order, is_active,
created_at, updated_at, deleted_at
```

---

### menu_items
```sql
id, category_id, name, description, price, image_path,
print_to, is_available, sort_order, created_at, updated_at, deleted_at

print_to: ENUM('kasir', 'kitchen', 'bar', 'kitchen_bar')
FK: category_id → menu_categories.id
```
`print_to` menentukan ke mana item dikirim setelah order dibuat.

---

### menu_promotions
```sql
id, name, type, value, applies_to, category_id, menu_item_id,
min_order_amount, valid_from, valid_until, is_active,
created_at, updated_at
```

---

### orders
```sql
id, table_id, kasir_id, order_type, status, notes,
subtotal, discount_amount, promotion_id, service_charge_amount,
tax_amount, total_amount, created_at, updated_at

order_type: ENUM('dine_in', 'self_order')
status: ENUM('open', 'submitted', 'paid', 'cancelled', 'void')
FK: table_id → tables.id
FK: kasir_id → users.id (null jika self_order)
```

---

### order_items
```sql
id, order_id, menu_item_id, quantity, unit_price, subtotal,
notes, status, created_at, updated_at

status: ENUM('pending', 'sent', 'cancelled')
```

---

### kitchen_orders
```sql
id, order_id, kitchen_station_id, status, notes,
sent_at, started_at, completed_at, created_at, updated_at

status: ENUM('queued', 'in_progress', 'done', 'cancelled')
FK: order_id → orders.id
FK: kitchen_station_id → kitchen_stations.id
```
Routing: meja → zone_station_assignments → kitchen_station_id.

---

### kitchen_order_items
```sql
id, kitchen_order_id, order_item_id, quantity, notes
```

---

### kitchen_order_reassignments
```sql
id, kitchen_order_id, from_station_id, to_station_id,
reason, reassigned_by, reassigned_at

FK: kitchen_order_id → kitchen_orders.id
FK: from_station_id → kitchen_stations.id
FK: to_station_id → kitchen_stations.id
FK: reassigned_by → users.id (role: manager)
```
Log semua perpindahan order antar kitchen station.

---

### bar_orders
```sql
id, order_id, bar_station_id, status, notes,
sent_at, started_at, completed_at, created_at, updated_at

status: ENUM('queued', 'in_progress', 'done', 'cancelled')
FK: order_id → orders.id
FK: bar_station_id → bar_stations.id
```

---

### bar_order_items
```sql
id, bar_order_id, order_item_id, quantity, notes
```

---

### transactions
```sql
id, order_id, kasir_id, payment_method, amount_paid,
change_amount, status, notes, paid_at, created_at, updated_at

payment_method: ENUM('cash', 'qris', 'ewallet', 'bank_transfer', 'va')
status: ENUM('pending', 'paid', 'failed', 'void', 'expired')
FK: order_id → orders.id
FK: kasir_id → users.id
```

---

### xendit_payments
```sql
id, transaction_id, external_id, xendit_invoice_id, payment_method,
amount, status, xendit_raw_response, created_at, updated_at

external_id format: karcisqu-{transaction_id}-{timestamp}
UNIQUE: (external_id)
```

---

### xendit_webhook_logs
```sql
id, external_id, payload (JSON), processed, error_message,
received_at, created_at
```

---

### cashier_shifts
```sql
id, kasir_id, opening_cash, closing_cash, status,
opened_at, closed_at, notes, created_at, updated_at

status: ENUM('open', 'closed')
FK: kasir_id → users.id
UNIQUE CHECK: kasir tidak boleh punya 2 shift 'open' bersamaan
```

---

### cashier_shift_summaries
```sql
id, shift_id, total_cash, total_qris, total_ewallet,
total_bank_transfer, total_va, total_transactions,
total_discount, total_tax, total_service_charge,
total_revenue, cash_difference, created_at
```

---

### pending_transactions
```sql
id, order_id, kasir_id, xendit_payment_id, payload (JSON),
status, sync_attempts, last_attempt_at, synced_at, created_at

status: ENUM('pending', 'synced', 'failed')
```

---

### print_jobs
```sql
id, printer_id, job_type, payload (JSON), status,
attempts, last_attempt_at, created_at

job_type: ENUM('receipt', 'kitchen', 'bar', 'qr')
status: ENUM('pending', 'printing', 'done', 'failed')
```

---

### printers
```sql
id, name, type, ip_address, port, paper_width, is_active,
created_at, updated_at

type: ENUM('kasir', 'kitchen', 'bar')
paper_width: ENUM('58mm', '80mm')
```
Satu printer bisa di-assign ke satu kitchen station atau bar station.

---

### audit_logs
```sql
id, user_id, role, action, resource_type, resource_id,
old_value (JSON), new_value (JSON), ip_address, created_at

FK: user_id → users.id
```

---

### system_settings
```sql
id, key, value, created_at, updated_at

UNIQUE: (key)
```
Key yang digunakan:
- `restaurant_name`, `restaurant_address`, `restaurant_phone`
- `receipt_header`, `receipt_footer`
- `tax_percentage`, `tax_is_active`
- `service_charge_percentage`, `service_charge_is_active`
- `xendit_secret_key` (encrypted), `xendit_webhook_token` (encrypted)
- `xendit_enabled`, `xendit_active_methods` (JSON)

---

## Routing Order Logic

```
Order dibuat untuk meja X
  ↓
Ambil table.zone_id → zone_id
  ↓
Cari zone_station_assignments WHERE zone_id = zone_id
  → kitchen_station_id = K
  → bar_station_id = B
  ↓
Untuk setiap order_item:
  IF print_to IN ('kitchen', 'kitchen_bar') → buat kitchen_order di station K
  IF print_to IN ('bar', 'kitchen_bar')    → buat bar_order di station B
  IF print_to = 'kasir'                    → hanya masuk struk kasir
```

---

## Kitchen Redirect Logic

```
Manager buka Kitchen Monitor
  → Lihat Kitchen 1 dengan banyak order queued/in_progress
  → Pilih order yang ingin dipindah
  → Klik "Redirect ke Kitchen 2"
  ↓
Sistem:
  UPDATE kitchen_orders SET kitchen_station_id = Kitchen2.id WHERE id = X
  INSERT kitchen_order_reassignments (from=K1, to=K2, reason, by=manager)
  Broadcast ke kitchen.station.1: hapus order X
  Broadcast ke kitchen.station.2: tambah order X
```

---

## WebSocket Channels

| Channel | Event | Subscriber |
|---------|-------|-----------|
| `kitchen.station.{id}` | `KitchenOrderCreated`, `KitchenOrderReassigned` | Dapur (per station) |
| `bar.station.{id}` | `BarOrderCreated` | Bar (per station) |
| `table.floor` | `TableStatusUpdated` | Kasir, Waiter, Manager |
| `waiter.zone.{zone_id}` | `OrderReadyForDelivery` | Waiter (per zona) |
| `dashboard` | `DashboardMetricsUpdated` | Manager |
| `pos.{kasir_id}` | `SelfOrderReceived`, `PaymentConfirmed` | Kasir |
