<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SplitPaymentDisbursement;
use App\Models\XenditWebhookLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class XenditPayoutCallbackController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $expectedToken = config('services.xendit.webhook_token');

        if (! $expectedToken || ! hash_equals($expectedToken, (string) $request->header('x-callback-token'))) {
            return response()->json(['message' => 'Invalid callback token.'], Response::HTTP_UNAUTHORIZED);
        }

        $payload = $request->all();
        $referenceId = $this->referenceId($payload);
        
        $log = XenditWebhookLog::query()->create([
            'external_id' => $referenceId,
            'payload' => $payload,
            'processed' => false,
            'received_at' => now(),
        ]);

        if (! $referenceId) {
            $log->update(['error_message' => 'Missing reference_id in payout payload.']);
            return response()->json(['message' => 'Missing reference id.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $disbursement = SplitPaymentDisbursement::query()->with('splitAccount')->where('reference_id', $referenceId)->first();

        if (!$disbursement) {
            $log->update(['error_message' => 'Disbursement record not found for reference_id: ' . $referenceId]);
            return response()->json(['message' => 'Disbursement not found.']); // return 200 so Xendit stops retrying
        }

        $status = strtoupper((string) data_get($payload, 'data.status', data_get($payload, 'status')));
        
        if (in_array(strtolower($disbursement->status), ['failed', 'succeeded']) && strtolower($disbursement->status) === strtolower($status)) {
            $log->update(['processed' => true]);
            return response()->json(['message' => 'Duplicate callback ignored.']);
        }

        try {
            DB::transaction(function () use ($disbursement, $status, $payload) {
                // Update disbursement status
                $updateData = [
                    'status' => strtolower($status),
                    'xendit_raw_response' => $payload,
                ];

                if ($status === 'SUCCEEDED') {
                    $updateData['disbursed_at'] = now();
                }

                $disbursement->update($updateData);

                // If FAILED and wasn't already failed, refund the pending balance to the account
                if ($status === 'FAILED') {
                    $disbursement->update([
                        'error_message' => data_get($payload, 'data.failure_code') . ' - ' . data_get($payload, 'data.failure_message'),
                    ]);

                    $account = $disbursement->splitAccount;
                    if ($account) {
                        $account->increment('pending_balance', $disbursement->amount);
                    }
                }
            });

            $log->update(['processed' => true]);
        } catch (Throwable $exception) {
            $log->update(['error_message' => $exception->getMessage()]);
            return response()->json(['message' => 'Callback processing failed.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return response()->json(['message' => 'OK']);
    }

    private function referenceId(array $payload): ?string
    {
        return $payload['reference_id']
            ?? data_get($payload, 'data.reference_id');
    }
}
