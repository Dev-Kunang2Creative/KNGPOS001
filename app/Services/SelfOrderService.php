<?php

namespace App\Services;

use App\Exceptions\ZoneStationAssignmentMissingException;
use App\Models\AuditLog;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\SelfOrder;
use App\Models\Table;
use App\Models\TableQrcode;
use App\Models\User;
use App\Models\ZoneStationAssignment;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class SelfOrderService
{
    public function submit(TableQrcode $qrCode, array $validated): SelfOrder
    {
        $selfOrder = DB::transaction(function () use ($qrCode, $validated): SelfOrder {
            $table = Table::query()
                ->with('zone')
                ->lockForUpdate()
                ->findOrFail($qrCode->table_id);

            $this->assertTableCanSelfOrder($table);
            $this->assertZoneHasStationAssignment($table);

            $menuItems = MenuItem::query()
                ->where('is_available', true)
                ->whereIn('id', collect($validated['items'])->pluck('menu_item_id'))
                ->get()
                ->keyBy('id');

            if ($menuItems->count() !== collect($validated['items'])->pluck('menu_item_id')->unique()->count()) {
                throw new RuntimeException('Ada menu yang tidak tersedia.');
            }

            $subtotal = collect($validated['items'])->sum(fn (array $item): float => (float) $menuItems[$item['menu_item_id']]->price * (int) $item['quantity']);

            $selfOrder = SelfOrder::query()->create([
                'table_id' => $table->id,
                'table_qrcode_id' => $qrCode->id,
                'customer_name' => $validated['customer_name'] ?? null,
                'customer_email' => $validated['customer_email'] ?? null,
                'payment_preference' => $validated['payment_preference'],
                'notes' => $validated['notes'] ?? null,
                'status' => 'pending',
                'subtotal' => $subtotal,
                'total_amount' => $subtotal,
            ]);

            foreach ($validated['items'] as $item) {
                $menuItem = $menuItems[$item['menu_item_id']];
                $quantity = (int) $item['quantity'];

                $selfOrder->items()->create([
                    'menu_item_id' => $menuItem->id,
                    'quantity' => $quantity,
                    'unit_price' => $menuItem->price,
                    'subtotal' => (float) $menuItem->price * $quantity,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            return $selfOrder->load(['table.zone:id,name,color_hex', 'items.menuItem:id,name,price,print_to']);
        });

        return $selfOrder;
    }

    /**
     * @return array{self_order: SelfOrder, order: Order, payment: \App\Models\XenditPayment, response: array<string, mixed>}
     *
     * @throws RequestException
     */
    public function submitQris(TableQrcode $qrCode, array $validated, PaymentService $paymentService): array
    {
        return DB::transaction(function () use ($qrCode, $validated, $paymentService): array {
            $selfOrder = $this->submit($qrCode, array_merge($validated, ['payment_preference' => 'qris']));
            $order = $this->convertToOrder($selfOrder, null, false);
            $paymentResult = $paymentService->createQrisPayment(
                order: $order->fresh('items'),
                cashier: null,
                notes: 'Self-order QRIS'
            );

            return [
                'self_order' => $selfOrder->fresh(['table.zone:id,name,color_hex', 'items.menuItem:id,name,price,print_to']),
                'order' => $order->fresh(),
                'payment' => $paymentResult['payment'],
                'response' => $paymentResult['response'],
            ];
        });
    }

    /**
     * @return array{order: Order, routing: array}
     */
    public function approve(SelfOrder $selfOrder, User $cashier, OrderRoutingService $routingService): array
    {
        return DB::transaction(function () use ($selfOrder, $cashier, $routingService): array {
            $selfOrder = SelfOrder::query()
                ->with(['items.menuItem', 'table'])
                ->lockForUpdate()
                ->findOrFail($selfOrder->id);

            if ($selfOrder->status !== 'pending') {
                throw new RuntimeException('Self-order ini sudah diproses.');
            }

            $order = $this->convertToOrder($selfOrder, $cashier, true);

            $routing = $routingService->routeOrder($order->fresh(['table', 'items.menuItem']));
            $this->audit($cashier, 'self_order.approve', $selfOrder->id, ['order_id' => $order->id]);

            return ['order' => $order->fresh(), 'routing' => $routing];
        });
    }

    public function reject(SelfOrder $selfOrder, User $cashier, ?string $reason): void
    {
        DB::transaction(function () use ($selfOrder, $cashier, $reason): void {
            $selfOrder = SelfOrder::query()
                ->lockForUpdate()
                ->findOrFail($selfOrder->id);

            if ($selfOrder->status !== 'pending') {
                throw new RuntimeException('Self-order ini sudah diproses.');
            }

            $selfOrder->update([
                'status' => 'rejected',
                'rejected_by' => $cashier->id,
                'rejected_at' => now(),
                'rejection_reason' => $reason,
            ]);

            $this->audit($cashier, 'self_order.reject', $selfOrder->id, ['reason' => $reason]);
        });
    }

    private function assertTableCanSelfOrder(Table $table): void
    {
        if (! $table->self_order_enabled) {
            throw new RuntimeException('Self-order untuk meja ini sedang dinonaktifkan.');
        }

        if (in_array($table->status, ['reserved', 'blocked'], true)) {
            throw new RuntimeException('Meja ini belum bisa menerima self-order.');
        }
    }

    private function assertZoneHasStationAssignment(Table $table): void
    {
        $hasAssignment = ZoneStationAssignment::query()
            ->where('zone_id', $table->zone_id)
            ->exists();

        if (! $hasAssignment) {
            throw new ZoneStationAssignmentMissingException;
        }
    }

    private function convertToOrder(SelfOrder $selfOrder, ?User $cashier, bool $allowExistingOpenOrder): Order
    {
        $selfOrder->loadMissing(['items.menuItem', 'table']);

        if ($selfOrder->status !== 'pending') {
            throw new RuntimeException('Self-order ini sudah diproses.');
        }

        $this->assertTableCanSelfOrder($selfOrder->table);
        $this->assertZoneHasStationAssignment($selfOrder->table);

        $order = null;

        if ($allowExistingOpenOrder) {
            $order = Order::query()
                ->where('table_id', $selfOrder->table_id)
                ->whereIn('status', ['open', 'submitted'])
                ->lockForUpdate()
                ->latest()
                ->first();
        }

        if (! $order) {
            $order = Order::query()->create([
                'table_id' => $selfOrder->table_id,
                'kasir_id' => $cashier?->id,
                'order_type' => 'self_order',
                'status' => 'open',
                'notes' => $selfOrder->notes,
                'subtotal' => 0,
                'total_amount' => 0,
            ]);
        } else {
            $order->update([
                'kasir_id' => $cashier?->id,
                'notes' => trim(implode("\n", array_filter([$order->notes, $selfOrder->notes]))),
            ]);
        }

        foreach ($selfOrder->items as $item) {
            $order->items()->create([
                'menu_item_id' => $item->menu_item_id,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'subtotal' => $item->subtotal,
                'notes' => $item->notes,
                'status' => 'pending',
            ]);
        }

        $total = (float) $order->items()
            ->where('status', '!=', 'cancelled')
            ->sum('subtotal');

        $order->update([
            'subtotal' => $total,
            'total_amount' => $total,
        ]);
        $order->table?->update(['status' => 'open_bill']);

        $selfOrder->update([
            'order_id' => $order->id,
            'status' => 'converted_to_order',
            'approved_by' => $cashier?->id,
            'approved_at' => $cashier ? now() : null,
        ]);

        return $order;
    }

    private function audit(User $user, string $action, int $resourceId, array $newValue): void
    {
        AuditLog::query()->create([
            'user_id' => $user->id,
            'role' => $user->role,
            'action' => $action,
            'resource_type' => SelfOrder::class,
            'resource_id' => $resourceId,
            'new_value' => $newValue,
            'ip_address' => request()?->ip(),
        ]);
    }
}
