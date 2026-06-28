<?php

namespace App\Http\Controllers\Waiter;

use App\Http\Controllers\Controller;
use App\Models\BarOrder;
use App\Models\KitchenOrder;
use App\Models\Order;
use App\Models\Table;
use App\Models\WaiterZoneAssignment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class WaiterOrderController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Get zones assigned to this waiter
        $zoneIds = WaiterZoneAssignment::query()
            ->where('user_id', $user->id)
            ->pluck('zone_id');

        // Get tables in waiter's zones
        $tables = Table::query()
            ->whereIn('zone_id', $zoneIds)
            ->with('zone:id,name,color_hex')
            ->orderBy('name')
            ->get(['id', 'name', 'status', 'zone_id', 'capacity']);

        $eagerLoads = [
            'order:id,table_id,notes,status',
            'order.table:id,name,zone_id',
            'order.table.zone:id,name,color_hex',
            'items.orderItem:id,menu_item_id,notes,quantity',
            'items.orderItem.menuItem:id,name',
        ];

        // Kitchen orders in waiter's zones that are ready for delivery
        $kitchenOrders = KitchenOrder::query()
            ->where('status', 'ready')
            ->whereHas('order.table', fn ($q) => $q->whereIn('zone_id', $zoneIds))
            ->with($eagerLoads)
            ->orderBy('sent_at', 'asc')
            ->get();

        // Bar orders in waiter's zones that are ready for delivery
        $barOrders = BarOrder::query()
            ->where('status', 'ready')
            ->whereHas('order.table', fn ($q) => $q->whereIn('zone_id', $zoneIds))
            ->with($eagerLoads)
            ->orderBy('sent_at', 'asc')
            ->get();

        // Group kitchen + bar station orders into a single card per order/bill.
        $orders = $kitchenOrders->map(fn ($stationOrder) => $this->mapStationOrder($stationOrder, 'kitchen'))
            ->merge($barOrders->map(fn ($stationOrder) => $this->mapStationOrder($stationOrder, 'bar')))
            ->groupBy('order_id')
            ->map(function ($group) {
                $first = $group->first();

                return [
                    'order' => $first['order'],
                    'sent_at' => $group->pluck('sent_at')->filter()->min(),
                    'items' => $group->flatMap(fn ($entry) => $entry['items'])->values(),
                ];
            })
            ->sortBy('sent_at')
            ->values();

        return Inertia::render('Waiter/Orders', [
            'tables' => $tables,
            'orders' => $orders,
            'zoneIds' => $zoneIds,
        ]);
    }

    /**
     * Normalize a kitchen/bar order into a flat structure for grouping.
     *
     * @return array{order_id: int, order: array<string, mixed>, sent_at: ?string, items: Collection<int, array<string, mixed>>}
     */
    private function mapStationOrder(KitchenOrder|BarOrder $stationOrder, string $station): array
    {
        return [
            'order_id' => $stationOrder->order_id,
            'order' => [
                'id' => $stationOrder->order->id,
                'notes' => $stationOrder->order->notes,
                'table' => $stationOrder->order->table,
            ],
            'sent_at' => $stationOrder->sent_at,
            'items' => $stationOrder->items->map(fn ($item) => [
                'id' => $station.'-'.$item->id,
                'station' => $station,
                'name' => $item->orderItem?->menuItem?->name ?? 'Item',
                'quantity' => $item->quantity,
                'notes' => $item->notes ?? $item->orderItem?->notes,
            ]),
        ];
    }

    /**
     * Waiter marks an entire order as delivered, completing both its
     * kitchen and bar station orders at once.
     */
    public function deliverOrder(Order $order): RedirectResponse
    {
        $now = now();

        $order->kitchenOrders()->where('status', 'ready')->update([
            'status' => 'completed',
            'completed_at' => $now,
        ]);

        $order->barOrders()->where('status', 'ready')->update([
            'status' => 'completed',
            'completed_at' => $now,
        ]);

        return back()->with('success', 'Pesanan telah diantar.');
    }

    /**
     * Waiter toggles table status (available ↔ occupied).
     */
    public function toggleTableStatus(Request $request, Table $table): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:available,occupied,open_bill,reserved'],
        ]);

        $table->update(['status' => $validated['status']]);

        return back()->with('success', "Meja {$table->name} → {$validated['status']}.");
    }
}
