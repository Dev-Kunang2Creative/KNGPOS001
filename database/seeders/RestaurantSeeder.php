<?php

namespace Database\Seeders;

use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Restaurant;
use App\Models\Table;
use App\Models\Zone;
use App\Models\ZoneStationAssignment;
use App\Services\RestaurantContext;
use Illuminate\Database\Seeder;

class RestaurantSeeder extends Seeder
{
    public function run(): void
    {
        // Create default restaurant
        $restaurant = Restaurant::withoutGlobalScopes()->updateOrCreate(
            ['slug' => 'karcisqu-pos'],
            [
                'name' => 'Karcisqu POS',
                'phone' => '081234567890',
                'address' => 'Jl. Contoh No. 1',
                'receipt_header' => 'Terima kasih sudah berkunjung',
                'receipt_footer' => 'Simpan struk sebagai bukti pembayaran',
                'tax_percentage' => 11,
                'tax_is_active' => true,
                'service_charge_percentage' => 5,
                'service_charge_is_active' => true,
                'status' => 'active',
            ],
        );

        // Set restaurant context so BelongsToRestaurant trait auto-assigns restaurant_id
        // on top-level entities (zones, stations, tables, menu, etc.)
        app(RestaurantContext::class)->set($restaurant->id);

        $zones = collect([
            ['name' => 'Indoor', 'description' => 'Area utama restoran', 'color_hex' => '#2563EB', 'sort_order' => 1],
            ['name' => 'Outdoor', 'description' => 'Area luar ruangan', 'color_hex' => '#16A34A', 'sort_order' => 2],
            ['name' => 'VIP', 'description' => 'Area reservasi VIP', 'color_hex' => '#D97706', 'sort_order' => 3],
        ])->map(fn (array $zone) => Zone::query()->updateOrCreate(['name' => $zone['name'], 'restaurant_id' => $restaurant->id], $zone));

        $kitchens = collect(['Kitchen 1', 'Kitchen 2'])
            ->map(fn (string $name) => KitchenStation::query()->updateOrCreate(['name' => $name, 'restaurant_id' => $restaurant->id], ['status' => 'active']));

        $bars = collect(['Bar 1', 'Bar 2'])
            ->map(fn (string $name) => BarStation::query()->updateOrCreate(['name' => $name, 'restaurant_id' => $restaurant->id], ['status' => 'active']));

        // ZoneStationAssignment is a child of Zone — no restaurant_id needed
        $zones->each(function (Zone $zone, int $index) use ($kitchens, $bars): void {
            ZoneStationAssignment::query()->updateOrCreate(
                ['zone_id' => $zone->id],
                [
                    'kitchen_station_id' => $kitchens[$index === 1 ? 1 : 0]->id,
                    'bar_station_id' => $bars[$index === 2 ? 1 : 0]->id,
                    'assigned_at' => now(),
                ],
            );
        });

        for ($number = 1; $number <= 30; $number++) {
            $zone = $zones[intdiv($number - 1, 10)];

            Table::query()->updateOrCreate(
                ['name' => 'Meja '.$number, 'restaurant_id' => $restaurant->id],
                [
                    'capacity' => $number > 20 ? 6 : 4,
                    'zone_id' => $zone->id,
                    'position_x' => (($number - 1) % 10) * 120,
                    'position_y' => intdiv($number - 1, 10) * 120,
                    'status' => 'available',
                    'self_order_enabled' => true,
                ],
            );
        }

        $food = MenuCategory::query()->updateOrCreate(['name' => 'Makanan', 'restaurant_id' => $restaurant->id], ['sort_order' => 1, 'is_active' => true]);
        $drink = MenuCategory::query()->updateOrCreate(['name' => 'Minuman', 'restaurant_id' => $restaurant->id], ['sort_order' => 2, 'is_active' => true]);
        $dessert = MenuCategory::query()->updateOrCreate(['name' => 'Dessert', 'restaurant_id' => $restaurant->id], ['sort_order' => 3, 'is_active' => true]);

        $items = [
            [$food->id, 'Nasi Goreng Karcisqu', 35000, 'kitchen'],
            [$food->id, 'Ayam Bakar Madu', 42000, 'kitchen'],
            [$food->id, 'Sate Ayam', 38000, 'kitchen'],
            [$drink->id, 'Es Teh Manis', 12000, 'bar'],
            [$drink->id, 'Kopi Susu Aren', 22000, 'bar'],
            [$drink->id, 'Jus Alpukat', 25000, 'bar'],
            [$dessert->id, 'Pisang Goreng', 18000, 'kitchen'],
            [$dessert->id, 'Ice Cream Vanilla', 20000, 'kasir'],
        ];

        foreach ($items as $index => [$categoryId, $name, $price, $printTo]) {
            MenuItem::query()->updateOrCreate(
                ['name' => $name, 'restaurant_id' => $restaurant->id],
                [
                    'category_id' => $categoryId,
                    'price' => $price,
                    'print_to' => $printTo,
                    'is_available' => true,
                    'sort_order' => $index + 1,
                ],
            );
        }
    }
}
