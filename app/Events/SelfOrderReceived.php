<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SelfOrderReceived implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    public function __construct(public Order $order, public int $kasirId) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('pos.'.$this->kasirId)];
    }

    public function broadcastAs(): string
    {
        return 'SelfOrderReceived';
    }

    public function broadcastWith(): array
    {
        return [
            'order_id' => $this->order->id,
            'table_id' => $this->order->table_id,
            'total_amount' => $this->order->total_amount,
        ];
    }
}
