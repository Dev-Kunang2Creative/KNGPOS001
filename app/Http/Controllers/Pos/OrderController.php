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
                ->where('payment_preference', 'qris')
                ->whereHas('order.transaction', fn ($query) => $query
                    ->where('payment_method', 'qris')
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

        $transaction->load([
            'cashier:id,name',
            'order.table.zone:id,name',
            'order.items.menuItem:id,name,print_to',
        ]);

        return Inertia::render('Pos/Receipt', [
            'transaction' => $transaction,
        ]);
    }

    public function stationTicket(Request $request, Order $order): Response
    {
        abort_unless(
            $order->kasir_id === $request->user()->id
                || ($order->kasir_id === null && $order->order_type === 'self_order'),
            403
        );

        $order->load(['table.zone:id,name', 'cashier:id,name']);
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
        ]);
    }

    private function stationTicketsQuery(bool $printed): array
    {
        $kitchenTickets = KitchenOrder::query()
            ->with(['order.table.zone:id,name', 'station:id,name'])
            ->whereHas('order', fn ($query) => $query->where('order_type', 'self_order'))
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
            ->whereHas('order', fn ($query) => $query->where('order_type', 'self_order'))
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
            $routingService->routeOrder($order);
            $paymentMethod = $validated['payment_method'] ?? 'cash';

            if ($paymentMethod === 'qris') {
                $result = $paymentService->createQrisPayment($order->fresh('items'), $request->user());

                return redirect()
                    ->route('pos.xendit.show', $result['payment'])
                    ->with('success', 'Close bill QRIS Xendit berhasil dibuat.');
            }

            $transaction = $paymentService->createCashPayment(
                order: $order->fresh('items'),
                cashier: $request->user(),
                amountPaid: (float) ($validated['amount_paid'] ?? 0),
                notes: 'Close bill POS',
            );
        } catch (RequestException $exception) {
            Log::error('Close Bill Xendit Request Error', [
                'response' => $exception->response->json(),
                'status' => $exception->response->status(),
            ]);
            $errorMessage = $exception->response->json('message') ?? 'Terjadi kesalahan pada API Xendit';

            return back()->with('error', 'Gagal membuat pembayaran Xendit: ' . (is_array($errorMessage) ? json_encode($errorMessage) : $errorMessage));
        } catch (ZoneStationAssignmentMissingException|RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()
            ->route('pos.transactions.receipt', $transaction)
            ->with('success', 'Close bill berhasil. Struk siap dicetak.');
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

    /**
     * @param  array{kitchen_order: mixed, bar_order: mixed}  $result
     */
    private function redirectToStationTicket(Order $order, array $result): RedirectResponse
    {
        $routeParams = ['order' => $order->id];

        if ($result['kitchen_order']) {
            $routeParams['kitchen_order'] = $result['kitchen_order']->id;
        }

        if ($result['bar_order']) {
            $routeParams['bar_order'] = $result['bar_order']->id;
        }

        if ($result['payment'] ?? null) {
            $routeParams['payment'] = $result['payment']->id;
        }

        if (! $result['kitchen_order'] && ! $result['bar_order']) {
            return redirect()
                ->route('pos.index', ['order' => $order->id])
                ->with('success', 'Order berhasil disubmit. Tidak ada item baru untuk Kitchen/Bar.');
        }

        return redirect()
            ->route('pos.orders.station-ticket', $routeParams)
            ->with('success', 'Order berhasil dikirim ke station. Struk kitchen/bar siap dicetak.');
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
                return (float) $menuItems[$item['menu_item_id']]->price * (int) $item['quantity'];
            });

            $paymentMethod = $validated['payment_method'] ?? 'cash';

            if (($validated['bill_mode'] ?? 'open_bill') === 'close_bill' && $paymentMethod === 'cash' && (float) ($validated['amount_paid'] ?? 0) < $subtotal) {
                throw new RuntimeException('Uang pelanggan kurang dari total tagihan.');
            }

            $order = Order::query()->create([
                'table_id' => $table->id,
                'kasir_id' => $request->user()->id,
                'order_type' => 'dine_in',
                'status' => 'open',
                'notes' => $validated['notes'] ?? null,
                'subtotal' => $subtotal,
                'total_amount' => $subtotal,
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

            $total = (float) $order->items()
                ->where('status', '!=', 'cancelled')
                ->sum('subtotal');

            $order->update([
                'subtotal' => $total,
                'total_amount' => $total,
            ]);

            $order->table?->update(['status' => 'open_bill']);
        });
    }

    private function createOrderItem(Order $order, MenuItem $menuItem, array $item): void
    {
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
}
