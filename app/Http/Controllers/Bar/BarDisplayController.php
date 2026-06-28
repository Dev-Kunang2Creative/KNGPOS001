<?php

namespace App\Http\Controllers\Bar;

use App\Http\Controllers\Controller;
use App\Models\BarOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BarDisplayController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $stationId = $user->bar_station_id;

        $orders = BarOrder::query()
            ->where('bar_station_id', $stationId)
            ->whereNull('completed_at')
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
            'stationName' => $user->barStation?->name ?? 'Bar',
        ]);
    }

    public function markAsInProgress(Request $request, BarOrder $order)
    {
        $order->update([
            'status' => 'in_progress',
            'started_at' => now(),
            'printed_at' => now(), // Simulated printing for now
        ]);

        return back()->with('success', 'Tiket dicetak, pesanan sedang dibuat.');
    }

    public function markAsReady(Request $request, BarOrder $order)
    {
        $order->update([
            'status' => 'ready',
        ]);

        // Load order relations to get zone ID
        $order->loadMissing('order.table');
        $zoneId = $order->order->table->zone_id;

        if ($zoneId) {
            \App\Events\OrderReadyForDelivery::dispatch($order->order, $zoneId);
        }

        return back()->with('success', 'Pesanan siap diantar.');
    }
}
