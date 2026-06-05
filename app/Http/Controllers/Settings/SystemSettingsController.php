<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\Printer;
use App\Models\SystemSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SystemSettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Settings/System', [
            'settings' => [
                'restaurant_name' => SystemSettings::get('restaurant_name'),
                'restaurant_address' => SystemSettings::get('restaurant_address'),
                'restaurant_phone' => SystemSettings::get('restaurant_phone'),
                'receipt_header' => SystemSettings::get('receipt_header'),
                'receipt_footer' => SystemSettings::get('receipt_footer'),
                'tax_percentage' => SystemSettings::get('tax_percentage', '0'),
                'tax_is_active' => SystemSettings::get('tax_is_active', '0'),
                'service_charge_percentage' => SystemSettings::get('service_charge_percentage', '0'),
                'service_charge_is_active' => SystemSettings::get('service_charge_is_active', '0'),
                'xendit_enabled' => config('services.xendit.enabled') ? '1' : '0',
                'xendit_active_methods' => json_encode(config('services.xendit.active_methods', ['qris'])),
                'has_xendit_secret_key' => filled(config('services.xendit.secret_key')),
                'has_xendit_webhook_token' => filled(config('services.xendit.webhook_token')),
            ],
            'printers' => Printer::query()->with(['kitchenStation:id,name', 'barStation:id,name'])->orderBy('name')->get(),
            'kitchenStations' => KitchenStation::query()->orderBy('name')->get(['id', 'name']),
            'barStations' => BarStation::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'restaurant_name' => ['nullable', 'string', 'max:255'],
            'restaurant_address' => ['nullable', 'string', 'max:1000'],
            'restaurant_phone' => ['nullable', 'string', 'max:50'],
            'receipt_header' => ['nullable', 'string', 'max:1000'],
            'receipt_footer' => ['nullable', 'string', 'max:1000'],
            'tax_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tax_is_active' => ['required', 'boolean'],
            'service_charge_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'service_charge_is_active' => ['required', 'boolean'],
        ]);

        $oldValue = collect($validated)->keys()->mapWithKeys(fn ($key) => [$key => str_contains($key, 'key') || str_contains($key, 'token') ? '[redacted]' : SystemSettings::get($key)])->all();

        foreach ($validated as $key => $value) {
            SystemSettings::set($key, is_array($value) ? json_encode($value) : (string) $value);
        }

        $this->audit($request, 'settings.system.updated', SystemSettings::class, null, $oldValue, ['keys' => array_keys($validated)]);

        return back()->with('success', 'System settings berhasil diperbarui.');
    }

    public function storePrinter(Request $request): RedirectResponse
    {
        Printer::query()->create($this->printerData($request));

        return back()->with('success', 'Printer berhasil ditambahkan.');
    }

    public function updatePrinter(Request $request, Printer $printer): RedirectResponse
    {
        $printer->update($this->printerData($request));

        return back()->with('success', 'Printer berhasil diperbarui.');
    }

    private function printerData(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:kasir,kitchen,bar'],
            'ip_address' => ['nullable', 'string', 'max:255'],
            'port' => ['required', 'integer', 'min:1', 'max:65535'],
            'paper_width' => ['required', 'in:58mm,80mm'],
            'is_active' => ['required', 'boolean'],
            'kitchen_station_id' => ['nullable', 'exists:kitchen_stations,id'],
            'bar_station_id' => ['nullable', 'exists:bar_stations,id'],
        ]);
    }

    private function audit(Request $request, string $action, string $resourceType, ?int $resourceId, ?array $oldValue, array $newValue): void
    {
        AuditLog::query()->create([
            'user_id' => $request->user()->id,
            'role' => $request->user()->role,
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'ip_address' => $request->ip(),
        ]);
    }
}
