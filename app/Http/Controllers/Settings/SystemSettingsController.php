<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\Printer;
use App\Models\Restaurant;
use App\Models\SystemSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SystemSettingsController extends Controller
{
    public function index(): Response
    {
        $restaurantId = session('active_restaurant_id');
        $restaurant = Restaurant::withoutGlobalScopes()->find($restaurantId);

        return Inertia::render('Settings/System', [
            'settings' => [
                // Restaurant-level settings now come from the restaurant model
                'restaurant_name' => $restaurant?->name,
                'restaurant_address' => $restaurant?->address,
                'restaurant_phone' => $restaurant?->phone,
                'receipt_header' => $restaurant?->receipt_header,
                'receipt_footer' => $restaurant?->receipt_footer,
                'tax_percentage' => $restaurant?->tax_percentage ?? '0',
                'tax_is_active' => $restaurant?->tax_is_active ? '1' : '0',
                'service_charge_percentage' => $restaurant?->service_charge_percentage ?? '0',
                'service_charge_is_active' => $restaurant?->service_charge_is_active ? '1' : '0',
                // Global settings (Xendit) - still from config
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

        $restaurantId = session('active_restaurant_id');
        $restaurant = Restaurant::withoutGlobalScopes()->findOrFail($restaurantId);

        $oldValue = [
            'name' => $restaurant->name,
            'address' => $restaurant->address,
            'phone' => $restaurant->phone,
            'receipt_header' => $restaurant->receipt_header,
            'receipt_footer' => $restaurant->receipt_footer,
            'tax_percentage' => $restaurant->tax_percentage,
            'tax_is_active' => $restaurant->tax_is_active,
            'service_charge_percentage' => $restaurant->service_charge_percentage,
            'service_charge_is_active' => $restaurant->service_charge_is_active,
        ];

        $restaurant->update([
            'name' => $validated['restaurant_name'] ?? $restaurant->name,
            'address' => $validated['restaurant_address'],
            'phone' => $validated['restaurant_phone'],
            'receipt_header' => $validated['receipt_header'],
            'receipt_footer' => $validated['receipt_footer'],
            'tax_percentage' => $validated['tax_percentage'] ?? 0,
            'tax_is_active' => $validated['tax_is_active'],
            'service_charge_percentage' => $validated['service_charge_percentage'] ?? 0,
            'service_charge_is_active' => $validated['service_charge_is_active'],
        ]);

        $this->audit($request, 'settings.system.updated', Restaurant::class, $restaurant->id, $oldValue, $validated);

        return back()->with('success', 'Pengaturan restoran berhasil diperbarui.');
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
            'role' => $request->user()->roleInRestaurant(session('active_restaurant_id')),
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'ip_address' => $request->ip(),
        ]);
    }
}
