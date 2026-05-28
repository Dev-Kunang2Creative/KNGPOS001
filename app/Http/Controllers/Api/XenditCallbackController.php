<?php

namespace App\Http\Controllers\Api;

use App\Events\SelfOrderReceived;
use App\Exceptions\ZoneStationAssignmentMissingException;
use App\Http\Controllers\Controller;
use App\Models\KitchenOrder;
use App\Models\Order;
use App\Models\SystemSettings;
use App\Models\XenditPayment;
use App\Models\XenditWebhookLog;
use App\Services\OrderRoutingService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class XenditCallbackController extends Controller
{
    public function __invoke(Request $request, PaymentService $paymentService, OrderRoutingService $routingService): JsonResponse
    {
        $expectedToken = SystemSettings::get('xendit_webhook_token');

        if (! $expectedToken || ! hash_equals($expectedToken, (string) $request->header('x-callback-token'))) {
            return response()->json(['message' => 'Invalid callback token.'], Response::HTTP_UNAUTHORIZED);
        }

        $payload = $request->all();
        $externalId = $this->externalId($payload);
        $log = XenditWebhookLog::query()->create([
            'external_id' => $externalId,
            'payload' => $payload,
            'processed' => false,
            'received_at' => now(),
        ]);

        if (! $externalId) {
            $log->update(['error_message' => 'Missing external_id/reference_id.']);

            return response()->json(['message' => 'Missing external id.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $isPaid = $this->isPaid($payload);
        $existingPayment = XenditPayment::query()->where('external_id', $externalId)->first();

        if ($isPaid && $existingPayment && strtolower((string) $existingPayment->status) === 'paid') {
            $log->update(['processed' => true]);

            return response()->json(['message' => 'Duplicate callback ignored.']);
        }

        try {
            if ($isPaid) {
                $payment = $paymentService->markXenditPaymentPaid($externalId, $payload);
                $this->routeSelfOrderIfNeeded($payment, $routingService);
            }

            $log->update(['processed' => true]);
        } catch (Throwable $exception) {
            $log->update(['error_message' => $exception->getMessage()]);

            return response()->json(['message' => 'Callback processing failed.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return response()->json(['message' => 'OK']);
    }

    private function externalId(array $payload): ?string
    {
        return $payload['external_id']
            ?? $payload['reference_id']
            ?? data_get($payload, 'data.external_id')
            ?? data_get($payload, 'data.reference_id');
    }

    private function isPaid(array $payload): bool
    {
        $status = strtoupper((string) ($payload['status'] ?? data_get($payload, 'data.status')));
        $event = strtoupper((string) ($payload['event'] ?? $payload['event_type'] ?? ''));

        return in_array($status, ['PAID', 'SUCCEEDED', 'COMPLETED', 'COMPLETED_PAYMENT'], true)
            || str_contains($event, 'PAID')
            || str_contains($event, 'SUCCEEDED');
    }

    private function routeSelfOrderIfNeeded(?XenditPayment $payment, OrderRoutingService $routingService): void
    {
        if (! $payment) {
            return;
        }

        $order = Order::query()
            ->with(['items', 'table'])
            ->whereHas('items', fn ($query) => $query->where('status', 'pending'))
            ->find($payment->transaction->order_id);

        if (! $order || $order->order_type !== 'self_order') {
            return;
        }

        if (KitchenOrder::query()->where('order_id', $order->id)->exists()) {
            return;
        }

        try {
            DB::transaction(fn () => $routingService->routeOrder($order));
            SelfOrderReceived::dispatch($order->fresh(), $payment->transaction->kasir_id);
        } catch (ZoneStationAssignmentMissingException $exception) {
            throw $exception;
        }
    }
}
