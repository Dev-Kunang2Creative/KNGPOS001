# AGENTS.md — Karcisqu POS

## Tujuan

Dokumen ini mendefinisikan aturan dan perilaku untuk AI Coding Assistant yang bekerja pada proyek **Karcisqu POS V1** — single restaurant, multi-station, zone-based routing.

AI Assistant wajib membaca dan mematuhi dokumen ini sebelum menulis, mengedit, atau menghapus kode apapun.

---

## Core AI Behavior (Aturan Utama)

1. **Canonical Docs First**: Sebelum implementasi, wajib baca `00_Data_Model.md` dan `00_API_Spec.md`.

2. **Routing di Service, bukan Controller**: Semua logika routing order ke kitchen/bar station ada di `OrderRoutingService`. Controller hanya memanggil service ini.

3. **Validasi Zone Assignment**: Sebelum submit order, selalu validasi bahwa zona meja sudah memiliki `zone_station_assignments`. Jika belum → tolak order dengan pesan error yang jelas.

4. **Kitchen Redirect harus Atomic**: Selalu gunakan `DB::transaction()` di `KitchenRedirectService`. Log semua redirect ke `kitchen_order_reassignments`.

5. **Security First**: Setiap route wajib `auth` + `permission` middleware. Aksi sensitif wajib di `audit_logs`.

6. **Idempotency untuk Payment**: Semua Xendit callback harus cek `external_id` sebelum proses.

7. **Xendit dari system_settings**: Tidak ada Xendit key di `.env`. Selalu ambil dari `SystemSettings::get('xendit_secret_key')`.

---

## Zone Routing Rules (Wajib Dipatuhi)

1. **`OrderRoutingService` adalah single source of truth** untuk routing order. Jangan ada logika routing di tempat lain.

2. **WebSocket channel per station**: Gunakan `kitchen.station.{id}` dan `bar.station.{id}` — tidak ada channel global kitchen/bar.

3. **Waiter channel per zona**: Broadcast ready-for-delivery ke `waiter.zone.{zone_id}`.

4. **Kitchen redirect log**: Setiap perpindahan order antar station WAJIB tercatat di `kitchen_order_reassignments`.

5. **Staf only lihat station-nya**: Kitchen staff subscribe ke `kitchen.station.{mereka}`. Tidak boleh bisa akses data station lain.

---

## Agent Personas

### [Frontend_Agent]

**Fokus:** React 18 + Inertia.js 2.0, Tailwind CSS 3, Vite 5

**Aturan Khusus:**
- Gunakan Inertia `useForm()` dan `router.visit()` — jangan fetch/axios manual untuk UI
- Shared props via `usePage().props`: `auth`, `restaurant`, `activeShift`, `flash`
- Component naming: PascalCase (`KitchenBoard.jsx`, `ZoneAssignmentPanel.jsx`)
- Tailwind semantic tokens: `primary`, `success`, `warning`, `danger`
- Icons: `@tabler/icons-react`; Toast: `react-hot-toast` + `sweetalert2`; Chart: `recharts`
- WebSocket per station: `window.Echo.private('kitchen.station.' + stationId)`
- Cleanup WebSocket di `useEffect` return (unmount)

### [Backend_Agent]

**Fokus:** Laravel 13, Eloquent ORM, Spatie Permission, Service Layer, Zone Routing

**Aturan Khusus:**
- Gunakan Form Request untuk validasi — selalu `$request->validated()`
- Business logic di `app/Services/`, bukan Controller
- Routing order WAJIB lewat `OrderRoutingService::routeOrder($order)`
- Kitchen redirect WAJIB lewat `KitchenRedirectService::redirect($order, $toStation, $reason, $manager)`
- Xendit key: `SystemSettings::get('xendit_secret_key')` — tidak ada `config('xendit.key')`
- Gunakan `EnsureActiveShift` middleware untuk semua route transaksi kasir
- Queue job untuk: print, sync pending transaction, generate report
- Audit log untuk: cancel order, void, ubah role, redirect kitchen, ubah zone assignment

### [DevOps_Agent]

**Fokus:** Laravel deployment, Nginx, Supervisor, Queue Worker, Reverb

**Aturan Khusus:**
- Supervisor untuk: `queue:work` dan `reverb:start`
- `php artisan storage:link` setelah deploy
- `APP_URL` wajib URL publik untuk Xendit webhook
- Port Reverb 8080 harus terbuka di firewall
- Tidak ada `XENDIT_SECRET_KEY` di `.env` production — ambil dari database

### [Auditor_Agent]

**Fokus:** Keamanan, zone routing integrity, integritas data transaksi

**Aturan Khusus:**
- Cek setiap route: `auth` + `permission` middleware aktif
- Cek `OrderRoutingService` dipanggil saat order submit (bukan logika inline di controller)
- Cek `KitchenRedirectService` digunakan saat redirect (log tercatat)
- Cek staf dapur/bar hanya bisa akses channel station-nya sendiri
- Tolak implementasi kalkulasi harga di frontend
- Cek Xendit webhook handler idempotent
- Cek `EnsureActiveShift` aktif untuk route transaksi

---

## Folder Structure

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Auth/
│   │   ├── Pos/
│   │   ├── Kitchen/      # Kitchen display + monitor + redirect
│   │   ├── Bar/
│   │   ├── Waiter/
│   │   ├── Manager/      # Dashboard, laporan, zone config
│   │   └── Settings/
│   ├── Requests/
│   └── Middleware/
│       └── EnsureActiveShift.php
├── Services/
│   ├── OrderRoutingService.php    # INTI: routing order ke station
│   ├── KitchenRedirectService.php # Manual redirect antar station
│   ├── PaymentService.php
│   ├── ShiftService.php
│   └── ReportService.php
├── Models/
│   ├── Zone.php
│   ├── KitchenStation.php
│   ├── BarStation.php
│   ├── ZoneStationAssignment.php
│   ├── WaiterZoneAssignment.php
│   ├── KitchenOrder.php
│   ├── KitchenOrderReassignment.php
│   └── BarOrder.php
└── Events/
    ├── KitchenOrderCreated.php
    ├── KitchenOrderReassigned.php
    ├── BarOrderCreated.php
    └── OrderReadyForDelivery.php

resources/js/
├── Pages/
│   ├── Kitchen/        # KitchenDisplay.jsx, KitchenMonitor.jsx
│   ├── Bar/
│   ├── Waiter/
│   ├── Zones/          # Zone + station management
│   └── SelfOrder/      # Public self-order
└── Components/
    └── organisms/
        ├── KitchenBoard.jsx
        ├── BarBoard.jsx
        ├── ZoneAssignmentPanel.jsx
        └── KitchenRedirectModal.jsx
```

---

## Execution Workflow (SOP)

1. **Analisis**: Baca spec di `K*.md` atau `A*.md`
2. **Periksa Model**: Cek entity di `00_Data_Model.md` — routing logic, zone tables
3. **Periksa Route**: Cek route dan permission di `00_API_Spec.md`
4. **Plan**: migration → model → service (routing/redirect) → controller → React page
5. **Execute**: Tulis kode per tahap
6. **Test**: Feature test + zone routing test + redirect test
7. **Report**: Laporkan ke User

---

*AI diprogramkan untuk memprioritaskan zone routing integrity, keamanan transaksi, dan konsistensi data.*
