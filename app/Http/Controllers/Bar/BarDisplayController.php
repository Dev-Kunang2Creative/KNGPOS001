<?php

namespace App\Http\Controllers\Bar;

use App\Events\OrderReadyForDelivery;
use App\Http\Controllers\Controller;
use App\Models\BarOrder;
use App\Models\BarStation;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BarDisplayController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // Super admins (and users without a station assignment) monitor every
        // station in the active restaurant in read-only mode.
        $isMonitor = $user->isSuperAdmin() || $user->bar_station_id === null;

        $orders = BarOrder::query()
            ->whereNull('completed_at')
            ->when(
                $isMonitor,
                fn ($query) => $query->whereIn('bar_station_id', BarStation::query()->pluck('id')),
                fn ($query) => $query->where('bar_station_id', $user->bar_station_id),
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

        return Inertia::render('Bar/Display', [
            'orders' => $orders,
            'stationName' => $isMonitor ? 'Semua Station' : ($user->barStation?->name ?? 'Bar'),
            'readOnly' => $isMonitor,
        ]);
    }

    /**
     * Printable bar ticket. Opened in a new tab by the display and
     * auto-printed client-side.
     */
    public function ticket(Request $request, BarOrder $order): Response
    {
        $order->load([
            'order:id,table_id,notes,status',
            'order.table:id,name,zone_id',
            'order.table.zone:id,name',
            'items.orderItem:id,menu_item_id,notes',
            'items.orderItem.menuItem:id,name',
            'station:id,name',
        ]);

        return Inertia::render('Bar/Ticket', [
            'barOrder' => $order,
            'stationName' => $order->station?->name ?? $request->user()->barStation?->name ?? 'Bar',
        ]);
    }

    public function markAsInProgress(Request $request, BarOrder $order)
    {
        $order->update([
            'status' => 'in_progress',
            'started_at' => now(),
            'printed_at' => now(),
        ]);

        return back()->with('success', 'Tiket dicetak, pesanan sedang dibuat.');
    }

    public function markAsReady(Request $request, BarOrder $order)
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
