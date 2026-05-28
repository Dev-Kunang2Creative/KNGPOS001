<?php

namespace App\Http\Controllers;

use App\Http\Requests\SelfOrder\CheckoutRequest;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Shift;
use App\Models\TableQrcode;
use App\Models\XenditPayment;
use App\Services\PaymentService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class SelfOrderController extends Controller
{
    public function show(string $qrToken): Response
    {
        $qrCode = $this->activeQrCode($qrToken);

        return Inertia::render('SelfOrder/Show', [
            'qrToken' => $qrToken,
            'table' => $qrCode->table()->with('zone:id,name,color_hex')->first(),
            'categories' => $this->menuCategories(),
        ]);
    }

    public function menu(string $qrToken): array
    {
        $this->activeQrCode($qrToken);

        return ['categories' => $this->menuCategories()];
    }

    public function checkout(CheckoutRequest $request, string $qrToken, PaymentService $paymentService): RedirectResponse
    {
        $qrCode = $this->activeQrCode($qrToken);
        $cashier = Shift::query()
            ->with('cashier')
            ->where('status', 'open')
            ->latest('opened_at')
            ->first()?->cashier;

        if (! $cashier) {
            return back()->with('error', 'Kasir aktif belum tersedia.');
        }

        $validated = $request->validated();
        $order = DB::transaction(function () use ($qrCode, $validated): Order {
            $menuItems = MenuItem::query()
                ->where('is_available', true)
                ->whereIn('id', collect($validated['items'])->pluck('menu_item_id'))
                ->get()
                ->keyBy('id');

            if ($menuItems->count() !== collect($validated['items'])->pluck('menu_item_id')->unique()->count()) {
                throw new RuntimeException('Menu tidak tersedia.');
            }

            $subtotal = collect($validated['items'])->sum(fn (array $item): float => (float) $menuItems[$item['menu_item_id']]->price * (int) $item['quantity']);

            $order = Order::query()->create([
                'table_id' => $qrCode->table_id,
                'kasir_id' => null,
                'order_type' => 'self_order',
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

        try {
            $result = $paymentService->createQrisPayment($order, $cashier);
        } catch (RequestException) {
            return back()->with('error', 'Gagal membuat pembayaran Xendit.');
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()->route('self-order.status', [
            'qr_token' => $qrToken,
            'order' => $order->id,
            'payment' => $result['payment']->id,
        ]);
    }

    public function status(string $qrToken, Order $order): Response
    {
        $this->activeQrCode($qrToken);

        abort_unless($order->order_type === 'self_order', 404);

        return Inertia::render('SelfOrder/Status', [
            'qrToken' => $qrToken,
            'order' => $order->load('items.menuItem:id,name'),
            'payment' => request('payment')
                ? XenditPayment::query()->find(request('payment'))
                : XenditPayment::query()
                    ->whereHas('transaction', fn ($query) => $query->where('order_id', $order->id))
                    ->latest()
                    ->first(),
        ]);
    }

    private function activeQrCode(string $qrToken): TableQrcode
    {
        return TableQrcode::query()
            ->where('qr_token', $qrToken)
            ->where('is_active', true)
            ->firstOrFail();
    }

    private function menuCategories()
    {
        return MenuCategory::query()
            ->with(['activeItems' => fn ($query) => $query
                ->where('is_available', true)
                ->orderBy('sort_order')
                ->select(['id', 'category_id', 'name', 'description', 'price', 'print_to'])])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'description']);
    }
}
