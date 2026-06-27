<?php

namespace App\Jobs;

use App\Mail\SelfOrderReceiptMail;
use App\Models\Order;
use App\Models\SelfOrder;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendSelfOrderReceiptEmail implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $orderId) {}

    public function handle(): void
    {
        $selfOrder = SelfOrder::query()
            ->where('order_id', $this->orderId)
            ->whereNotNull('customer_email')
            ->whereNull('receipt_emailed_at')
            ->first();

        if (! $selfOrder) {
            return;
        }

        $order = Order::query()
            ->with(['table.zone', 'items.menuItem', 'transaction.cashier'])
            ->find($this->orderId);

        if (! $order || $order->status !== 'paid' || ! $order->transaction || $order->transaction->status !== 'paid') {
            return;
        }

        Mail::to($selfOrder->customer_email)->send(new SelfOrderReceiptMail($order, $selfOrder));

        $selfOrder->update(['receipt_emailed_at' => now()]);
    }
}
