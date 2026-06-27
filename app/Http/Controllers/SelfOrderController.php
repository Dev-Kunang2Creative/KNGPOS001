<?php

namespace App\Http\Controllers;

use App\Http\Requests\SelfOrder\CheckoutRequest;
use App\Models\MenuCategory;
use App\Models\SelfOrder;
use App\Models\TableQrcode;
use App\Models\XenditPayment;
use App\Services\OrderRoutingService;
use App\Services\PaymentService;
use App\Services\RestaurantContext;
use App\Services\SelfOrderService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class SelfOrderController extends Controller
{
    public function show(string $qrToken): Response
    {
        $qrCode = $this->activeQrCode($qrToken);
        $this->setRestaurantFromQr($qrCode);

        return Inertia::render('SelfOrder/Show', [
            'qrToken' => $qrToken,
            'table' => $qrCode->table()->with('zone:id,name,color_hex')->first(),
            'categories' => $this->menuCategories(),
            'restaurant' => [
                'name' => app(RestaurantContext::class)->restaurant()?->name ?? 'Restoran',
                'tax_percentage' => app(RestaurantContext::class)->restaurant()?->tax_percentage ?? 0,
                'tax_is_active' => app(RestaurantContext::class)->restaurant()?->tax_is_active ?? false,
                'service_charge_percentage' => app(RestaurantContext::class)->restaurant()?->service_charge_percentage ?? 0,
                'service_charge_is_active' => app(RestaurantContext::class)->restaurant()?->service_charge_is_active ?? false,
            ],
        ]);
    }

    public function menu(string $qrToken): array
    {
        $qrCode = $this->activeQrCode($qrToken);
        $this->setRestaurantFromQr($qrCode);

        return ['categories' => $this->menuCategories()];
    }

    public function checkout(CheckoutRequest $request, string $qrToken, SelfOrderService $selfOrderService, PaymentService $paymentService, OrderRoutingService $routingService): RedirectResponse
    {
        $qrCode = $this->activeQrCode($qrToken);
        $this->setRestaurantFromQr($qrCode);

        $validated = $request->validated();

        $billType = $validated['bill_type'] ?? null;
        if ($billType) {
            $prefix = $billType === 'open' ? '[Open Bill]' : '[Close Bill]';
            $validated['notes'] = ! empty($validated['notes'])
                ? "{$prefix} {$validated['notes']}"
                : $prefix;
        }

        try {
            if ($validated['payment_preference'] === 'qris') {
                $result = $selfOrderService->submitQris($qrCode, $validated, $paymentService);
                $selfOrder = $result['self_order'];
            } elseif ($validated['payment_preference'] === 'online') {
                $result = $selfOrderService->submitOnline(
                    $qrCode,
                    $validated,
                    $paymentService,
                    fn (SelfOrder $so) => route('self-order.status', ['qr_token' => $qrToken, 'selfOrder' => $so->id]),
                );
                $selfOrder = $result['self_order'];
            } elseif ($billType === 'open') {
                $result = $selfOrderService->submitOpenBill($qrCode, $validated, $routingService);
                $selfOrder = $result['self_order'];
            } else {
                $selfOrder = $selfOrderService->submit($qrCode, $validated);
            }
        } catch (RequestException $exception) {
            Log::error('Self-order Xendit Request Error', [
                'response' => $exception->response->json(),
                'status' => $exception->response->status(),
            ]);
            $errorMessage = $exception->response->json('message') ?? 'Terjadi kesalahan pada API Xendit';

            return back()->with('error', 'Gagal membuat QRIS: '.(is_array($errorMessage) ? json_encode($errorMessage) : $errorMessage));
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()->route('self-order.status', [
            'qr_token' => $qrToken,
            'selfOrder' => $selfOrder->id,
        ]);
    }

    public function status(string $qrToken, SelfOrder $selfOrder): Response
    {
        $qrCode = $this->activeQrCode($qrToken);
        $this->setRestaurantFromQr($qrCode);

        abort_unless($selfOrder->table_qrcode_id === $qrCode->id, 404);

        return Inertia::render('SelfOrder/Status', [
            'qrToken' => $qrToken,
            'selfOrder' => $selfOrder->load(['table:id,name', 'items.menuItem:id,name']),
            'payment' => $selfOrder->order_id
                ? XenditPayment::query()
                    ->whereHas('transaction', fn ($query) => $query->where('order_id', $selfOrder->order_id))
                    ->latest()
                    ->first()
                : null,
            'restaurant' => [
                'name' => app(RestaurantContext::class)->restaurant()?->name ?? 'Restoran',
            ],
        ]);
    }

    public function simulatePayment(
        string $qrToken,
        SelfOrder $selfOrder,
        XenditPayment $payment,
        PaymentService $paymentService,
        OrderRoutingService $routingService,
    ): RedirectResponse {
        $qrCode = $this->activeQrCode($qrToken);
        $this->setRestaurantFromQr($qrCode);

        abort_unless($selfOrder->table_qrcode_id === $qrCode->id, 404);
        abort_unless($selfOrder->order_id && $payment->transaction?->order_id === $selfOrder->order_id, 404);

        try {
            $response = $paymentService->simulateQrisPayment($payment);

            $payload = array_merge($response, [
                'reference_id' => $payment->external_id,
                'status' => $response['status'] ?? 'SUCCEEDED',
            ]);

            $paymentService->markXenditPaymentPaid($payment->external_id, $payload, $routingService);
        } catch (RequestException $exception) {
            Log::error('Self-order Xendit QRIS Simulation Error', [
                'response' => $exception->response->json(),
                'status' => $exception->response->status(),
            ]);
            $errorMessage = $exception->response->json('message') ?? 'Terjadi kesalahan pada API simulasi Xendit';

            return back()->with('error', 'Gagal simulasi pembayaran QRIS: '.(is_array($errorMessage) ? json_encode($errorMessage) : $errorMessage));
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()
            ->route('self-order.status', ['qr_token' => $qrToken, 'selfOrder' => $selfOrder->id])
            ->with('success', 'Simulasi pembayaran QRIS berhasil.');
    }

    /**
     * Confirm an online (Xendit Invoice) payment by querying Xendit.
     * Used by the status page poll / "Cek status" button so payment is
     * confirmed even without a publicly reachable webhook.
     */
    public function refreshPayment(string $qrToken, SelfOrder $selfOrder, PaymentService $paymentService, OrderRoutingService $routingService): RedirectResponse
    {
        $qrCode = $this->activeQrCode($qrToken);
        $this->setRestaurantFromQr($qrCode);

        abort_unless($selfOrder->table_qrcode_id === $qrCode->id, 404);

        $payment = $selfOrder->order_id
            ? XenditPayment::query()
                ->whereHas('transaction', fn ($query) => $query->where('order_id', $selfOrder->order_id))
                ->latest()
                ->first()
            : null;

        if ($payment) {
            try {
                $paymentService->refreshInvoiceStatus($payment, $routingService);
            } catch (RequestException $exception) {
                Log::error('Self-order Xendit Invoice Refresh Error', [
                    'response' => $exception->response->json(),
                    'status' => $exception->response->status(),
                ]);
            } catch (RuntimeException $exception) {
                return back()->with('error', $exception->getMessage());
            }
        }

        return redirect()->route('self-order.status', ['qr_token' => $qrToken, 'selfOrder' => $selfOrder->id]);
    }

    /**
     * Set the restaurant context from the QR code's table restaurant_id.
     * Self-order routes don't go through CheckRestaurantAccess middleware,
     * so we must set the context manually from the table's restaurant.
     */
    private function setRestaurantFromQr(TableQrcode $qrCode): void
    {
        $restaurantId = $qrCode->table?->restaurant_id;
        if ($restaurantId) {
            app(RestaurantContext::class)->set($restaurantId);
        }
    }

    private function activeQrCode(string $qrToken): TableQrcode
    {
        return TableQrcode::query()
            ->with('table')
            ->where('qr_token', $qrToken)
            ->where('is_active', true)
            ->firstOrFail();
    }

    private function menuCategories()
    {
        return MenuCategory::query()
            ->with(['activeItems' => fn ($query) => $query
                ->with(['addons' => fn ($q) => $q->orderBy('id')])
                ->where('is_available', true)
                ->orderBy('sort_order')
                ->select(['id', 'category_id', 'name', 'description', 'price', 'print_to', 'image_path', 'restaurant_id'])])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'description', 'restaurant_id']);
    }
}
