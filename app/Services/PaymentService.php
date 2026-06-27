<?php

namespace App\Services;

use App\Jobs\SendSelfOrderReceiptEmail;
use App\Models\Order;
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
            $details = $this->calculateOrderTotals($order);

            if ($amountPaid < $details['total']) {
                throw new RuntimeException('Nominal bayar kurang dari total order.');
            }

            $transaction = Transaction::query()->create([
                'order_id' => $order->id,
                'kasir_id' => $cashier->id,
                'payment_method' => 'cash',
                'amount_paid' => $amountPaid,
                'change_amount' => $amountPaid - $details['total'],
                'status' => 'paid',
                'notes' => $notes,
                'paid_at' => now(),
            ]);

            $order->update([
                'subtotal' => $details['subtotal'],
                'service_charge_amount' => $details['service_charge'],
                'tax_amount' => $details['tax'],
                'total_amount' => $details['total'],
                'status' => 'paid',
            ]);

            $order->table()->update(['status' => 'occupied']);

            DB::afterCommit(fn () => SendSelfOrderReceiptEmail::dispatch($order->id));

            return $transaction;
        });
    }

    /**
     * @return array{transaction: Transaction, payment: XenditPayment, response: array<string, mixed>}
     *
     * @throws RequestException
     */
    public function createQrisPayment(Order $order, ?User $cashier = null, ?string $notes = null): array
    {
        $secretKey = config('services.xendit.secret_key');

        if (! $secretKey || ! config('services.xendit.enabled')) {
            throw new RuntimeException('Xendit belum dikonfigurasi.');
        }

        $total = $this->calculateOrderTotal($order);
        $externalId = 'karcisqu-'.$order->id.'-'.now()->timestamp.'-'.Str::lower(Str::random(6));

        return DB::transaction(function () use ($order, $cashier, $total, $externalId, $secretKey, $notes): array {
            $transaction = Transaction::query()->create([
                'order_id' => $order->id,
                'kasir_id' => $cashier?->id,
                'payment_method' => 'qris',
                'amount_paid' => $total,
                'change_amount' => 0,
                'status' => 'pending',
                'notes' => $notes ?? 'Xendit QRIS',
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

    /**
     * Create a Xendit hosted Invoice supporting all payment methods enabled on
     * the account (QRIS, e-wallet, virtual account, card, paylater). The customer
     * picks the method on Xendit's hosted page; status is confirmed by querying
     * the invoice (see refreshInvoiceStatus) or via webhook.
     *
     * @return array{transaction: Transaction, payment: XenditPayment, response: array<string, mixed>, invoice_url: string}
     *
     * @throws RequestException
     */
    public function createInvoicePayment(Order $order, string $successRedirectUrl, ?string $payerEmail = null, ?User $cashier = null, ?string $notes = null): array
    {
        $secretKey = config('services.xendit.secret_key');

        if (! $secretKey || ! config('services.xendit.enabled')) {
            throw new RuntimeException('Xendit belum dikonfigurasi.');
        }

        $total = $this->calculateOrderTotal($order);
        $externalId = 'karcisqu-'.$order->id.'-'.now()->timestamp.'-'.Str::lower(Str::random(6));

        return DB::transaction(function () use ($order, $cashier, $total, $externalId, $secretKey, $notes, $successRedirectUrl, $payerEmail): array {
            $transaction = Transaction::query()->create([
                'order_id' => $order->id,
                'kasir_id' => $cashier?->id,
                'payment_method' => 'xendit',
                'amount_paid' => $total,
                'change_amount' => 0,
                'status' => 'pending',
                'notes' => $notes ?? 'Xendit Invoice',
            ]);

            $response = Http::withBasicAuth($secretKey, '')
                ->post('https://api.xendit.co/v2/invoices', [
                    'external_id' => $externalId,
                    'amount' => (int) round($total),
                    'currency' => 'IDR',
                    'description' => 'Self-order #'.$order->id,
                    'payer_email' => $payerEmail ?: 'guest@karcisqu.test',
                    'success_redirect_url' => $successRedirectUrl,
                    'invoice_duration' => 7200,
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
                'payment_method' => 'invoice',
                'amount' => $total,
                'status' => $response['status'] ?? 'pending',
                'xendit_raw_response' => $response,
            ]);

            return [
                'transaction' => $transaction,
                'payment' => $payment,
                'response' => $response,
                'invoice_url' => $response['invoice_url'] ?? '',
            ];
        });
    }

    /**
     * Query a Xendit invoice and mark the payment paid if it has settled.
     * Lets us confirm payment without a publicly reachable webhook.
     *
     * @throws RequestException
     */
    public function refreshInvoiceStatus(XenditPayment $payment, ?OrderRoutingService $routingService = null): ?XenditPayment
    {
        $secretKey = config('services.xendit.secret_key');

        if (! $secretKey || ! config('services.xendit.enabled')) {
            throw new RuntimeException('Xendit belum dikonfigurasi.');
        }

        if (strtolower((string) $payment->status) === 'paid') {
            return $payment;
        }

        $invoiceId = $payment->xendit_invoice_id ?: $payment->external_id;

        $response = Http::withBasicAuth($secretKey, '')
            ->get("https://api.xendit.co/v2/invoices/{$invoiceId}")
            ->throw()
            ->json();

        $status = strtoupper((string) ($response['status'] ?? ''));

        if (in_array($status, ['PAID', 'SETTLED', 'COMPLETED'], true)) {
            return $this->markXenditPaymentPaid($payment->external_id, $response, $routingService);
        }

        $payment->update(['status' => $response['status'] ?? $payment->status, 'xendit_raw_response' => $response]);

        return $payment->fresh();
    }

    public function markXenditPaymentPaid(string $externalId, array $payload, ?OrderRoutingService $routingService = null): ?XenditPayment
    {
        return DB::transaction(function () use ($externalId, $payload, $routingService): ?XenditPayment {
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

            if ($order->order_type === 'self_order') {
                $order->selfOrder()->update([
                    'status' => 'converted_to_order',
                    'approved_at' => now(),
                ]);
            }

            if ($routingService && $order->items()->where('status', 'pending')->exists()) {
                $routingService->routeOrder($order->fresh(['table', 'items.menuItem']));
            }

            DB::afterCommit(fn () => SendSelfOrderReceiptEmail::dispatch($order->id));

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
        $secretKey = config('services.xendit.secret_key');

        if (! $secretKey || ! config('services.xendit.enabled')) {
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

    public function calculateOrderTotals(Order $order): array
    {
        $order->loadMissing(['items', 'table']);

        $subtotal = (float) $order->items
            ->where('status', '!=', 'cancelled')
            ->sum(fn ($item) => (float) $item->subtotal);

        $restaurant = \App\Models\Restaurant::find($order->table->restaurant_id);
        
        $serviceChargeAmount = $restaurant && $restaurant->service_charge_is_active
            ? $subtotal * ($restaurant->service_charge_percentage / 100)
            : 0;
            
        $taxAmount = $restaurant && $restaurant->tax_is_active
            ? ($subtotal + $serviceChargeAmount) * ($restaurant->tax_percentage / 100)
            : 0;
            
        $totalAmount = $subtotal + $serviceChargeAmount + $taxAmount;

        return [
            'subtotal' => $subtotal,
            'service_charge' => $serviceChargeAmount,
            'tax' => $taxAmount,
            'total' => $totalAmount,
        ];
    }

    public function calculateOrderTotal(Order $order): float
    {
        return $this->calculateOrderTotals($order)['total'];
    }
}
