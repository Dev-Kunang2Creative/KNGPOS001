<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\CashPaymentRequest;
use App\Http\Requests\Pos\XenditPaymentRequest;
use App\Models\Order;
use App\Models\XenditPayment;
use App\Services\PaymentService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class PaymentController extends Controller
{
    public function cash(CashPaymentRequest $request, Order $order, PaymentService $paymentService): RedirectResponse
    {
        abort_unless($order->kasir_id === $request->user()->id && $order->status === 'submitted', 403);

        try {
            if ($order->items()->where('status', 'pending')->exists()) {
                throw new RuntimeException('Masih ada item baru yang belum dicetak ke Kitchen/Bar.');
            }

            $transaction = $paymentService->createCashPayment(
                order: $order,
                cashier: $request->user(),
                amountPaid: (float) $request->validated('amount_paid'),
                notes: $request->validated('notes')
            );
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()
            ->route('pos.transactions.receipt', $transaction)
            ->with('success', 'Pembayaran tunai berhasil. Struk siap dicetak.');
    }

    public function xendit(XenditPaymentRequest $request, Order $order, PaymentService $paymentService): RedirectResponse
    {
        abort_unless($order->kasir_id === $request->user()->id && $order->status === 'submitted', 403);

        try {
            if ($order->items()->where('status', 'pending')->exists()) {
                throw new RuntimeException('Masih ada item baru yang belum dicetak ke Kitchen/Bar.');
            }

            $result = $paymentService->createQrisPayment($order, $request->user());
        } catch (RequestException $exception) {
            Log::error('Xendit Request Error', [
                'response' => $exception->response->json(),
                'status' => $exception->response->status(),
            ]);
            $errorMessage = $exception->response->json('message') ?? 'Terjadi kesalahan pada API Xendit';

            return back()->with('error', 'Gagal membuat pembayaran Xendit: '.(is_array($errorMessage) ? json_encode($errorMessage) : $errorMessage));
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()
            ->route('pos.index', ['order' => $order->id, 'payment' => $result['payment']->id])
            ->with('success', 'QRIS Xendit berhasil dibuat.');
    }

    public function show(XenditPayment $payment): Response|RedirectResponse
    {
        $payment->load([
            'transaction.order.table:id,name',
        ]);

        abort_unless($payment->transaction?->kasir_id === request()->user()->id, 403);

        if (strtolower((string) $payment->status) === 'paid') {
            return redirect()->route('pos.xendit.success', $payment);
        }

        return Inertia::render('Pos/PaymentPending', [
            'payment' => $payment,
            'transaction' => $payment->transaction,
            'order' => $payment->transaction->order,
        ]);
    }

    public function simulateXendit(Order $order, XenditPayment $payment, PaymentService $paymentService): RedirectResponse
    {
        abort_unless($order->kasir_id === request()->user()->id && $payment->transaction?->order_id === $order->id, 403);

        $backToStation = request()->boolean('back_to_station');

        try {
            $response = $paymentService->simulateQrisPayment($payment);

            $payload = array_merge($response, [
                'reference_id' => $payment->external_id,
                'status' => $response['status'] ?? 'SUCCEEDED',
            ]);

            $paidPayment = $paymentService->markXenditPaymentPaid($payment->external_id, $payload);
        } catch (RequestException $exception) {
            Log::error('Xendit QRIS Simulation Error', [
                'response' => $exception->response->json(),
                'status' => $exception->response->status(),
            ]);
            $errorMessage = $exception->response->json('message') ?? 'Terjadi kesalahan pada API simulasi Xendit';

            return back()->with('error', 'Gagal simulasi pembayaran Xendit: '.(is_array($errorMessage) ? json_encode($errorMessage) : $errorMessage));
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        if ($backToStation && $paidPayment) {
            $routeParams = [
                'order' => $order->id,
                'receipt' => $paidPayment->transaction_id,
                'payment' => $paidPayment->id,
            ];

            return redirect()
                ->route('pos.orders.station-ticket', $routeParams)
                ->with('success', 'Pembayaran QRIS berhasil. Silakan cetak struk.');
        }

        return redirect()
            ->route('pos.xendit.success', $paidPayment)
            ->with('success', 'Simulasi pembayaran QRIS berhasil.');
    }

    public function success(XenditPayment $payment): Response
    {
        $payment->load([
            'transaction.order.table:id,name',
            'transaction.cashier:id,name',
        ]);

        abort_unless($payment->transaction?->kasir_id === request()->user()->id, 403);
        abort_unless(strtolower((string) $payment->status) === 'paid' && $payment->transaction->status === 'paid', 404);

        return Inertia::render('Pos/PaymentSuccess', [
            'payment' => $payment,
            'transaction' => $payment->transaction,
            'redirectSeconds' => 3,
        ]);
    }
}
