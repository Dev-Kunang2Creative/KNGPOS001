<?php

namespace App\Http\Controllers\Pos;

use App\Exceptions\ZoneStationAssignmentMissingException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\AddOrderItemsRequest;
use App\Http\Requests\Pos\ApproveSelfOrderRequest;
use App\Http\Requests\Pos\RejectSelfOrderRequest;
use App\Http\Requests\Pos\StoreOrderRequest;
use App\Http\Requests\Pos\SubmitOrderRequest;
use App\Models\BarOrder;
use App\Models\KitchenOrder;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\SelfOrder;
use App\Models\Table;
use App\Models\Transaction;
use App\Models\XenditPayment;
use App\Services\OrderRoutingService;
use App\Services\PaymentService;
use App\Services\SelfOrderService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class OrderController extends Controller
{
    public function index(): Response
    {
        $activeOrder = request('order')
            ? Order::query()
                ->with(['table.zone', 'items.menuItem:id,name,price,print_to'])
                ->where('kasir_id', auth()->id())
                ->whereIn('status', ['open', 'submitted'])
                ->find(request('order'))
            : null;

        return Inertia::render('Pos/Index', [
            'tables' => Table::query()
                ->with(['zone:id,name,color_hex', 'zone.assignment'])
                ->orderBy('name')
                ->get(),
            'openOrders' => Order::query()
                ->with('table:id,name')
                ->where('kasir_id', auth()->id())
                ->whereIn('status', ['open', 'submitted'])
                ->latest()
                ->get(['id', 'table_id', 'status', 'total_amount', 'created_at']),
            'categories' => MenuCategory::query()
                ->whereNull('parent_id')
                ->with([
                    'activeItems' => fn ($query) => $query
                        ->with(['addons' => fn ($q) => $q->where('is_active', true)])
                        ->where('is_available', true)
                        ->orderBy('sort_order')
                        ->select(['id', 'category_id', 'name', 'price', 'print_to', 'image_path']),
                    'children' => fn ($query) => $query
                        ->where('is_active', true)
                        ->orderBy('sort_order')
                        ->with(['activeItems' => fn ($q) => $q
                            ->with(['addons' => fn ($a) => $a->where('is_active', true)])
                            ->where('is_available', true)
                            ->orderBy('sort_order')
                            ->select(['id', 'category_id', 'name', 'price', 'print_to', 'image_path'])
                        ])
                        ->select(['id', 'parent_id', 'name']),
                ])
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'name']),
            'activeOrder' => $activeOrder,
            'xenditPayment' => $activeOrder
                ? XenditPayment::query()
                    ->whereHas('transaction', fn ($q) => $q->where('order_id', $activeOrder->id))
                    ->where('status', '!=', 'paid')
                    ->latest()
                    ->first()
                : null,
            'pendingSelfOrders' => SelfOrder::query()
                ->with(['table.zone:id,name,color_hex', 'items.menuItem:id,name,price,print_to'])
                ->where('status', 'pending')
                ->latest()
                ->limit(20)
                ->get(),
            'paidSelfOrderReceipts' => SelfOrder::query()
                ->with([
                    'table.zone:id,name,color_hex',
                    'items.menuItem:id,name,price,print_to',
                    'order.transaction:id,order_id,payment_method,amount_paid,status,paid_at',
                ])
                ->where('status', 'converted_to_order')
                ->whereIn('payment_preference', ['qris', 'online'])
                ->whereNull('receipt_printed_at')
                ->whereHas('order.transaction', fn ($query) => $query
                    ->whereIn('payment_method', ['qris', 'xendit'])
                    ->where('status', 'paid'))
                ->latest()
                ->limit(20)
                ->get(),
            'pendingStationTickets' => $this->stationTicketsQuery(false),
            'stationTicketHistory' => $this->stationTicketsQuery(true),
        ]);
    }

    public function receipt(Transaction $transaction): Response
    {
        $transaction->loadMissing('order:id,order_type');

        abort_unless(
            $transaction->kasir_id === auth()->id()
                || ($transaction->kasir_id === null && $transaction->order?->order_type === 'self_order'),
            403
        );
        abort_unless($transaction->status === 'paid', 404);

        // Printing the receipt for a paid self-order clears it from the POS
        // "QRIS lunas, cetak struk" notification (unless explicitly reprinting).
        if ($transaction->order?->order_type === 'self_order' && ! request()->boolean('reprint')) {
            SelfOrder::query()
                ->where('order_id', $transaction->order_id)
                ->whereNull('receipt_printed_at')
                ->update(['receipt_printed_at' => now()]);
        }

        $transaction->load([
            'cashier:id,name',
            'order.table.zone:id,name',
            'order.items.menuItem:id,name,print_to',
        ]);

        // Append order notes (not a relation, needs explicit select)
        $transaction->order?->makeVisible('notes');

        return Inertia::render('Pos/Receipt', [
            'transaction' => $transaction,
            'stationTicketUrls' => $this->stationTicketUrlsForOrder($transaction->order),
        ]);
    }

    public function stationTicket(Request $request, Order $order): Response
    {
        abort_unless(
            $order->kasir_id === $request->user()->id
                || ($order->kasir_id === null && $order->order_type === 'self_order'),
            403
        );

        $order->load(['table.zone:id,name', 'cashier:id,name', 'transaction:id,order_id']);
        $kitchenOrderId = $request->integer('kitchen_order');
        $barOrderId = $request->integer('bar_order');
        $isBatchTicket = $kitchenOrderId || $barOrderId;

        $kitchenOrders = $order->kitchenOrders()
            ->with(['station:id,name', 'items.orderItem.menuItem:id,name,print_to'])
            ->when($kitchenOrderId, fn ($query, int $id) => $query->whereKey($id))
            ->when($isBatchTicket && ! $kitchenOrderId, fn ($query) => $query->whereRaw('1 = 0'))
            ->latest()
            ->get();

        $barOrders = $order->barOrders()
            ->with(['station:id,name', 'items.orderItem.menuItem:id,name,print_to'])
            ->when($barOrderId, fn ($query, int $id) => $query->whereKey($id))
            ->when($isBatchTicket && ! $barOrderId, fn ($query) => $query->whereRaw('1 = 0'))
            ->latest()
            ->get();

        abort_if($kitchenOrders->isEmpty() && $barOrders->isEmpty(), 404);

        if (! $request->boolean('reprint')) {
            $kitchenOrders->whereNull('printed_at')->each->update(['printed_at' => now()]);
            $barOrders->whereNull('printed_at')->each->update(['printed_at' => now()]);
        }

        return Inertia::render('Pos/StationTicket', [
            'order' => $order,
            'kitchenOrders' => $kitchenOrders,
            'barOrders' => $barOrders,
            'xenditPayment' => $request->integer('payment')
                ? XenditPayment::query()->find($request->integer('payment'))
                : null,
            'receiptId' => $request->integer('receipt') ?: null,
        ]);
    }

    private function stationTicketsQuery(bool $printed): array
    {
        $kitchenTickets = KitchenOrder::query()
            ->with(['order.table.zone:id,name', 'station:id,name'])
            ->when($printed, fn ($query) => $query->whereNotNull('printed_at'), fn ($query) => $query->whereNull('printed_at'))
            ->latest($printed ? 'printed_at' : 'sent_at')
            ->limit(20)
            ->get()
            ->map(fn (KitchenOrder $ticket): array => [
                'id' => $ticket->id,
                'type' => 'kitchen',
                'order_id' => $ticket->order_id,
                'station_name' => $ticket->station?->name,
                'table_name' => $ticket->order?->table?->name,
                'zone_name' => $ticket->order?->table?->zone?->name,
                'sent_at' => $ticket->sent_at,
                'printed_at' => $ticket->printed_at,
            ]);

        $barTickets = BarOrder::query()
            ->with(['order.table.zone:id,name', 'station:id,name'])
            ->when($printed, fn ($query) => $query->whereNotNull('printed_at'), fn ($query) => $query->whereNull('printed_at'))
            ->latest($printed ? 'printed_at' : 'sent_at')
            ->limit(20)
            ->get()
            ->map(fn (BarOrder $ticket): array => [
                'id' => $ticket->id,
                'type' => 'bar',
                'order_id' => $ticket->order_id,
                'station_name' => $ticket->station?->name,
                'table_name' => $ticket->order?->table?->name,
                'zone_name' => $ticket->order?->table?->zone?->name,
                'sent_at' => $ticket->sent_at,
                'printed_at' => $ticket->printed_at,
            ]);

        return $kitchenTickets
            ->concat($barTickets)
            ->sortByDesc(fn (array $ticket) => $printed ? $ticket['printed_at'] : $ticket['sent_at'])
            ->take(20)
            ->values()
            ->all();
    }

    /**
     * @return list<array{type: string, label: string, url: string}>
     */
    private function stationTicketUrlsForOrder(?Order $order): array
    {
        if (! $order) {
            return [];
        }

        $kitchenOrder = $order->kitchenOrders()
            ->whereNull('printed_at')
            ->latest('sent_at')
            ->first(['id']);

        $barOrder = $order->barOrders()
            ->whereNull('printed_at')
            ->latest('sent_at')
            ->first(['id']);

        $transactionId = $order->transaction?->id;
        $urls = [];

        if ($kitchenOrder) {
            $routeParams = [
                'order' => $order->id,
                'kitchen_order' => $kitchenOrder->id,
            ];

            if ($transactionId) {
                $routeParams['receipt'] = $transactionId;
            }

            $urls[] = [
                'type' => 'kitchen',
                'label' => 'Cetak Kitchen',
                'url' => route('pos.orders.station-ticket', $routeParams),
            ];
        }

        if ($barOrder) {
            $routeParams = [
                'order' => $order->id,
                'bar_order' => $barOrder->id,
            ];

            if ($transactionId) {
                $routeParams['receipt'] = $transactionId;
            }

            $urls[] = [
                'type' => 'bar',
                'label' => 'Cetak Bar',
                'url' => route('pos.orders.station-ticket', $routeParams),
            ];
        }

        return $urls;
    }

    public function store(StoreOrderRequest $request): RedirectResponse
    {
        try {
            $validated = $request->validated();
            $order = $this->createOrder($request, $validated);
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()->route('pos.index', ['order' => $order->id])
            ->with('success', 'Open bill berhasil dibuat.');
    }

    public function closeBill(
        StoreOrderRequest $request,
        OrderRoutingService $routingService,
        PaymentService $paymentService,
    ): RedirectResponse {
        abort_unless($request->user()->can('pos.create') && $request->user()->can('pos.checkout'), 403);

        try {
            $validated = $request->validated();
            $order = $this->createOrder($request, $validated);
            $routingService->ensureZoneAssigned($order);
            $paymentMethod = $validated['payment_method'] ?? 'cash';

            if ($paymentMethod === 'qris') {
                $result = $paymentService->createQrisPayment($order->fresh('items'), $request->user());

                $this->linkSelfOrderIfProvided($validated['self_order_id'] ?? null, $order->id);

                return redirect()
                    ->route('pos.xendit.show', $result['payment'])
                    ->with('success', 'QRIS Xendit berhasil dibuat. Selesaikan pembayaran sebelum cetak struk dan Kitchen/Bar.');
            }

            $transaction = $paymentService->createCashPayment(
                order: $order->fresh('items'),
                cashier: $request->user(),
                amountPaid: (float) ($validated['amount_paid'] ?? 0),
                notes: $validated['notes'] ?? null,
            );
            $routingService->routeOrder($order->fresh(['table', 'items.menuItem']));

            $this->linkSelfOrderIfProvided($validated['self_order_id'] ?? null, $order->id);
        } catch (RequestException $exception) {
            Log::error('Close Bill Xendit Request Error', [
                'response' => $exception->response->json(),
                'status' => $exception->response->status(),
            ]);
            $errorMessage = $exception->response->json('message') ?? 'Terjadi kesalahan pada API Xendit';

            return back()->with('error', 'Gagal membuat pembayaran Xendit: '.(is_array($errorMessage) ? json_encode($errorMessage) : $errorMessage));
        } catch (ZoneStationAssignmentMissingException|RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()
            ->route('pos.transactions.receipt', $transaction)
            ->with('success', 'Pembayaran berhasil. Cetak struk customer terlebih dahulu.');
    }

    public function submit(SubmitOrderRequest $request, Order $order, OrderRoutingService $routingService): RedirectResponse
    {
        abort_unless($order->kasir_id === $request->user()->id && in_array($order->status, ['open', 'submitted'], true), 403);

        try {
            $result = $routingService->routeOrder($order);
        } catch (ZoneStationAssignmentMissingException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return $this->redirectToStationTicket($order, $result);
    }

    public function addItemsAndSubmit(AddOrderItemsRequest $request, Order $order, OrderRoutingService $routingService): RedirectResponse
    {
        abort_unless($order->kasir_id === $request->user()->id && in_array($order->status, ['open', 'submitted'], true), 403);

        try {
            $this->appendItems($order, $request->validated('items'));
            $result = $routingService->routeOrder($order->fresh());
        } catch (ZoneStationAssignmentMissingException|RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return $this->redirectToStationTicket($order->fresh(), $result);
    }

    private function linkSelfOrderIfProvided(?int $selfOrderId, int $orderId): void
    {
        if (! $selfOrderId) {
            return;
        }

        SelfOrder::query()
            ->where('id', $selfOrderId)
            ->where('status', 'pending')
            ->update(['status' => 'converted_to_order', 'order_id' => $orderId]);
    }

    /**
     * @param  array{kitchen_order: mixed, bar_order: mixed}  $result
     */
    private function redirectToStationTicket(Order $order, array $result, ?int $receiptId = null): RedirectResponse
    {
        if (! $result['kitchen_order'] && ! $result['bar_order']) {
            $routeParams = ['order' => $order->id];

            if ($receiptId) {
                return redirect()
                    ->route('pos.transactions.receipt', $receiptId)
                    ->with('success', 'Pembayaran berhasil. Tidak ada item Kitchen/Bar.');
            }

            return redirect()
                ->route('pos.index', $routeParams)
                ->with('success', 'Order berhasil disubmit. Tidak ada item baru untuk Kitchen/Bar.');
        }

        $stationUrls = $this->stationTicketUrlsFromRouting($order, $result, $receiptId);

        return redirect()
            ->to($stationUrls[0])
            ->with('success', 'Order berhasil dikirim ke station. Struk Kitchen/Bar siap dicetak terpisah.');
    }

    /**
     * @param  array{kitchen_order: mixed, bar_order: mixed}  $result
     * @return list<string>
     */
    private function stationTicketUrlsFromRouting(Order $order, array $result, ?int $receiptId = null): array
    {
        $urls = [];
        $baseParams = ['order' => $order->id];

        if ($result['payment'] ?? null) {
            $baseParams['payment'] = $result['payment']->id;
        }

        if ($receiptId) {
            $baseParams['receipt'] = $receiptId;
        }

        if ($result['kitchen_order']) {
            $urls[] = route('pos.orders.station-ticket', array_merge($baseParams, [
                'kitchen_order' => $result['kitchen_order']->id,
            ]));
        }

        if ($result['bar_order']) {
            $urls[] = route('pos.orders.station-ticket', array_merge($baseParams, [
                'bar_order' => $result['bar_order']->id,
            ]));
        }

        if (count($urls) < 2) {
            return $urls;
        }

        return collect($urls)
            ->map(function (string $url, int $index) use ($urls): string {
                $nextUrl = $urls[$index + 1] ?? null;

                if (! $nextUrl) {
                    return $url;
                }

                $separator = str_contains($url, '?') ? '&' : '?';

                return $url.$separator.'next_station_ticket='.urlencode($nextUrl);
            })
            ->all();
    }

    public function addItems(AddOrderItemsRequest $request, Order $order): RedirectResponse
    {
        abort_unless($order->kasir_id === $request->user()->id && in_array($order->status, ['open', 'submitted'], true), 403);

        try {
            $this->appendItems($order, $request->validated('items'));
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()
            ->route('pos.index', ['order' => $order->id])
            ->with('success', 'Item berhasil ditambahkan ke open bill. Cetak ke Kitchen/Bar untuk mengirim item baru.');
    }

    public function approveSelfOrder(
        ApproveSelfOrderRequest $request,
        SelfOrder $selfOrder,
        SelfOrderService $selfOrderService,
        OrderRoutingService $routingService,
        PaymentService $paymentService,
    ): RedirectResponse {
        $paymentPreference = $selfOrder->payment_preference;

        try {
            $result = $selfOrderService->approve($selfOrder, $request->user(), $routingService);
        } catch (ZoneStationAssignmentMissingException|RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        if ($paymentPreference === 'qris') {
            try {
                $paymentResult = $paymentService->createQrisPayment($result['order']->fresh('items'), $request->user());
                $result['routing']['payment'] = $paymentResult['payment'];
            } catch (RequestException|RuntimeException $exception) {
                return $this->redirectToStationTicket($result['order'], $result['routing'])
                    ->with('error', 'Self-order diterima, tetapi QRIS gagal dibuat: '.$exception->getMessage());
            }
        }

        return redirect()
            ->route('pos.index', ['order' => $result['order']->id])
            ->with('success', 'Self-order diterima. Tagihan siap dibayar dan tiket Kitchen/Bar masuk daftar cetak.');
    }

    public function rejectSelfOrder(
        RejectSelfOrderRequest $request,
        SelfOrder $selfOrder,
        SelfOrderService $selfOrderService,
    ): RedirectResponse {
        try {
            $selfOrderService->reject($selfOrder, $request->user(), $request->validated('reason'));
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return back()->with('success', 'Self-order berhasil ditolak.');
    }

    /**
     * Mark a paid QRIS self-order's receipt as printed so it leaves the
     * "QRIS lunas, cetak struk" notification list.
     */
    public function markSelfOrderReceiptPrinted(SelfOrder $selfOrder): RedirectResponse
    {
        if (! $selfOrder->receipt_printed_at) {
            $selfOrder->update(['receipt_printed_at' => now()]);
        }

        return back()->with('success', 'Struk ditandai sudah dicetak.');
    }

    private function createOrder(StoreOrderRequest $request, array $validated): Order
    {
        return DB::transaction(function () use ($request, $validated): Order {
            $table = Table::query()
                ->lockForUpdate()
                ->findOrFail($validated['table_id']);

            if (! in_array($table->status, ['available', 'occupied'], true)) {
                throw new RuntimeException('Meja ini sedang memiliki open bill, reserved, atau blocked. Buka open bill yang ada atau pilih meja lain.');
            }

            $menuItems = MenuItem::query()
                ->whereIn('id', collect($validated['items'])->pluck('menu_item_id'))
                ->get()
                ->keyBy('id');

            $subtotal = collect($validated['items'])->sum(function (array $item) use ($menuItems): float {
                $basePrice = (float) $menuItems[$item['menu_item_id']]->price;
                $addonPrice = 0;
                
                if (!empty($item['addons'])) {
                    $addonPrice = \App\Models\MenuItemAddon::query()
                        ->whereIn('id', $item['addons'])
                        ->where('menu_item_id', $item['menu_item_id'])
                        ->where('is_active', true)
                        ->sum('price');
                }
                
                return ($basePrice + $addonPrice) * (int) $item['quantity'];
            });

            $restaurant = \App\Models\Restaurant::find($table->restaurant_id);
            $serviceChargeAmount = $restaurant && $restaurant->service_charge_is_active
                ? $subtotal * ($restaurant->service_charge_percentage / 100)
                : 0;
            $taxAmount = $restaurant && $restaurant->tax_is_active
                ? ($subtotal + $serviceChargeAmount) * ($restaurant->tax_percentage / 100)
                : 0;
            $totalAmount = $subtotal + $serviceChargeAmount + $taxAmount;

            $paymentMethod = $validated['payment_method'] ?? 'cash';

            if (($validated['bill_mode'] ?? 'open_bill') === 'close_bill' && $paymentMethod === 'cash' && (float) ($validated['amount_paid'] ?? 0) < $totalAmount) {
                throw new RuntimeException('Uang pelanggan kurang dari total tagihan.');
            }

            $order = Order::query()->create([
                'table_id' => $table->id,
                'kasir_id' => $request->user()->id,
                'order_type' => 'dine_in',
                'status' => 'open',
                'notes' => $validated['notes'] ?? null,
                'subtotal' => $subtotal,
                'service_charge_amount' => $serviceChargeAmount,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
            ]);

            $table->update(['status' => 'open_bill']);

            foreach ($validated['items'] as $item) {
                $this->createOrderItem($order, $menuItems[$item['menu_item_id']], $item);
            }

            return $order;
        });
    }

    /**
     * @param  list<array{menu_item_id: int, quantity: int, notes?: string|null}>  $items
     */
    private function appendItems(Order $order, array $items): void
    {
        DB::transaction(function () use ($order, $items): void {
            $order = Order::query()
                ->with('table')
                ->lockForUpdate()
                ->findOrFail($order->id);

            if (! in_array($order->status, ['open', 'submitted'], true)) {
                throw new RuntimeException('Order ini sudah tidak bisa ditambah item.');
            }

            $menuItems = MenuItem::query()
                ->whereIn('id', collect($items)->pluck('menu_item_id'))
                ->get()
                ->keyBy('id');

            foreach ($items as $item) {
                $this->createOrderItem($order, $menuItems[$item['menu_item_id']], $item);
            }

            $subtotal = (float) $order->items()
                ->where('status', '!=', 'cancelled')
                ->sum('subtotal');

            $restaurant = \App\Models\Restaurant::find($order->table->restaurant_id);
            $serviceChargeAmount = $restaurant && $restaurant->service_charge_is_active
                ? $subtotal * ($restaurant->service_charge_percentage / 100)
                : 0;
            $taxAmount = $restaurant && $restaurant->tax_is_active
                ? ($subtotal + $serviceChargeAmount) * ($restaurant->tax_percentage / 100)
                : 0;
            $totalAmount = $subtotal + $serviceChargeAmount + $taxAmount;

            $order->update([
                'subtotal' => $subtotal,
                'service_charge_amount' => $serviceChargeAmount,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
            ]);

            $order->table?->update(['status' => 'open_bill']);
        });
    }

    private function createOrderItem(Order $order, MenuItem $menuItem, array $item): void
    {
        $quantity = (int) $item['quantity'];
        
        $addonPrice = 0;
        $addonsData = null;
        
        if (!empty($item['addons'])) {
            $selectedAddons = \App\Models\MenuItemAddon::query()
                ->whereIn('id', $item['addons'])
                ->where('menu_item_id', $menuItem->id)
                ->where('is_active', true)
                ->get(['id', 'name', 'price']);
                
            $addonPrice = $selectedAddons->sum('price');
            $addonsData = $selectedAddons->map(fn($a) => [
                'id' => $a->id,
                'name' => $a->name,
                'price' => (float) $a->price
            ])->toArray();
        }
        
        $unitPrice = (float) $menuItem->price + $addonPrice;

        $order->items()->create([
            'menu_item_id' => $menuItem->id,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'subtotal' => $unitPrice * $quantity,
            'notes' => $item['notes'] ?? null,
            'addons' => $addonsData,
            'status' => 'pending',
        ]);
    }
}
