<?php

namespace App\Services;

use App\Models\BarOrder;
use App\Models\KitchenOrder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Restaurant;
use App\Models\Table;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class TableMergeService
{
    /**
     * Merge tables so their bills become a single order on the target table.
     * Source tables are linked to the target and blocked from new orders
     * until the merged bill is paid or the tables are split again.
     *
     * @param  list<int>  $sourceTableIds
     */
    public function merge(int $targetTableId, array $sourceTableIds, User $kasir): Order
    {
        return DB::transaction(function () use ($targetTableId, $sourceTableIds, $kasir): Order {
            $tableIds = array_values(array_unique([$targetTableId, ...$sourceTableIds]));

            if (count($tableIds) < 2) {
                throw new RuntimeException('Pilih minimal satu meja lain untuk digabung.');
            }

            $tables = Table::query()->whereIn('id', $tableIds)->lockForUpdate()->get()->keyBy('id');

            if ($tables->count() !== count($tableIds)) {
                throw new RuntimeException('Ada meja yang tidak ditemukan.');
            }

            foreach ($tables as $table) {
                if (! in_array($table->status, ['available', 'occupied', 'open_bill'], true)) {
                    throw new RuntimeException("Meja {$table->name} sedang reserved/blocked dan tidak bisa digabung.");
                }

                if ($table->merged_into_table_id !== null) {
                    throw new RuntimeException("Meja {$table->name} sudah tergabung dengan meja lain.");
                }
            }

            $sourceIds = array_values(array_diff($tableIds, [$targetTableId]));

            if (Table::query()->whereIn('merged_into_table_id', $sourceIds)->exists()) {
                throw new RuntimeException('Meja yang menjadi induk gabungan lain harus dipisah dulu sebelum digabung ulang.');
            }

            $orders = Order::query()
                ->whereIn('table_id', $tableIds)
                ->whereIn('status', ['open', 'submitted'])
                ->lockForUpdate()
                ->orderBy('id')
                ->get();

            if ($orders->isEmpty()) {
                throw new RuntimeException('Tidak ada open bill pada meja yang dipilih.');
            }

            if ($orders->contains(fn (Order $order): bool => $order->kasir_id !== $kasir->id)) {
                throw new RuntimeException('Ada open bill milik kasir lain di meja yang dipilih.');
            }

            $anySubmitted = $orders->contains(fn (Order $order): bool => $order->status === 'submitted');
            $primary = $orders->firstWhere('table_id', $targetTableId) ?? $orders->first();

            foreach ($orders as $order) {
                if ($order->id === $primary->id) {
                    continue;
                }

                OrderItem::query()->where('order_id', $order->id)->update(['order_id' => $primary->id]);
                KitchenOrder::query()->where('order_id', $order->id)->update(['order_id' => $primary->id]);
                BarOrder::query()->where('order_id', $order->id)->update(['order_id' => $primary->id]);

                if ($order->notes) {
                    $primary->notes = trim(($primary->notes ? $primary->notes.' | ' : '').$order->notes);
                }

                $order->update([
                    'status' => 'cancelled',
                    'notes' => trim(($order->notes ? $order->notes.' | ' : '')."Digabung ke Order #{$primary->id}"),
                ]);
            }

            $subtotal = (float) OrderItem::query()
                ->where('order_id', $primary->id)
                ->where('status', '!=', 'cancelled')
                ->sum('subtotal');

            $target = $tables[$targetTableId];
            $restaurant = Restaurant::find($target->restaurant_id);
            $charges = $restaurant?->chargesFor($subtotal) ?? ['service_charge' => 0, 'tax' => 0, 'total' => round($subtotal, 2)];

            $primary->update([
                'table_id' => $targetTableId,
                'status' => $anySubmitted ? 'submitted' : 'open',
                'notes' => $primary->notes,
                'subtotal' => $subtotal,
                'service_charge_amount' => $charges['service_charge'],
                'tax_amount' => $charges['tax'],
                'total_amount' => $charges['total'],
            ]);

            Table::query()->whereIn('id', $sourceIds)->update([
                'merged_into_table_id' => $targetTableId,
                'status' => 'open_bill',
            ]);
            $target->update(['status' => 'open_bill']);

            return $primary->fresh(['table', 'items']);
        });
    }

    /**
     * Split a merged group: release every table joined to the target table.
     * The combined bill stays on the target table.
     *
     * @return int Number of tables released.
     */
    public function unmerge(Table $table): int
    {
        return DB::transaction(function () use ($table): int {
            $released = Table::query()
                ->where('merged_into_table_id', $table->id)
                ->lockForUpdate()
                ->get();

            if ($released->isEmpty()) {
                throw new RuntimeException("Tidak ada meja yang tergabung ke meja {$table->name}.");
            }

            Table::query()->whereIn('id', $released->pluck('id'))->update([
                'merged_into_table_id' => null,
                'status' => 'occupied',
            ]);

            return $released->count();
        });
    }
}
