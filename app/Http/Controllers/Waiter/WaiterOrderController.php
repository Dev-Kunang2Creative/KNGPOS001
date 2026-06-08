<?php

namespace App\Http\Controllers\Waiter;

use App\Http\Controllers\Controller;
use App\Models\BarOrder;
use App\Models\KitchenOrder;
use App\Models\Table;
use App\Models\WaiterZoneAssignment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        // Kitchen orders in waiter's zones that are not yet delivered
        $kitchenOrders = KitchenOrder::query()
            ->whereNull('completed_at')
            ->whereHas('order.table', fn ($q) => $q->whereIn('zone_id', $zoneIds))
            ->with([
                'order:id,table_id,notes,status',
                'order.table:id,name,zone_id',
                'order.table.zone:id,name,color_hex',
                'items.orderItem:id,menu_item_id,notes,quantity',
                'items.orderItem.menuItem:id,name',
                'station:id,name',
            ])
            ->orderBy('sent_at', 'asc')
            ->get();

        // Bar orders in waiter's zones that are not yet delivered
        $barOrders = BarOrder::query()
            ->whereNull('completed_at')
            ->whereHas('order.table', fn ($q) => $q->whereIn('zone_id', $zoneIds))
            ->with([
                'order:id,table_id,notes,status',
                'order.table:id,name,zone_id',
                'order.table.zone:id,name,color_hex',
                'items.orderItem:id,menu_item_id,notes,quantity',
                'items.orderItem.menuItem:id,name',
                'station:id,name',
            ])
            ->orderBy('sent_at', 'asc')
            ->get();

        return Inertia::render('Waiter/Orders', [
            'tables' => $tables,
            'kitchenOrders' => $kitchenOrders,
            'barOrders' => $barOrders,
            'zoneIds' => $zoneIds,
        ]);
    }

    /**
     * Waiter marks a kitchen order as delivered (completed).
     */
    public function deliverKitchenOrder(KitchenOrder $kitchenOrder): RedirectResponse
    {
        $kitchenOrder->update([
            'status' => 'delivered',
            'completed_at' => now(),
        ]);

        return back()->with('success', 'Order kitchen telah diantar.');
    }

    /**
     * Waiter marks a bar order as delivered (completed).
     */
    public function deliverBarOrder(BarOrder $barOrder): RedirectResponse
    {
        $barOrder->update([
            'status' => 'delivered',
            'completed_at' => now(),
        ]);

        return back()->with('success', 'Order bar telah diantar.');
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
