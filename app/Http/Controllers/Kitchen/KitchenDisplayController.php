<?php

namespace App\Http\Controllers\Kitchen;

use App\Http\Controllers\Controller;
use App\Models\KitchenOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KitchenDisplayController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $stationId = $user->kitchen_station_id;

        $orders = KitchenOrder::query()
            ->where('kitchen_station_id', $stationId)
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

        return Inertia::render('Kitchen/Display', [
            'orders' => $orders,
            'stationName' => $user->kitchenStation?->name ?? 'Kitchen',
        ]);
    }
}
