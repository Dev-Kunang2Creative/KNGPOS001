<?php

namespace App\Services;

use App\Exceptions\ZoneStationAssignmentMissingException;
use App\Models\BarOrder;
use App\Models\KitchenOrder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ZoneStationAssignment;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class OrderRoutingService
{
    /**
     * Whether any of the order's pending items route to a station that is
     * enabled for the restaurant. When false, no zone→station assignment is
     * needed (e.g. cashier-only restaurants).
     */
    public function orderNeedsStationRouting(Order $order): bool
    {
        $order->loadMissing('items.menuItem', 'restaurant');

        $hasKitchen = $order->restaurant?->has_kitchen ?? true;
        $hasBar = $order->restaurant?->has_bar ?? true;
        $pendingItems = $order->items->where('status', 'pending');

        $needsKitchen = $hasKitchen && $pendingItems->contains(
            fn ($item) => in_array($item->menuItem?->print_to, ['kitchen', 'kitchen_bar'], true)
        );
        $needsBar = $hasBar && $pendingItems->contains(
            fn ($item) => in_array($item->menuItem?->print_to, ['bar', 'kitchen_bar'], true)
        );

        return $needsKitchen || $needsBar;
    }

    /**
     * Items whose destination station is disabled for the restaurant, making
     * the cashier responsible for preparing them. Used for the receipt prep sheet.
     *
     * @return Collection<int, OrderItem>
     */
    public function cashierPrepItems(Order $order): Collection
    {
        $order->loadMissing('items.menuItem', 'restaurant');

        $hasKitchen = $order->restaurant?->has_kitchen ?? true;
        $hasBar = $order->restaurant?->has_bar ?? true;

        return $order->items
            ->filter(fn (OrderItem $item) => match ($item->menuItem?->print_to) {
                'kitchen' => ! $hasKitchen,
                'bar' => ! $hasBar,
                'kitchen_bar' => ! $hasKitchen && ! $hasBar,
                default => false,
            })
            ->values();
    }

    public function ensureZoneAssigned(Order $order): ZoneStationAssignment
    {
        $order->loadMissing('table');

        $assignment = ZoneStationAssignment::query()
            ->where('zone_id', $order->table->zone_id)
            ->first();

        if (! $assignment) {
            throw new ZoneStationAssignmentMissingException;
        }

        return $assignment;
    }

    /**
     * @return array{kitchen_order: KitchenOrder|null, bar_order: BarOrder|null}
     */
    public function routeOrder(Order $order): array
    {
        return DB::transaction(function () use ($order): array {
            $order->loadMissing('table', 'items.menuItem', 'restaurant');

            $hasKitchen = $order->restaurant?->has_kitchen ?? true;
            $hasBar = $order->restaurant?->has_bar ?? true;

            $pendingItems = $order->items->where('status', 'pending');
            $kitchenItems = $pendingItems->filter(fn ($item) => in_array($item->menuItem->print_to, ['kitchen', 'kitchen_bar'], true));
            $barItems = $pendingItems->filter(fn ($item) => in_array($item->menuItem->print_to, ['bar', 'kitchen_bar'], true));

            // Items only route to a station when that station is enabled for the
            // restaurant. Disabled-station items stay on the order and become the
            // cashier's responsibility (printed on the receipt prep sheet).
            $routeKitchen = $hasKitchen && $kitchenItems->isNotEmpty();
            $routeBar = $hasBar && $barItems->isNotEmpty();

            // A zone→station assignment is only required when we actually route to
            // a station, so kasir-only restaurants don't need one configured.
            $assignment = ($routeKitchen || $routeBar) ? $this->ensureZoneAssigned($order) : null;

            $kitchenOrder = null;
            if ($routeKitchen) {
                $kitchenOrder = KitchenOrder::query()->create([
                    'order_id' => $order->id,
                    'kitchen_station_id' => $assignment->kitchen_station_id,
                    'status' => 'queued',
                    'sent_at' => now(),
                ]);

                foreach ($kitchenItems as $item) {
                    DB::table('kitchen_order_items')->insert([
                        'kitchen_order_id' => $kitchenOrder->id,
                        'order_item_id' => $item->id,
                        'quantity' => $item->quantity,
                        'notes' => $item->notes,
                    ]);
                }
            }

            $barOrder = null;
            if ($routeBar) {
                $barOrder = BarOrder::query()->create([
                    'order_id' => $order->id,
                    'bar_station_id' => $assignment->bar_station_id,
                    'status' => 'queued',
                    'sent_at' => now(),
                ]);

                foreach ($barItems as $item) {
                    DB::table('bar_order_items')->insert([
                        'bar_order_id' => $barOrder->id,
                        'order_item_id' => $item->id,
                        'quantity' => $item->quantity,
                        'notes' => $item->notes,
                    ]);
                }
            }

            $pendingItems->each->update(['status' => 'sent']);
            $order->update(['status' => $order->status === 'paid' ? 'paid' : 'submitted']);

            return [
                'kitchen_order' => $kitchenOrder,
                'bar_order' => $barOrder,
            ];
        });
    }
}
