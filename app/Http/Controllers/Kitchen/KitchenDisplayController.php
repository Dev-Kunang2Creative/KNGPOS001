<?php

namespace App\Http\Controllers\Kitchen;

use App\Events\OrderReadyForDelivery;
use App\Http\Controllers\Controller;
use App\Models\KitchenOrder;
use App\Models\KitchenStation;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KitchenDisplayController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Super admins (and users without a station assignment) monitor every
        // station in the active restaurant in read-only mode.
        $isMonitor = $user->isSuperAdmin() || $user->kitchen_station_id === null;

        $orders = KitchenOrder::query()
            ->whereNull('completed_at')
            ->when(
                $isMonitor,
                fn ($query) => $query->whereIn('kitchen_station_id', KitchenStation::query()->pluck('id')),
                fn ($query) => $query->where('kitchen_station_id', $user->kitchen_station_id),
            )
            ->with([
                'order:id,table_id,notes,status',
                'order.table:id,name,zone_id',
                'order.table.zone:id,name,color_hex',
                'items.orderItem:id,menu_item_id,notes',
                'items.orderItem.menuItem:id,name',
                'station:id,name',
            ])
            ->orderBy('sent_at', 'asc')
            ->get();

        return Inertia::render('Kitchen/Display', [
            'orders' => $orders,
            'stationName' => $isMonitor ? 'Semua Station' : ($user->kitchenStation?->name ?? 'Kitchen'),
            'readOnly' => $isMonitor,
        ]);
    }

    /**
     * Printable kitchen ticket. Opened in a new tab by the display and
     * auto-printed client-side.
     */
    public function ticket(Request $request, KitchenOrder $order): Response
    {
        $order->load([
            'order:id,table_id,notes,status',
            'order.table:id,name,zone_id',
            'order.table.zone:id,name',
            'items.orderItem:id,menu_item_id,notes',
            'items.orderItem.menuItem:id,name',
            'station:id,name',
        ]);

        return Inertia::render('Kitchen/Ticket', [
            'kitchenOrder' => $order,
            'stationName' => $order->station?->name ?? $request->user()->kitchenStation?->name ?? 'Kitchen',
        ]);
    }

    public function markAsInProgress(Request $request, KitchenOrder $order)
    {
        $order->update([
            'status' => 'in_progress',
            'started_at' => now(),
            'printed_at' => now(),
        ]);

        return back()->with('success', 'Tiket dicetak, pesanan sedang dibuat.');
    }

    public function markAsReady(Request $request, KitchenOrder $order)
    {
        $order->update([
            'status' => 'ready',
        ]);

        // Load order relations to get zone ID
        $order->loadMissing('order.table', 'order.restaurant');
        $zoneId = $order->order->table->zone_id;

        // Only notify the waiter queue when the restaurant uses waiters.
        if ($zoneId && ($order->order->restaurant?->has_waiter ?? true)) {
            OrderReadyForDelivery::dispatch($order->order, $zoneId);
        }

        return back()->with('success', 'Pesanan siap diantar.');
    }
}
