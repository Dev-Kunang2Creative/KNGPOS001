<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$data = App\Models\MenuCategory::with(['activeItems' => function ($q) { 
    $q->with('addons')->where('is_available', true)->select('id', 'category_id', 'name', 'price', 'print_to', 'image_path', 'restaurant_id'); 
}])->get()->toArray();

echo json_encode($data, JSON_PRETTY_PRINT);
