<?php

namespace App\Http\Controllers\Pos;

use App\Exceptions\ZoneStationAssignmentMissingException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\StoreOrderRequest;
use App\Http\Requests\Pos\SubmitOrderRequest;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use App\Models\XenditPayment;
use App\Services\OrderRoutingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(): Response
    {
        $activeOrder = request('order')
            ? Order::query()
                ->with(['table.zone', 'items.menuItem:id,name,price,print_to'])
                ->where('kasir_id', auth()->id())
                ->find(request('order'))
            : null;

        return Inertia::render('Pos/Index', [
            'tables' => Table::query()
                ->with(['zone:id,name,color_hex', 'zone.assignment'])
                ->orderBy('name')
                ->get(),
            'categories' => MenuCategory::query()
                ->with(['activeItems' => fn ($query) => $query
                    ->where('is_available', true)
                    ->orderBy('sort_order')
                    ->select(['id', 'category_id', 'name', 'price', 'print_to'])])
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'name']),
            'activeOrder' => $activeOrder,
            'xenditPayment' => request('payment')
                ? XenditPayment::query()->find(request('payment'))
                : null,
        ]);
    }

    public function store(StoreOrderRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $order = DB::transaction(function () use ($request, $validated): Order {
            $menuItems = MenuItem::query()
                ->whereIn('id', collect($validated['items'])->pluck('menu_item_id'))
                ->get()
                ->keyBy('id');

            $subtotal = collect($validated['items'])->sum(function (array $item) use ($menuItems): float {
                return (float) $menuItems[$item['menu_item_id']]->price * (int) $item['quantity'];
            });

            $order = Order::query()->create([
                'table_id' => $validated['table_id'],
                'kasir_id' => $request->user()->id,
                'order_type' => 'dine_in',
                'status' => 'open',
                'notes' => $validated['notes'] ?? null,
                'subtotal' => $subtotal,
                'total_amount' => $subtotal,
            ]);

            foreach ($validated['items'] as $item) {
                $menuItem = $menuItems[$item['menu_item_id']];
                $quantity = (int) $item['quantity'];

                $order->items()->create([
                    'menu_item_id' => $menuItem->id,
                    'quantity' => $quantity,
                    'unit_price' => $menuItem->price,
                    'subtotal' => (float) $menuItem->price * $quantity,
                    'notes' => $item['notes'] ?? null,
                    'status' => 'pending',
                ]);
            }

            return $order;
        });

        return redirect()->route('pos.index', ['order' => $order->id])
            ->with('success', 'Order draft berhasil dibuat.');
    }

    public function submit(SubmitOrderRequest $request, Order $order, OrderRoutingService $routingService): RedirectResponse
    {
        abort_unless($order->kasir_id === $request->user()->id && $order->status === 'open', 403);

        try {
            $routingService->routeOrder($order);
        } catch (ZoneStationAssignmentMissingException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()->route('pos.index')->with('success', 'Order berhasil dikirim ke station.');
    }
}
