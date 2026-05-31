<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\CashPaymentRequest;
use App\Http\Requests\Pos\XenditPaymentRequest;
use App\Models\Order;
use App\Services\PaymentService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
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
        } catch (RequestException) {
            return back()->with('error', 'Gagal membuat pembayaran Xendit.');
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()
            ->route('pos.index', ['order' => $order->id, 'payment' => $result['payment']->id])
            ->with('success', 'QRIS Xendit berhasil dibuat.');
    }
}
