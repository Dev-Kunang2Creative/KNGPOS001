# SKILLS.md — Karcisqu POS

## Tujuan

Buku panduan operasional untuk AI Coding Assistant dan Developer. Berisi perintah CLI, standar kode, dan pola khusus Karcisqu POS.

---

## Stack & Perintah Terminal

### Backend (Laravel 13)

```bash
# Setup awal
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan storage:link

# Development servers (semua bersamaan)
php artisan serve             # Laravel (port 8000)
php artisan reverb:start      # WebSocket (port 8080)
php artisan queue:work        # Background jobs

# Database
php artisan migrate
php artisan migrate:fresh --seed
php artisan db:seed --class=RestaurantSeeder   # Zones, stations, menu
php artisan db:seed --class=StaffSeeder        # Akun semua role
php artisan make:migration nama_migrasi
php artisan make:model NamaModel -m

# Testing
php artisan test
php artisan test --filter=ZoneRoutingTest      # Test routing order ke station (WAJIB)
php artisan test --filter=KitchenRedirectTest  # Test redirect antar station
php artisan test --filter=NamaKelas

# Code Quality
vendor/bin/pint
vendor/bin/pint --test

# Queue
php artisan queue:work --tries=3
php artisan queue:failed
php artisan queue:retry all

# Helpers
php artisan route:list
php artisan permission:cache-reset   # Setelah seed — WAJIB
```

### Frontend

```bash
npm install
npm run dev      # Vite dev server dengan HMR
npm run build    # Production build
```

---

## Standar Kode Laravel

### OrderRoutingService (Inti Routing)

```php
// app/Services/OrderRoutingService.php
class OrderRoutingService
{
    public function routeOrder(Order $order): void
    {
        $assignment = ZoneStationAssignment::where('zone_id', $order->table->zone_id)->first();

        if (!$assignment) {
            throw new \RuntimeException("Zona meja belum dikonfigurasi. Hubungi Manager.");
        }

        $kitchenItems = $order->items->filter(
            fn($i) => in_array($i->menuItem->print_to, ['kitchen', 'kitchen_bar'])
        );
        $barItems = $order->items->filter(
            fn($i) => in_array($i->menuItem->print_to, ['bar', 'kitchen_bar'])
        );

        if ($kitchenItems->isNotEmpty()) {
            $ko = KitchenOrder::create([
                'order_id'           => $order->id,
                'kitchen_station_id' => $assignment->kitchen_station_id,
                'status'             => 'queued',
            ]);
            broadcast(new KitchenOrderCreated($ko))->toOthers();
        }

        if ($barItems->isNotEmpty()) {
            $bo = BarOrder::create([
                'order_id'       => $order->id,
                'bar_station_id' => $assignment->bar_station_id,
                'status'         => 'queued',
            ]);
            broadcast(new BarOrderCreated($bo))->toOthers();
        }
    }
}
```

### KitchenRedirectService

```php
// app/Services/KitchenRedirectService.php
class KitchenRedirectService
{
    public function redirect(KitchenOrder $order, KitchenStation $toStation, string $reason, User $manager): void
    {
        if ($order->status !== 'queued') {
            throw new \RuntimeException("Hanya order QUEUED yang bisa di-redirect.");
        }

        $fromStation = $order->kitchenStation;

        DB::transaction(function () use ($order, $toStation, $fromStation, $reason, $manager) {
            KitchenOrderReassignment::create([
                'kitchen_order_id' => $order->id,
                'from_station_id'  => $fromStation->id,
                'to_station_id'    => $toStation->id,
                'reason'           => $reason,
                'reassigned_by'    => $manager->id,
                'reassigned_at'    => now(),
            ]);

            $order->update(['kitchen_station_id' => $toStation->id]);

            broadcast(new KitchenOrderReassigned($order, $fromStation, $toStation));
        });
    }
}
```

### Controller (Thin)

```php
public function submit(SubmitOrderRequest $request, Order $order): Response
{
    $this->orderRoutingService->routeOrder($order);
    $order->update(['status' => 'submitted']);
    return back()->with('success', 'Order dikirim ke kitchen/bar.');
}
```

### Form Request

```php
public function rules(): array
{
    return [
        'table_id'             => ['required', 'exists:tables,id'],
        'items'                => ['required', 'array', 'min:1'],
        'items.*.menu_item_id' => ['required', 'exists:menu_items,id'],
        'items.*.quantity'     => ['required', 'integer', 'min:1'],
    ];
}
```

### Audit Log

```php
AuditLog::create([
    'user_id'       => auth()->id(),
    'role'          => auth()->user()->role,
    'action'        => 'kitchen_redirect',
    'resource_type' => 'kitchen_order',
    'resource_id'   => $kitchenOrder->id,
    'old_value'     => ['station_id' => $fromStation->id],
    'new_value'     => ['station_id' => $toStation->id, 'reason' => $reason],
    'ip_address'    => request()->ip(),
]);
```

### Xendit Webhook (Idempotent)

```php
public function handleCallback(Request $request): JsonResponse
{
    $webhookToken = SystemSettings::get('xendit_webhook_token');

    if ($request->header('X-CALLBACK-TOKEN') !== $webhookToken) {
        return response()->json(['message' => 'Unauthorized'], 401);
    }

    $payload = $request->all();
    XenditWebhookLog::create(['payload' => $payload, 'processed' => false]);

    $existing = XenditPayment::where('external_id', $payload['external_id'])
        ->where('status', 'PAID')->first();

    if ($existing) {
        return response()->json(['message' => 'Already processed']);
    }

    $this->paymentService->confirmPayment($payload);

    return response()->json(['message' => 'OK']);
}
```

---

## Standar Kode React/Inertia

### useForm untuk Submit

```jsx
import { useForm } from '@inertiajs/react';

const { data, setData, post, processing, errors } = useForm({
    table_id: '',
    items: [],
});

const submit = (e) => {
    e.preventDefault();
    post(route('pos.orders.store'));
};
```

### Shared Props

```jsx
import { usePage } from '@inertiajs/react';

const { auth, restaurant, activeShift } = usePage().props;
// restaurant.name, restaurant.logo_url
// activeShift?.id, activeShift?.opened_at
```

### WebSocket per Station (Kitchen/Bar)

```jsx
useEffect(() => {
    // Channel per station — bukan channel global
    const channel = window.Echo.private(`kitchen.station.${stationId}`)
        .listen('KitchenOrderCreated', (e) => {
            setOrders(prev => [e.order, ...prev]);
        })
        .listen('KitchenOrderReassigned', (e) => {
            // Hapus dari list jika reassigned away, tambah jika reassigned here
            if (e.toStationId === stationId) {
                setOrders(prev => [{ ...e.order, reassigned: true }, ...prev]);
            } else {
                setOrders(prev => prev.filter(o => o.id !== e.order.id));
            }
        });

    return () => {
        channel.stopListening('KitchenOrderCreated');
        channel.stopListening('KitchenOrderReassigned');
    };
}, [stationId]);
```

---

## Konvensi Penamaan File

| Type | Konvensi | Contoh |
|------|----------|--------|
| React Page | PascalCase | `KitchenDisplay.jsx`, `KitchenMonitor.jsx` |
| React Component | PascalCase | `KitchenBoard.jsx`, `ZoneAssignmentPanel.jsx` |
| Laravel Controller | PascalCase + Controller | `KitchenOrderController.php` |
| Laravel Service | PascalCase + Service | `OrderRoutingService.php` |
| Laravel Form Request | PascalCase + Request | `SubmitOrderRequest.php` |
| Migration | snake_case + timestamp | `2026_05_28_create_zones_table.php` |
| Event | PascalCase | `KitchenOrderCreated.php` |

---

## Troubleshooting Umum

| Masalah | Solusi |
|---------|--------|
| Permission tidak teraplikasi setelah seed | `php artisan permission:cache-reset` lalu logout + login |
| Gambar tidak muncul | `php artisan storage:link` belum dijalankan |
| WebSocket tidak menerima event | Pastikan `reverb:start` berjalan; cek port 8080 |
| Queue job tidak berjalan | Pastikan `queue:work` berjalan via Supervisor |
| Xendit webhook tidak diterima | `APP_URL` harus URL publik; gunakan ngrok untuk dev |
| Order tidak masuk kitchen/bar | Cek `zone_station_assignments` untuk zona meja — mungkin belum dikonfigurasi |
| Kitchen redirect tidak muncul di station tujuan | Cek channel broadcast `KitchenOrderReassigned` dan channel subscription frontend |
| Test gagal dengan MySQL error | Pakai SQLite in-memory — hindari MySQL-specific syntax |
