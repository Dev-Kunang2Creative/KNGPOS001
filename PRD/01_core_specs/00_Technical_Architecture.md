# 00 - Technical Architecture

## Purpose

Menjelaskan struktur sistem Karcisqu POS — single restaurant, multi-station, zone-based routing.

---

## System Overview

```
Browser / Tablet
    ↕ Inertia.js (SSR-like SPA)
Laravel 13 (Monolith)
    ├── Controllers (thin — delegate ke Service)
    ├── Services (business logic + routing logic)
    ├── Eloquent Models
    ├── Queue Jobs (print, sync, report)
    └── Broadcast Events (Reverb WebSocket)
        ↕
MySQL Database
Laravel Reverb (WebSocket)
Xendit API (payment gateway)
Resend (email)
Thermal Printers (ESC/POS via WiFi/LAN)
```

---

## Auth & Guard

Sistem menggunakan **satu auth guard `web`** untuk semua role:

```php
// config/auth.php
'guards' => [
    'web' => [
        'driver'   => 'session',
        'provider' => 'users',
    ],
],
```

Role dibedakan lewat **Spatie Laravel Permission**. Redirect setelah login ditentukan oleh role:

```php
// app/Http/Middleware/RedirectIfAuthenticated.php
match(auth()->user()->role) {
    'super_admin', 'manager' => redirect('/dashboard'),
    'kasir'   => redirect('/pos'),
    'waiter'  => redirect('/orders'),
    'dapur'   => redirect('/kitchen'),
    'bar'     => redirect('/bar'),
}
```

---

## Zone-Based Order Routing

Komponen kunci: `app/Services/OrderRoutingService.php`

```php
class OrderRoutingService
{
    public function routeOrder(Order $order): void
    {
        $table = $order->table;
        $assignment = ZoneStationAssignment::where('zone_id', $table->zone_id)->firstOrFail();

        $kitchenItems = $order->items->filter(fn($i) => in_array($i->menuItem->print_to, ['kitchen', 'kitchen_bar']));
        $barItems     = $order->items->filter(fn($i) => in_array($i->menuItem->print_to, ['bar', 'kitchen_bar']));

        if ($kitchenItems->isNotEmpty()) {
            $kitchenOrder = KitchenOrder::create([
                'order_id'           => $order->id,
                'kitchen_station_id' => $assignment->kitchen_station_id,
                'status'             => 'queued',
            ]);
            // attach items, broadcast ke kitchen.station.{id}
            broadcast(new KitchenOrderCreated($kitchenOrder));
        }

        if ($barItems->isNotEmpty()) {
            $barOrder = BarOrder::create([
                'order_id'       => $order->id,
                'bar_station_id' => $assignment->bar_station_id,
                'status'         => 'queued',
            ]);
            broadcast(new BarOrderCreated($barOrder));
        }
    }
}
```

---

## Kitchen Redirect (Manual Overload Handling)

Komponen: `app/Services/KitchenRedirectService.php`

```php
class KitchenRedirectService
{
    public function redirect(KitchenOrder $order, KitchenStation $toStation, string $reason, User $manager): void
    {
        $fromStation = $order->kitchenStation;

        DB::transaction(function () use ($order, $toStation, $fromStation, $reason, $manager) {
            // Log reassignment
            KitchenOrderReassignment::create([
                'kitchen_order_id' => $order->id,
                'from_station_id'  => $fromStation->id,
                'to_station_id'    => $toStation->id,
                'reason'           => $reason,
                'reassigned_by'    => $manager->id,
                'reassigned_at'    => now(),
            ]);

            // Update station
            $order->update(['kitchen_station_id' => $toStation->id]);

            // Broadcast: hapus dari station asal, tambah ke station tujuan
            broadcast(new KitchenOrderReassigned($order, $fromStation, $toStation));
        });
    }
}
```

---

## WebSocket Architecture (Laravel Reverb)

Channels per station/zona — tidak ada single global channel:

```php
// routes/channels.php

// Kitchen per station
Broadcast::channel('kitchen.station.{stationId}', function (User $user, int $stationId) {
    if ($user->role === 'dapur') {
        // Validasi apakah user ini assigned ke station ini
        return true; // simplified — bisa tambah assignment check
    }
    return $user->role === 'manager' || $user->role === 'super_admin';
});

// Bar per station
Broadcast::channel('bar.station.{stationId}', function (User $user, int $stationId) {
    return in_array($user->role, ['bar', 'manager', 'super_admin']);
});

// Waiter per zona
Broadcast::channel('waiter.zone.{zoneId}', function (User $user, int $zoneId) {
    if ($user->role !== 'waiter') return false;
    return WaiterZoneAssignment::where('user_id', $user->id)
        ->where('zone_id', $zoneId)->exists();
});

// Table floor (semua yang perlu lihat denah meja)
Broadcast::channel('table.floor', function (User $user) {
    return in_array($user->role, ['kasir', 'waiter', 'manager', 'super_admin']);
});
```

---

## Folder Structure

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Auth/                    # Login, logout, password reset
│   │   ├── Pos/                     # Kasir POS
│   │   ├── Kitchen/                 # Kitchen display + redirect
│   │   ├── Bar/                     # Bar display
│   │   ├── Waiter/                  # Waiter order management
│   │   ├── Manager/                 # Dashboard, laporan, zone config
│   │   └── Settings/                # System settings, printers, Xendit
│   ├── Requests/                    # Form Request (validasi)
│   └── Middleware/
│       └── EnsureActiveShift.php    # Blokir kasir tanpa shift aktif
│
├── Services/
│   ├── OrderRoutingService.php      # Core: routing order ke station
│   ├── KitchenRedirectService.php   # Manual redirect antar kitchen
│   ├── PaymentService.php           # Xendit + cash payment
│   ├── ShiftService.php             # Buka/tutup shift, ringkasan
│   ├── PrintService.php             # Queue print jobs
│   └── ReportService.php            # Generate laporan
│
├── Models/
│   ├── User.php
│   ├── Zone.php
│   ├── KitchenStation.php
│   ├── BarStation.php
│   ├── ZoneStationAssignment.php
│   ├── WaiterZoneAssignment.php
│   ├── Table.php
│   ├── Order.php
│   ├── KitchenOrder.php
│   ├── KitchenOrderReassignment.php
│   ├── BarOrder.php
│   └── ...
│
└── Events/
    ├── KitchenOrderCreated.php
    ├── KitchenOrderReassigned.php
    ├── BarOrderCreated.php
    ├── OrderReadyForDelivery.php
    └── TableStatusUpdated.php

resources/js/
├── Pages/
│   ├── Auth/                        # Login
│   ├── Pos/                         # Kasir POS interface
│   ├── Kitchen/                     # Kitchen display (per station)
│   ├── Bar/                         # Bar display
│   ├── Waiter/                      # Waiter order view
│   ├── Dashboard/                   # Manager dashboard
│   ├── Reports/                     # Laporan
│   ├── Menu/                        # Menu management
│   ├── Zones/                       # Zone management
│   ├── Settings/                    # System settings
│   └── SelfOrder/                   # Public self-order QR page
└── Components/
    ├── atoms/
    ├── molecules/
    └── organisms/
        ├── PosCart.jsx
        ├── KitchenBoard.jsx
        ├── BarBoard.jsx
        ├── TableGrid.jsx
        └── ZoneAssignmentPanel.jsx
```

---

## Payment (Xendit)

Xendit dikonfigurasi satu set credential untuk seluruh restoran, disimpan di `system_settings` (encrypted):
- `xendit_secret_key`
- `xendit_webhook_token`

Webhook URL: `POST /api/xendit/callback`

```php
// External ID format
$externalId = "karcisqu-{$transaction->id}-" . now()->timestamp;
```

---

## Queue Jobs

| Job | Trigger | Aksi |
|-----|---------|------|
| `RouteOrderJob` | Order submitted | Panggil OrderRoutingService |
| `SendPrintJob` | Order paid / kitchen done | Kirim ESC/POS ke printer |
| `SyncPendingTransaction` | Scheduled (tiap 5 menit) | Cek pending transactions |
| `GenerateReportJob` | Manager request export | Buat PDF/Excel di background |

---

## Environment Variables

```env
APP_NAME="Karcisqu POS"
APP_URL=https://pos.namadomain.com

DB_CONNECTION=mysql
DB_DATABASE=karcisqu_pos

REVERB_APP_ID=...
REVERB_APP_KEY=...
REVERB_APP_SECRET=...

RESEND_API_KEY=...

# Xendit disimpan di system_settings, bukan di .env
# Hanya fallback/test key di .env untuk development:
XENDIT_SECRET_KEY_DEV=xnd_development_...
```
