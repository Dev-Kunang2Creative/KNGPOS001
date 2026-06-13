<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    $qrCode = App\Models\TableQrcode::with('table')->first();
    app(App\Services\RestaurantContext::class)->set($qrCode->table->restaurant_id);
    
    $svc = app(App\Services\SelfOrderService::class);
    $menuItem = App\Models\MenuItem::where('is_available', true)->first();
    
    if (!$menuItem) {
        die("No menu item available");
    }

    $data = [
        'items' => [
            ['menu_item_id' => $menuItem->id, 'quantity' => 1]
        ],
        'customer_name' => 'Tester',
        'customer_email' => 'test@test.com',
        'payment_preference' => 'cashier',
        'notes' => 'Test open bill'
    ];
    
    $result = $svc->submitOpenBill($qrCode, $data, app(App\Services\OrderRoutingService::class));
    echo "SUCCESS: Order ID " . $result['order']->id . "\n";
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
