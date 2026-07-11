<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\SplitPaymentAccountRequest;
use App\Models\SplitPaymentAccount;
use App\Models\SplitPaymentDisbursement;
use App\Services\SplitPaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class SplitPaymentController extends Controller
{
    public function __construct(
        private readonly SplitPaymentService $splitPaymentService,
    ) {}

    public function index(): Response
    {
        $accounts = SplitPaymentAccount::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $totalPercent = $accounts->where('is_active', true)->sum('percent_amount');

        // Recent disbursements (last 50)
        $recentDisbursements = SplitPaymentDisbursement::query()
            ->with(['transaction', 'splitAccount'])
            ->latest()
            ->take(50)
            ->get();

        return Inertia::render('settings/SplitPayment/Index', [
            'accounts'            => $accounts,
            'totalPercent'        => (float) $totalPercent,
            'splitEnabled'        => $this->splitPaymentService->isSplitEnabled(),
            'bankChannels'        => SplitPaymentService::BANK_CHANNELS,
            'recentDisbursements' => $recentDisbursements,
        ]);
    }

    public function store(SplitPaymentAccountRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        try {
            $this->splitPaymentService->validateTotalPercentage(
                (float) $validated['percent_amount'],
            );
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        SplitPaymentAccount::query()->create([
            'name'           => $validated['name'],
            'bank_code'      => $validated['bank_code'] ?? null,
            'bank_name'      => $validated['bank_name'] ?? null,
            'account_number' => $validated['account_number'] ?? null,
            'account_holder' => $validated['account_holder'] ?? null,
            'percent_amount' => $validated['percent_amount'],
            'is_active'      => $validated['is_active'] ?? true,
            'sort_order'     => $validated['sort_order'] ?? 0,
        ]);

        return back()->with('success', 'Akun split berhasil ditambahkan.');
    }

    public function update(SplitPaymentAccountRequest $request, SplitPaymentAccount $splitAccount): RedirectResponse
    {
        $validated = $request->validated();

        try {
            $this->splitPaymentService->validateTotalPercentage(
                incomingPercent: (float) $validated['percent_amount'],
                excludeId: $splitAccount->id,
            );
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        $splitAccount->update([
            'name'           => $validated['name'],
            'bank_code'      => $validated['bank_code'] ?? null,
            'bank_name'      => $validated['bank_name'] ?? null,
            'account_number' => $validated['account_number'] ?? null,
            'account_holder' => $validated['account_holder'] ?? null,
            'percent_amount' => $validated['percent_amount'],
            'is_active'      => $validated['is_active'] ?? $splitAccount->is_active,
            'sort_order'     => $validated['sort_order'] ?? $splitAccount->sort_order,
        ]);

        return back()->with('success', 'Akun split berhasil diperbarui.');
    }

    public function destroy(SplitPaymentAccount $splitAccount): RedirectResponse
    {
        $splitAccount->delete();

        return back()->with('success', 'Akun split berhasil dihapus.');
    }

    /**
     * Toggle the global split payment disbursement on/off.
     */
    public function toggle(Request $request): RedirectResponse
    {
        $enabled = $request->boolean('enabled');
        $this->splitPaymentService->toggleSplitEnabled($enabled);

        $status = $enabled ? 'diaktifkan' : 'dinonaktifkan';

        return back()->with('success', "Split payment berhasil {$status}.");
    }

    /**
     * Manually disburse accumulated pending balance for an account.
     */
    public function disburse(SplitPaymentAccount $splitAccount): RedirectResponse
    {
        try {
            $this->splitPaymentService->processManualDisbursement($splitAccount);
            return back()->with('success', "Pencairan dana untuk {$splitAccount->name} berhasil diproses.");
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
