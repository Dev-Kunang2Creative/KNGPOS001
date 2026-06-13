<?php

namespace Tests\Feature\Pos;

use App\Models\Order;
use App\Models\SelfOrder;
use App\Models\Table;
use App\Models\TableQrcode;
use App\Models\Transaction;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class SelfOrderReceiptNotificationTest extends TestCase
{
    use InteractsWithRestaurant, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    /**
     * @return array{0: SelfOrder, 1: Transaction}
     */
    private function paidQrisSelfOrder(): array
    {
        $zone = Zone::query()->create(['name' => 'Lantai 1', 'color_hex' => '#2563EB']);
        $table = Table::query()->create(['name' => 'A1', 'capacity' => 4, 'zone_id' => $zone->id]);
        $qr = TableQrcode::query()->create(['table_id' => $table->id, 'qr_token' => str_repeat('a', 48), 'is_active' => true]);

        $order = Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => null,
            'order_type' => 'self_order',
            'status' => 'paid',
            'subtotal' => 35000,
            'total_amount' => 35000,
        ]);

        $transaction = Transaction::query()->create([
            'order_id' => $order->id,
            'kasir_id' => null,
            'payment_method' => 'qris',
            'amount_paid' => 35000,
            'change_amount' => 0,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $selfOrder = SelfOrder::query()->create([
            'table_id' => $table->id,
            'table_qrcode_id' => $qr->id,
            'order_id' => $order->id,
            'customer_name' => 'Budi',
            'payment_preference' => 'qris',
            'status' => 'converted_to_order',
            'subtotal' => 35000,
            'total_amount' => 35000,
        ]);

        return [$selfOrder, $transaction];
    }

    public function test_printing_receipt_clears_the_self_order_from_pos_notification(): void
    {
        $restaurant = $this->activeRestaurant();
        [$selfOrder, $transaction] = $this->paidQrisSelfOrder();
        $user = $this->managerFor($restaurant, ['pos.view', 'pos.create', 'pos.checkout']);

        $this->actingAs($user)->withSession(['active_restaurant_id' => $restaurant->id]);

        // Initially the paid QRIS self-order shows in the print-receipt notification.
        $this->get('/pos')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('paidSelfOrderReceipts', 1));

        // Printing the receipt marks it printed.
        $this->get("/pos/transactions/{$transaction->id}/receipt")->assertOk();
        $this->assertNotNull($selfOrder->fresh()->receipt_printed_at);

        // It no longer appears in the notification list.
        $this->get('/pos')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('paidSelfOrderReceipts', 0));
    }

    public function test_reprint_does_not_remark_receipt(): void
    {
        $restaurant = $this->activeRestaurant();
        [$selfOrder, $transaction] = $this->paidQrisSelfOrder();
        $user = $this->managerFor($restaurant, ['pos.view', 'pos.create', 'pos.checkout']);

        $this->actingAs($user)->withSession(['active_restaurant_id' => $restaurant->id]);

        $this->get("/pos/transactions/{$transaction->id}/receipt?reprint=1")->assertOk();
        $this->assertNull($selfOrder->fresh()->receipt_printed_at);
    }

    public function test_manual_dismiss_marks_receipt_printed(): void
    {
        $restaurant = $this->activeRestaurant();
        [$selfOrder] = $this->paidQrisSelfOrder();
        $user = $this->managerFor($restaurant, ['pos.view', 'pos.create', 'pos.checkout']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->post("/pos/self-orders/{$selfOrder->id}/receipt-printed")
            ->assertRedirect();

        $this->assertNotNull($selfOrder->fresh()->receipt_printed_at);
    }
}
