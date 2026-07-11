<?php

namespace App\Services;

use App\Models\SplitPaymentAccount;
use App\Models\SplitPaymentDisbursement;
use App\Models\SystemSettings;
use App\Models\Transaction;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class SplitPaymentService
{
    /**
     * Indonesian bank channel codes supported by Xendit Payouts.
     * These map to Xendit's channel_code field in POST /v2/payouts.
     */
    public const BANK_CHANNELS = [
        'ID_BCA'               => 'BCA',
        'ID_MANDIRI'           => 'Mandiri',
        'ID_BNI'               => 'BNI',
        'ID_BRI'               => 'BRI',
        'ID_BSI'               => 'BSI',
        'ID_BTN'               => 'BTN',
        'ID_CIMB'              => 'CIMB Niaga',
        'ID_DANAMON'           => 'Danamon',
        'ID_PERMATA'           => 'Permata',
        'ID_MAYBANK'           => 'Maybank',
        'ID_OCBC_NISP'         => 'OCBC NISP',
        'ID_PANIN'             => 'Panin',
        'ID_SINARMAS'          => 'Sinarmas',
        'ID_MUAMALAT'          => 'Muamalat',
        'ID_MEGA'              => 'Bank Mega',
        'ID_BUKOPIN'           => 'Bukopin',
        'ID_BJB'               => 'BJB',
        'ID_BPD_BALI'          => 'BPD Bali',
        'ID_BPD_DIY'           => 'BPD DIY',
        'ID_JAGO'              => 'Bank Jago',
        'ID_SAHABAT_SAMPOERNA' => 'Bank Sahabat Sampoerna',
        'ID_SEABANK'           => 'SeaBank',
        'ID_NOBU'              => 'Bank Nobu',
    ];

    // ──────────────────────────────────────────────
    // Config helpers
    // ──────────────────────────────────────────────

    public function isSplitEnabled(): bool
    {
        return SystemSettings::get('xendit_split_enabled', '0') === '1';
    }

    public function toggleSplitEnabled(bool $enabled): void
    {
        SystemSettings::set('xendit_split_enabled', $enabled ? '1' : '0');
    }

    public function getActiveAccounts(): Collection
    {
        return SplitPaymentAccount::query()
            ->active()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    // ──────────────────────────────────────────────
    // Validation
    // ──────────────────────────────────────────────

    /**
     * Ensure adding/updating an account won't push the total active % over 100.
     *
     * @throws RuntimeException
     */
    public function validateTotalPercentage(float $incomingPercent, ?int $excludeId = null): void
    {
        $existingTotal = SplitPaymentAccount::query()
            ->active()
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
            ->sum('percent_amount');

        $newTotal = (float) $existingTotal + $incomingPercent;

        if ($newTotal > 100) {
            throw new RuntimeException(
                "Total persentase split ({$newTotal}%) melebihi 100%. ".
                'Kurangi persentase akun lain terlebih dahulu.'
            );
        }
    }

    // ──────────────────────────────────────────────
    // Disbursement (Xendit Payouts API)
    // ──────────────────────────────────────────────

    /**
     * Record the pending split payment balances for each configured split account.
     * Called by PaymentService after a payment is confirmed.
     *
     * @return void
     */
    public function recordPendingSplit(Transaction $transaction): void
    {
        $accounts = SplitPaymentAccount::query()
            ->bankReady()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        if ($accounts->isEmpty()) {
            Log::info('recordPendingSplit: no bank-ready accounts, skipping.', [
                'transaction_id' => $transaction->id,
            ]);
            return;
        }

        $totalAmount = (float) $transaction->amount_paid;

        foreach ($accounts as $account) {
            $amount = round($totalAmount * ((float) $account->percent_amount / 100), 0);

            if ($amount < 1) {
                continue;
            }

            // Increment the pending balance
            $account->increment('pending_balance', $amount);

            Log::info('recordPendingSplit: recorded pending balance', [
                'account'        => $account->name,
                'amount'         => $amount,
                'transaction_id' => $transaction->id,
            ]);
        }
    }

    /**
     * Process manual disbursement for a specific split account via Xendit Payouts API.
     * Requires the account to have a pending_balance >= 10000.
     *
     * @return SplitPaymentDisbursement
     * @throws RuntimeException
     */
    public function processManualDisbursement(SplitPaymentAccount $account): SplitPaymentDisbursement
    {
        $secretKey = config('services.xendit.secret_key');

        if (! $secretKey || ! config('services.xendit.enabled')) {
            throw new RuntimeException('Xendit belum dikonfigurasi. Pastikan Xendit secret key sudah diset di System Settings.');
        }

        if (!$account->is_active || !$account->bank_code || !$account->account_number) {
            throw new RuntimeException('Akun split ini belum dikonfigurasi dengan benar (Bank & No. Rekening harus diisi).');
        }

        $amount = (float) $account->pending_balance;

        if ($amount < 10000) {
            throw new RuntimeException('Minimal pencairan adalah Rp 10.000');
        }

        $referenceId = 'krc-split-manual-'.$account->id.'-'.Str::lower(Str::random(8));

        $disbursement = SplitPaymentDisbursement::query()->create([
            'transaction_id'      => null,
            'split_account_id'    => $account->id,
            'channel_code'        => $account->bank_code,
            'account_number'      => $account->account_number,
            'account_holder_name' => $account->account_holder,
            'percent_amount'      => $account->percent_amount,
            'amount'              => $amount,
            'reference_id'        => $referenceId,
            'status'              => 'pending',
        ]);

        try {
            $response = Http::withBasicAuth($secretKey, '')
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post('https://api.xendit.co/v2/payouts', [
                    'reference_id'      => $referenceId,
                    'channel_code'      => $account->bank_code,
                    'channel_properties' => [
                        'account_number'      => $account->account_number,
                        'account_holder_name' => $account->account_holder ?? $account->name,
                    ],
                    'amount'      => (int) $amount,
                    'currency'    => 'IDR',
                    'description' => 'Manual Split Payout - '.$account->name,
                ])
                ->throw()
                ->json();

            // Payout successful (accepted by Xendit)
            $disbursement->update([
                'status'              => 'succeeded',
                'xendit_payout_id'    => $response['id'] ?? null,
                'xendit_raw_response' => $response,
                'disbursed_at'        => now(),
            ]);
            
            // Reset pending balance back to 0
            $account->update(['pending_balance' => 0]);

            Log::info('processManualDisbursement: payout succeeded', [
                'account'   => $account->name,
                'amount'    => $amount,
                'xendit_id' => $response['id'] ?? null,
            ]);

            return $disbursement;

        } catch (\Throwable $e) {
            $disbursement->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            Log::error('processManualDisbursement: payout failed', [
                'account' => $account->name,
                'amount'  => $amount,
                'error'   => $e->getMessage(),
            ]);

            throw new RuntimeException('Gagal mencairkan dana melalui Xendit: ' . $e->getMessage());
        }
    }
}
