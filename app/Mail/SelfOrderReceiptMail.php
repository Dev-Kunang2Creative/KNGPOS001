<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\SelfOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SelfOrderReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Order $order,
        public SelfOrder $selfOrder,
    ) {}

    public function build(): self
    {
        return $this
            ->subject('Struk Pembayaran Karcisqu POS #'.$this->order->id)
            ->view('emails.self-order-receipt');
    }
}
