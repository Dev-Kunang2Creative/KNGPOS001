<?php

namespace App\Http\Controllers;

use App\Http\Requests\SelfOrder\CheckoutRequest;
use App\Models\MenuCategory;
use App\Models\SelfOrder;
use App\Models\TableQrcode;
use App\Models\XenditPayment;
use App\Services\OrderRoutingService;
use App\Services\PaymentService;
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

    public function checkout(CheckoutRequest $request, string $qrToken, SelfOrderService $selfOrderService, PaymentService $paymentService): RedirectResponse
    {
        $qrCode = $this->activeQrCode($qrToken);
        $validated = $request->validated();

        try {
            if ($validated['payment_preference'] === 'qris') {
                $result = $selfOrderService->submitQris($qrCode, $validated, $paymentService);
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

            return back()->with('error', 'Gagal membuat QRIS: ' . (is_array($errorMessage) ? json_encode($errorMessage) : $errorMessage));
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

            return back()->with('error', 'Gagal simulasi pembayaran QRIS: ' . (is_array($errorMessage) ? json_encode($errorMessage) : $errorMessage));
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()
            ->route('self-order.status', ['qr_token' => $qrToken, 'selfOrder' => $selfOrder->id])
            ->with('success', 'Simulasi pembayaran QRIS berhasil.');
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
                ->where('is_available', true)
                ->orderBy('sort_order')
                ->select(['id', 'category_id', 'name', 'description', 'price', 'print_to', 'image_path'])])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'description']);
    }
}
