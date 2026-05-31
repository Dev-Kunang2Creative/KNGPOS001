<?php

namespace App\Services;

use App\Models\Order;
use App\Models\SystemSettings;
use App\Models\Transaction;
use App\Models\User;
use App\Models\XenditPayment;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class PaymentService
{
    public function createCashPayment(Order $order, User $cashier, float $amountPaid, ?string $notes = null): Transaction
    {
        return DB::transaction(function () use ($order, $cashier, $amountPaid, $notes): Transaction {
            $total = $this->calculateOrderTotal($order);

            if ($amountPaid < $total) {
                throw new RuntimeException('Nominal bayar kurang dari total order.');
            }

            $transaction = Transaction::query()->create([
                'order_id' => $order->id,
                'kasir_id' => $cashier->id,
                'payment_method' => 'cash',
                'amount_paid' => $amountPaid,
                'change_amount' => $amountPaid - $total,
                'status' => 'paid',
                'notes' => $notes,
                'paid_at' => now(),
            ]);

            $order->update([
                'subtotal' => $total,
                'total_amount' => $total,
                'status' => 'paid',
            ]);

            $order->table()->update(['status' => 'occupied']);

            return $transaction;
        });
    }

    /**
     * @return array{transaction: Transaction, payment: XenditPayment, response: array<string, mixed>}
     *
     * @throws RequestException
     */
    public function createQrisPayment(Order $order, User $cashier): array
    {
        $secretKey = SystemSettings::get('xendit_secret_key');

        if (! $secretKey || SystemSettings::get('xendit_enabled') !== '1') {
            throw new RuntimeException('Xendit belum dikonfigurasi.');
        }

        $total = $this->calculateOrderTotal($order);
        $externalId = 'karcisqu-'.$order->id.'-'.now()->timestamp.'-'.Str::lower(Str::random(6));

        return DB::transaction(function () use ($order, $cashier, $total, $externalId, $secretKey): array {
            $transaction = Transaction::query()->create([
                'order_id' => $order->id,
                'kasir_id' => $cashier->id,
                'payment_method' => 'qris',
                'amount_paid' => $total,
                'change_amount' => 0,
                'status' => 'pending',
                'notes' => 'Xendit QRIS',
            ]);

            $response = Http::withBasicAuth($secretKey, '')
                ->withHeaders([
                    'api-version' => '2022-07-31',
                    'Content-Type' => 'application/json',
                ])
                ->post('https://api.xendit.co/qr_codes', [
                    'reference_id' => $externalId,
                    'type' => 'DYNAMIC',
                    'currency' => 'IDR',
                    'amount' => (int) round($total),
                    'expires_at' => now()->addHours(2)->toIso8601String(),
                    'metadata' => [
                        'order_id' => $order->id,
                        'transaction_id' => $transaction->id,
                    ],
                ])
                ->throw()
                ->json();

            $payment = XenditPayment::query()->create([
                'transaction_id' => $transaction->id,
                'external_id' => $externalId,
                'xendit_invoice_id' => $response['id'] ?? null,
                'payment_method' => 'qris',
                'amount' => $total,
                'status' => $response['status'] ?? 'pending',
                'xendit_raw_response' => $response,
            ]);

            return [
                'transaction' => $transaction,
                'payment' => $payment,
                'response' => $response,
            ];
        });
    }

    public function markXenditPaymentPaid(string $externalId, array $payload): ?XenditPayment
    {
        return DB::transaction(function () use ($externalId, $payload): ?XenditPayment {
            $payment = XenditPayment::query()
                ->where('external_id', $externalId)
                ->lockForUpdate()
                ->first();

            if (! $payment) {
                return null;
            }

            if (strtolower((string) $payment->status) === 'paid') {
                return $payment;
            }

            $transaction = Transaction::query()->lockForUpdate()->findOrFail($payment->transaction_id);
            $order = Order::query()->lockForUpdate()->findOrFail($transaction->order_id);

            $payment->update([
                'status' => 'paid',
                'xendit_raw_response' => $payload,
            ]);

            $transaction->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);

            $order->update(['status' => 'paid']);
            $order->table()->update(['status' => 'occupied']);

            return $payment;
        });
    }

    /**
     * @return array<string, mixed>
     *
     * @throws RequestException
     */
    public function simulateQrisPayment(XenditPayment $payment): array
    {
        $secretKey = SystemSettings::get('xendit_secret_key');

        if (! $secretKey || SystemSettings::get('xendit_enabled') !== '1') {
            throw new RuntimeException('Xendit belum dikonfigurasi.');
        }

        if (! str_starts_with((string) $secretKey, 'xnd_development_')) {
            throw new RuntimeException('Simulasi pembayaran hanya tersedia untuk Xendit Test Mode.');
        }

        $qrCodeIdentifier = $payment->xendit_invoice_id ?: $payment->external_id;

        return Http::withBasicAuth($secretKey, '')
            ->withHeaders([
                'api-version' => '2022-07-31',
                'Content-Type' => 'application/json',
            ])
            ->post("https://api.xendit.co/qr_codes/{$qrCodeIdentifier}/payments/simulate", [
                'amount' => (int) round((float) $payment->amount),
            ])
            ->throw()
            ->json();
    }

    public function calculateOrderTotal(Order $order): float
    {
        $order->loadMissing('items');

        return (float) $order->items
            ->where('status', '!=', 'cancelled')
            ->sum(fn ($item) => (float) $item->subtotal);
    }
}
