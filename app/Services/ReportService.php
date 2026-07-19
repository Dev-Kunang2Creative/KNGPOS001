<?php

namespace App\Services;

use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Shift;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Carbon;

class ReportService
{
    public function dashboardMetrics(): array
    {
        $today = today();

        $todayRevenue = (float) Transaction::query()
            ->where('status', 'paid')
            ->whereDate('paid_at', $today)
            ->sum('amount_paid');

        $todayTransactions = Transaction::query()
            ->where('status', 'paid')
            ->whereDate('paid_at', $today)
            ->count();

        return [
            'totalOrders' => Order::query()->whereDate('created_at', $today)->count(),
            'todayRevenue' => $todayRevenue,
            'todayTransactions' => $todayTransactions,
            'avgOrderValue' => $todayTransactions > 0 ? round($todayRevenue / $todayTransactions) : 0.0,
            'revenueTrend' => $this->revenueTrend(),
            'topMenuItems' => $this->topMenuItems(),
            'paymentMethods' => $this->paymentMethodBreakdown($today),
            'kitchenStations' => KitchenStation::query()
                ->withCount(['activeOrders as queue_count' => fn ($query) => $query->where('status', 'queued')])
                ->orderBy('name')
                ->get(['id', 'name', 'status']),
            'barStations' => BarStation::query()
                ->withCount(['activeOrders as queue_count' => fn ($query) => $query->where('status', 'queued')])
                ->orderBy('name')
                ->get(['id', 'name', 'status']),
            'cashierBreakdown' => $this->cashierReport($today, $today)['rows'],
        ];
    }

    /**
     * Paid revenue per day for the last 7 days (oldest first).
     *
     * @return list<array{date: string, label: string, revenue: float}>
     */
    private function revenueTrend(int $days = 7): array
    {
        $start = today()->subDays($days - 1)->startOfDay();

        $byDate = Transaction::query()
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, today()->endOfDay()])
            ->get(['amount_paid', 'paid_at'])
            ->groupBy(fn (Transaction $transaction) => Carbon::parse($transaction->paid_at)->toDateString());

        return collect(range($days - 1, 0))
            ->map(function (int $daysAgo) use ($byDate): array {
                $date = today()->subDays($daysAgo);
                $key = $date->toDateString();

                return [
                    'date' => $key,
                    'label' => $date->isoFormat('dd D/M'),
                    'revenue' => (float) ($byDate->get($key)?->sum('amount_paid') ?? 0),
                ];
            })
            ->all();
    }

    /**
     * Best-selling menu items over the last 7 days by quantity sold.
     *
     * @return list<array{name: string, quantity: int, revenue: float}>
     */
    private function topMenuItems(int $limit = 5, int $days = 7): array
    {
        $start = today()->subDays($days - 1)->startOfDay();

        $aggregated = OrderItem::query()
            ->whereHas('order', fn ($query) => $query
                ->where('status', 'paid')
                ->whereBetween('created_at', [$start, today()->endOfDay()]))
            ->where('status', '!=', 'cancelled')
            ->selectRaw('menu_item_id, SUM(quantity) as quantity, SUM(subtotal) as revenue')
            ->groupBy('menu_item_id')
            ->orderByDesc('quantity')
            ->limit($limit)
            ->get();

        $names = MenuItem::query()
            ->whereIn('id', $aggregated->pluck('menu_item_id'))
            ->pluck('name', 'id');

        return $aggregated
            ->map(fn ($row): array => [
                'name' => $names[$row->menu_item_id] ?? 'Item #'.$row->menu_item_id,
                'quantity' => (int) $row->quantity,
                'revenue' => (float) $row->revenue,
            ])
            ->all();
    }

    /**
     * Paid revenue grouped by payment method for the given day.
     *
     * @return list<array{method: string, amount: float, count: int}>
     */
    private function paymentMethodBreakdown(Carbon $day): array
    {
        return Transaction::query()
            ->where('status', 'paid')
            ->whereDate('paid_at', $day)
            ->get(['payment_method', 'amount_paid'])
            ->groupBy('payment_method')
            ->map(fn ($group, $method): array => [
                'method' => (string) $method,
                'amount' => (float) $group->sum('amount_paid'),
                'count' => $group->count(),
            ])
            ->sortByDesc('amount')
            ->values()
            ->all();
    }

    public function cashierReport(?string $from = null, ?string $to = null, ?int $cashierId = null, ?int $shiftId = null): array
    {
        $fromDate = $from ? Carbon::parse($from)->startOfDay() : today()->startOfDay();
        $toDate = $to ? Carbon::parse($to)->endOfDay() : today()->endOfDay();

        $shift = $shiftId ? Shift::query()->find($shiftId) : null;

        $transactions = Transaction::query()
            ->with(['order:id,order_type,kasir_id', 'cashier:id,name'])
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$fromDate, $toDate])
            ->when($cashierId, fn ($query) => $query->where('kasir_id', $cashierId))
            ->when($shift, fn ($query) => $query
                ->where('kasir_id', $shift->kasir_id)
                ->whereBetween('paid_at', [$shift->opened_at, $shift->closed_at ?? now()]))
            ->get();

        $rows = $transactions
            ->groupBy(fn (Transaction $transaction) => $transaction->order?->order_type === 'self_order' ? 'self_order' : (string) $transaction->kasir_id)
            ->map(function ($group, string $key): array {
                $first = $group->first();

                return [
                    'kasir_id' => $key === 'self_order' ? null : (int) $key,
                    'kasir_name' => $key === 'self_order' ? 'Self-Order' : ($first->cashier?->name ?? 'Kasir #'.$key),
                    'total_transactions' => $group->count(),
                    'total_revenue' => (float) $group->sum('amount_paid'),
                    'cash' => (float) $group->where('payment_method', 'cash')->sum('amount_paid'),
                    'qris' => (float) $group->where('payment_method', 'qris')->sum('amount_paid'),
                    'ewallet' => (float) $group->where('payment_method', 'ewallet')->sum('amount_paid'),
                    'bank_transfer' => (float) $group->where('payment_method', 'bank_transfer')->sum('amount_paid'),
                    'va' => (float) $group->where('payment_method', 'va')->sum('amount_paid'),
                    'is_total' => false,
                ];
            })
            ->values();

        $total = [
            'kasir_id' => null,
            'kasir_name' => 'TOTAL',
            'total_transactions' => $transactions->count(),
            'total_revenue' => (float) $transactions->sum('amount_paid'),
            'cash' => (float) $transactions->where('payment_method', 'cash')->sum('amount_paid'),
            'qris' => (float) $transactions->where('payment_method', 'qris')->sum('amount_paid'),
            'ewallet' => (float) $transactions->where('payment_method', 'ewallet')->sum('amount_paid'),
            'bank_transfer' => (float) $transactions->where('payment_method', 'bank_transfer')->sum('amount_paid'),
            'va' => (float) $transactions->where('payment_method', 'va')->sum('amount_paid'),
            'is_total' => true,
        ];

        return [
            'rows' => $rows->push($total)->all(),
            'filters' => [
                'from' => $fromDate->toDateString(),
                'to' => $toDate->toDateString(),
                'cashier_id' => $cashierId,
                'shift_id' => $shiftId,
            ],
            'cashiers' => User::query()
                ->whereHas('restaurantUsers', fn ($q) => $q
                    ->where('restaurant_id', session('active_restaurant_id'))
                    ->where('role', 'kasir'))
                ->orderBy('name')
                ->get(['id', 'name']),
            'shifts' => Shift::query()
                ->with('cashier:id,name')
                ->where('opened_at', '<=', $toDate)
                ->where(fn ($query) => $query
                    ->whereNull('closed_at')
                    ->orWhere('closed_at', '>=', $fromDate))
                ->orderByDesc('opened_at')
                ->get()
                ->map(fn (Shift $shiftOption): array => [
                    'id' => $shiftOption->id,
                    'label' => sprintf(
                        '%s — %s%s',
                        $shiftOption->cashier?->name ?? 'Kasir #'.$shiftOption->kasir_id,
                        $shiftOption->opened_at->format('d/m H:i'),
                        $shiftOption->closed_at ? '–'.$shiftOption->closed_at->format('H:i') : ' (aktif)',
                    ),
                ])
                ->all(),
        ];
    }
}
