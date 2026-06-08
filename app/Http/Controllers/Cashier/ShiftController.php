<?php

namespace App\Http\Controllers\Cashier;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cashier\CloseShiftRequest;
use App\Http\Requests\Cashier\OpenShiftRequest;
use App\Models\CashierShiftSummary;
use App\Models\Shift;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ShiftController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $activeRole = $user->roleInRestaurant(session('active_restaurant_id'));
        $canViewAllShifts = in_array($activeRole, ['super_admin', 'manager'], true)
            || $user->can('reports.view');

        return Inertia::render('Shifts/Index', [
            'activeShift' => $this->activeShift()?->load('summary'),
            'shifts' => Shift::query()
                ->with([
                    'cashier:id,name,email',
                    'summary',
                ])
                ->when(! $canViewAllShifts, fn ($query) => $query->where('kasir_id', $user->id))
                ->latest('opened_at')
                ->limit(30)
                ->get(),
        ]);
    }

    public function store(OpenShiftRequest $request): RedirectResponse
    {
        if ($this->activeShift()) {
            return back()->with('error', 'Kasir sudah memiliki shift aktif.');
        }

        Shift::query()->create([
            'kasir_id' => $request->user()->id,
            'opening_cash' => $request->validated('opening_cash'),
            'status' => 'open',
            'opened_at' => now(),
            'notes' => $request->validated('notes'),
        ]);

        return redirect()->route('pos.index')->with('success', 'Shift berhasil dibuka.');
    }

    public function close(CloseShiftRequest $request, Shift $shift): RedirectResponse
    {
        abort_unless($shift->kasir_id === $request->user()->id && $shift->status === 'open', 403);

        $transactions = Transaction::query()
            ->where('kasir_id', $request->user()->id)
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$shift->opened_at, now()])
            ->get();

        $totals = [
            'cash' => $transactions->where('payment_method', 'cash')->sum('amount_paid'),
            'qris' => $transactions->where('payment_method', 'qris')->sum('amount_paid'),
            'ewallet' => $transactions->where('payment_method', 'ewallet')->sum('amount_paid'),
            'bank_transfer' => $transactions->where('payment_method', 'bank_transfer')->sum('amount_paid'),
            'va' => $transactions->where('payment_method', 'va')->sum('amount_paid'),
        ];

        $closingCash = (float) $request->validated('closing_cash');
        $expectedCash = (float) $shift->opening_cash + (float) $totals['cash'];

        $shift->update([
            'closing_cash' => $closingCash,
            'status' => 'closed',
            'closed_at' => now(),
            'notes' => $request->validated('notes'),
        ]);

        CashierShiftSummary::query()->create([
            'shift_id' => $shift->id,
            'total_cash' => $totals['cash'],
            'total_qris' => $totals['qris'],
            'total_ewallet' => $totals['ewallet'],
            'total_bank_transfer' => $totals['bank_transfer'],
            'total_va' => $totals['va'],
            'total_transactions' => $transactions->count(),
            'total_revenue' => array_sum($totals),
            'cash_difference' => $closingCash - $expectedCash,
        ]);

        return redirect()->route('shifts.index')->with('success', 'Shift berhasil ditutup.');
    }

    private function activeShift(): ?Shift
    {
        return Shift::query()
            ->where('kasir_id', auth()->id())
            ->where('status', 'open')
            ->latest('opened_at')
            ->first();
    }
}
