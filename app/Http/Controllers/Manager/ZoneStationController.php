<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Http\Requests\Manager\StoreStationRequest;
use App\Http\Requests\Manager\StoreZoneRequest;
use App\Http\Requests\Manager\UpdateZoneRequest;
use App\Http\Requests\Manager\WaiterZoneAssignmentRequest;
use App\Http\Requests\Manager\ZoneAssignmentRequest;
use App\Models\AuditLog;
use App\Models\BarOrder;
use App\Models\BarStation;
use App\Models\KitchenOrder;
use App\Models\KitchenStation;
use App\Models\RestaurantUser;
use App\Models\User;
use App\Models\WaiterZoneAssignment;
use App\Models\Zone;
use App\Models\ZoneStationAssignment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ZoneStationController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Zones/Index', [
            'zones' => Zone::query()
                ->with(['assignment.kitchenStation', 'assignment.barStation', 'waiters:id,name,email'])
                ->withCount('tables')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
            'kitchenStations' => KitchenStation::query()
                ->withCount('activeOrders')
                ->orderBy('name')
                ->get(),
            'barStations' => BarStation::query()
                ->withCount('activeOrders')
                ->orderBy('name')
                ->get(),
            'waiters' => User::query()
                ->whereHas('restaurantUsers', fn ($q) => $q
                    ->where('restaurant_id', session('active_restaurant_id'))
                    ->where('role', 'waiter'))
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'email']),
            'allZonesAssigned' => ! Zone::query()->whereDoesntHave('assignment')->exists(),
        ]);
    }

    public function storeZone(StoreZoneRequest $request): RedirectResponse
    {
        Zone::query()->create($request->validated());

        return back()->with('success', 'Zona berhasil dibuat.');
    }

    public function updateZone(UpdateZoneRequest $request, Zone $zone): RedirectResponse
    {
        $zone->update($request->validated());

        return back()->with('success', 'Zona berhasil diperbarui.');
    }

    public function destroyZone(Zone $zone): RedirectResponse
    {
        if ($zone->tables()->whereNull('deleted_at')->exists()) {
            return back()->with('error', 'Zona tidak bisa dihapus karena masih memiliki meja aktif.');
        }

        $zone->delete();

        return back()->with('success', 'Zona berhasil dihapus.');
    }

    public function updateAssignment(ZoneAssignmentRequest $request, Zone $zone): RedirectResponse
    {
        $oldValue = $zone->assignment()->first()?->only(['kitchen_station_id', 'bar_station_id']);

        $assignment = ZoneStationAssignment::query()->updateOrCreate(
            ['zone_id' => $zone->id],
            [
                ...$request->validated(),
                'assigned_by' => $request->user()->id,
                'assigned_at' => now(),
            ],
        );

        $this->audit($request, 'zone.assignment.updated', Zone::class, $zone->id, $oldValue, $assignment->only(['kitchen_station_id', 'bar_station_id']));

        return back()->with('success', 'Assignment zona berhasil diperbarui.');
    }

    public function assignWaiter(WaiterZoneAssignmentRequest $request, Zone $zone): RedirectResponse
    {
        $waiter = User::query()
            ->whereHas('restaurantUsers', fn ($q) => $q
                ->where('restaurant_id', session('active_restaurant_id'))
                ->where('role', 'waiter'))
            ->findOrFail($request->validated('user_id'));

        WaiterZoneAssignment::query()->updateOrCreate(
            ['user_id' => $waiter->id, 'zone_id' => $zone->id],
            ['assigned_at' => now()],
        );

        return back()->with('success', 'Waiter berhasil ditugaskan.');
    }

    public function unassignWaiter(Request $request, Zone $zone, User $user): RedirectResponse
    {
        WaiterZoneAssignment::query()
            ->where('zone_id', $zone->id)
            ->where('user_id', $user->id)
            ->delete();

        return back()->with('success', 'Waiter berhasil dilepas dari zona.');
    }

    public function storeKitchenStation(StoreStationRequest $request): RedirectResponse
    {
        KitchenStation::query()->create($request->validated());

        return back()->with('success', 'Kitchen station berhasil dibuat.');
    }

    public function updateKitchenStation(StoreStationRequest $request, KitchenStation $station): RedirectResponse
    {
        $station->update($request->validated());

        return back()->with('success', 'Kitchen station berhasil diperbarui.');
    }

    public function destroyKitchenStation(KitchenStation $station): RedirectResponse
    {
        if (KitchenOrder::query()->where('kitchen_station_id', $station->id)->whereIn('status', ['queued', 'in_progress'])->exists()) {
            return back()->with('error', 'Kitchen station tidak bisa dihapus karena masih memiliki order aktif.');
        }

        $station->delete();

        return back()->with('success', 'Kitchen station berhasil dihapus.');
    }

    public function storeBarStation(StoreStationRequest $request): RedirectResponse
    {
        BarStation::query()->create($request->validated());

        return back()->with('success', 'Bar station berhasil dibuat.');
    }

    public function updateBarStation(StoreStationRequest $request, BarStation $station): RedirectResponse
    {
        $station->update($request->validated());

        return back()->with('success', 'Bar station berhasil diperbarui.');
    }

    public function destroyBarStation(BarStation $station): RedirectResponse
    {
        if (BarOrder::query()->where('bar_station_id', $station->id)->whereIn('status', ['queued', 'in_progress'])->exists()) {
            return back()->with('error', 'Bar station tidak bisa dihapus karena masih memiliki order aktif.');
        }

        $station->delete();

        return back()->with('success', 'Bar station berhasil dihapus.');
    }

    private function audit(Request $request, string $action, string $resourceType, int $resourceId, ?array $oldValue, array $newValue): void
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
