<?php

namespace App\Services;

use App\Exceptions\ZoneStationAssignmentMissingException;
use App\Models\BarOrder;
use App\Models\KitchenOrder;
use App\Models\Order;
use App\Models\ZoneStationAssignment;
use Illuminate\Support\Facades\DB;

class OrderRoutingService
{
    /**
     * @return array{kitchen_order: KitchenOrder|null, bar_order: BarOrder|null}
     */
    public function routeOrder(Order $order): array
    {
        return DB::transaction(function () use ($order): array {
            $order->loadMissing('table', 'items.menuItem');

            $assignment = ZoneStationAssignment::query()
                ->where('zone_id', $order->table->zone_id)
                ->first();

            if (! $assignment) {
                throw new ZoneStationAssignmentMissingException;
            }

            $pendingItems = $order->items->where('status', 'pending');
            $kitchenItems = $pendingItems->filter(fn ($item) => in_array($item->menuItem->print_to, ['kitchen', 'kitchen_bar'], true));
            $barItems = $pendingItems->filter(fn ($item) => in_array($item->menuItem->print_to, ['bar', 'kitchen_bar'], true));

            $kitchenOrder = null;
            if ($kitchenItems->isNotEmpty()) {
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
            if ($barItems->isNotEmpty()) {
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
