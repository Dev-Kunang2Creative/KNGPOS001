<?php

namespace App\Services;

use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\Order;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Carbon;

class ReportService
{
    public function dashboardMetrics(): array
    {
        $today = today();

        return [
            'totalOrders' => Order::query()->whereDate('created_at', $today)->count(),
            'todayRevenue' => (float) Transaction::query()
                ->where('status', 'paid')
                ->whereDate('paid_at', $today)
                ->sum('amount_paid'),
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

    public function cashierReport(?string $from = null, ?string $to = null, ?int $cashierId = null, ?int $shiftId = null): array
    {
        $fromDate = $from ? Carbon::parse($from)->startOfDay() : today()->startOfDay();
        $toDate = $to ? Carbon::parse($to)->endOfDay() : today()->endOfDay();

        $transactions = Transaction::query()
            ->with(['order:id,order_type,kasir_id', 'cashier:id,name'])
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$fromDate, $toDate])
            ->when($cashierId, fn ($query) => $query->where('kasir_id', $cashierId))
            ->when($shiftId, fn ($query) => $query->whereHas('cashier.shifts', fn ($shiftQuery) => $shiftQuery->where('id', $shiftId)))
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
            'cashiers' => User::query()->where('role', 'kasir')->orderBy('name')->get(['id', 'name']),
        ];
    }
}
