<?php

namespace Tests\Feature\Settings;

use App\Models\SplitPaymentAccount;
use App\Services\SplitPaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class SplitPaymentDisbursementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.xendit.secret_key' => 'test-key', 'services.xendit.enabled' => true]);
        Http::fake([
            'api.xendit.co/v2/payouts' => Http::response(['id' => 'payout-test-1', 'status' => 'ACCEPTED']),
        ]);
    }

    public function test_nominal_account_disburses_only_its_nominal_amount(): void
    {
        $account = $this->account(['split_type' => 'nominal', 'nominal_amount' => 10000, 'pending_balance' => 15000]);

        $disbursement = app(SplitPaymentService::class)->processManualDisbursement($account);

        $this->assertSame(10000.0, (float) $disbursement->amount);
        $this->assertSame(5000.0, (float) $account->refresh()->pending_balance);
        Http::assertSent(fn (Request $request): bool => $request['amount'] === 10000);
    }

    public function test_percentage_account_disburses_full_pending_balance(): void
    {
        $account = $this->account(['split_type' => 'percentage', 'percent_amount' => 50, 'pending_balance' => 15000]);

        $disbursement = app(SplitPaymentService::class)->processManualDisbursement($account);

        $this->assertSame(15000.0, (float) $disbursement->amount);
        $this->assertSame(0.0, (float) $account->refresh()->pending_balance);
    }

    public function test_nominal_disbursement_is_capped_at_pending_balance(): void
    {
        $account = $this->account(['split_type' => 'nominal', 'nominal_amount' => 20000, 'pending_balance' => 12000]);

        $disbursement = app(SplitPaymentService::class)->processManualDisbursement($account);

        $this->assertSame(12000.0, (float) $disbursement->amount);
        $this->assertSame(0.0, (float) $account->refresh()->pending_balance);
    }

    public function test_disbursement_below_minimum_is_rejected(): void
    {
        $account = $this->account(['split_type' => 'nominal', 'nominal_amount' => 8000, 'pending_balance' => 15000]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Minimal pencairan adalah Rp 10.000');

        app(SplitPaymentService::class)->processManualDisbursement($account);

        $this->assertSame(15000.0, (float) $account->refresh()->pending_balance);
    }

    private function account(array $attributes): SplitPaymentAccount
    {
        return SplitPaymentAccount::query()->create($attributes + [
            'name' => 'Kas Pusat',
            'bank_code' => 'ID_BCA',
            'bank_name' => 'BCA',
            'account_number' => '1234567890',
            'account_holder' => 'PT Karcisqu',
            'is_active' => true,
        ]);
    }
}
