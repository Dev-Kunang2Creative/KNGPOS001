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
     * Trigger Xendit Payout (POST /v2/payouts) for each configured split account.
     * Called by the DisburseAfterPayment job after a payment is confirmed.
     *
     * Accounts without bank_code or account_number are silently skipped.
     * Individual payout failures are logged and recorded but do not abort the others.
     *
     * @return SplitPaymentDisbursement[]
     *
     * @throws RuntimeException if Xendit is not configured
     */
    public function disburseAfterPayment(Transaction $transaction): array
    {
        $secretKey = config('services.xendit.secret_key');

        if (! $secretKey || ! config('services.xendit.enabled')) {
            throw new RuntimeException('Xendit belum dikonfigurasi. Pastikan Xendit secret key sudah diset di System Settings.');
        }

        $accounts = SplitPaymentAccount::query()
            ->bankReady()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        if ($accounts->isEmpty()) {
            Log::info('DisburseAfterPayment: no bank-ready accounts, skipping.', [
                'transaction_id' => $transaction->id,
            ]);
            return [];
        }

        $totalAmount = (float) $transaction->amount_paid;
        $disbursements = [];

        foreach ($accounts as $account) {
            $amount = round($totalAmount * ((float) $account->percent_amount / 100), 0);

            if ($amount < 1) {
                Log::warning('DisburseAfterPayment: calculated amount too small, skipping account.', [
                    'account'        => $account->name,
                    'amount'         => $amount,
                    'transaction_id' => $transaction->id,
                ]);
                continue;
            }

            $referenceId = 'krc-split-'.$transaction->id.'-'.$account->id.'-'.Str::lower(Str::random(6));

            $disbursement = SplitPaymentDisbursement::query()->create([
                'transaction_id'      => $transaction->id,
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
                        'description' => 'Split payment - '.$account->name.' - Trx #'.$transaction->id,
                    ])
                    ->throw()
                    ->json();

                $disbursement->update([
                    'status'              => 'succeeded',
                    'xendit_payout_id'    => $response['id'] ?? null,
                    'xendit_raw_response' => $response,
                    'disbursed_at'        => now(),
                ]);

                Log::info('DisburseAfterPayment: payout succeeded', [
                    'account'        => $account->name,
                    'amount'         => $amount,
                    'xendit_id'      => $response['id'] ?? null,
                    'transaction_id' => $transaction->id,
                ]);
            } catch (\Throwable $e) {
                $disbursement->update([
                    'status'        => 'failed',
                    'error_message' => $e->getMessage(),
                ]);

                Log::error('DisburseAfterPayment: payout failed', [
                    'account'        => $account->name,
                    'amount'         => $amount,
                    'error'          => $e->getMessage(),
                    'transaction_id' => $transaction->id,
                ]);
            }

            $disbursements[] = $disbursement->fresh();
        }

        return $disbursements;
    }
}
