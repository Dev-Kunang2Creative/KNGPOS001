<?php

namespace App\Jobs;

use App\Models\Transaction;
use App\Services\SplitPaymentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DisburseAfterPayment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(
        public readonly int $transactionId,
    ) {}

    public function handle(SplitPaymentService $splitPaymentService): void
    {
        $transaction = Transaction::find($this->transactionId);

        if (! $transaction) {
            Log::warning('DisburseAfterPayment: transaction not found', ['id' => $this->transactionId]);
            return;
        }

        if (! $splitPaymentService->isSplitEnabled()) {
            return;
        }

        try {
            $results = $splitPaymentService->disburseAfterPayment($transaction);
            Log::info('DisburseAfterPayment: completed', [
                'transaction_id' => $transaction->id,
                'disbursements'  => count($results),
            ]);
        } catch (\Throwable $e) {
            Log::error('DisburseAfterPayment: failed', [
                'transaction_id' => $transaction->id,
                'error'          => $e->getMessage(),
            ]);
            throw $e; // Let queue retry
        }
    }
}
