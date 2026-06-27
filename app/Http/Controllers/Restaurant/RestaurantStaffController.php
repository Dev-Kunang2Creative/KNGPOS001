<?php

namespace App\Http\Controllers\Restaurant;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\RestaurantUser;
use App\Models\User;
use App\Models\WaiterZoneAssignment;
use App\Models\Zone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class RestaurantStaffController extends Controller
{
    public function index(Request $request): Response
    {
        $restaurantId = session('active_restaurant_id');

        $staff = RestaurantUser::query()
            ->where('restaurant_id', $restaurantId)
            ->with(['user' => function ($query) {
                $query->withoutGlobalScopes()
                    ->select(['id', 'name', 'email', 'kitchen_station_id', 'bar_station_id', 'is_active']);
            }])
            ->get();

        $zoneIdsByUser = WaiterZoneAssignment::query()
            ->whereIn('user_id', $staff->pluck('user.id'))
            ->get(['user_id', 'zone_id'])
            ->groupBy('user_id')
            ->map(fn ($rows) => $rows->pluck('zone_id')->values());

        $staff = $staff->map(function (RestaurantUser $ru) use ($zoneIdsByUser) {
            return [
                'id' => $ru->user->id,
                'name' => $ru->user->name,
                'email' => $ru->user->email,
                'role' => $ru->role,
                'kitchen_station_id' => $ru->user->kitchen_station_id,
                'bar_station_id' => $ru->user->bar_station_id,
                'is_active' => $ru->user->is_active,
                'is_primary' => $ru->is_primary,
                'restaurant_user_id' => $ru->id,
                'zone_ids' => $zoneIdsByUser->get($ru->user->id, collect())->all(),
            ];
        });

        return Inertia::render('Users/Index', [
            'users' => $staff,
            'kitchenStations' => KitchenStation::query()->orderBy('name')->get(['id', 'name']),
            'barStations' => BarStation::query()->orderBy('name')->get(['id', 'name']),
            'zones' => Zone::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $restaurantId = session('active_restaurant_id');
        $zoneIds = $data['zone_ids'] ?? [];
        unset($data['zone_ids']);

        // Check if user already exists by email
        $user = User::withoutGlobalScopes()
            ->where('email', $data['email'])
            ->first();

        if ($user) {
            // Check if already assigned to this restaurant
            $exists = RestaurantUser::query()
                ->where('restaurant_id', $restaurantId)
                ->where('user_id', $user->id)
                ->exists();

            if ($exists) {
                return back()->with('error', 'User sudah terdaftar di restoran ini.');
            }
        } else {
            // Create new user
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($request->input('password', 'password')),
                'kitchen_station_id' => $data['kitchen_station_id'] ?? null,
                'bar_station_id' => $data['bar_station_id'] ?? null,
                'is_active' => $data['is_active'] ?? true,
                'must_change_password' => true,
            ]);
        }

        // Assign Spatie role
        $user->syncRoles([$this->role($data['role'])]);

        // Assign to restaurant
        RestaurantUser::query()->create([
            'restaurant_id' => $restaurantId,
            'user_id' => $user->id,
            'role' => $data['role'],
        ]);

        // Sync waiter zones
        $this->syncWaiterZones($user, $zoneIds);

        $this->audit($request, 'user.created', User::class, $user->id, null, $user->only(['name', 'email']) + ['role' => $data['role']]);

        return back()->with('success', 'Staff berhasil ditambahkan.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $restaurantId = session('active_restaurant_id');
        $data = $this->validated($request, $user);
        $zoneIds = $data['zone_ids'] ?? [];
        unset($data['zone_ids'], $data['password']);

        // Update user basic info
        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
            'kitchen_station_id' => $data['kitchen_station_id'] ?? null,
            'bar_station_id' => $data['bar_station_id'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        // Update role in restaurant_users
        RestaurantUser::query()
            ->where('restaurant_id', $restaurantId)
            ->where('user_id', $user->id)
            ->update(['role' => $data['role']]);

        // Sync Spatie role
        $user->syncRoles([$this->role($data['role'])]);

        // Sync waiter zones
        $this->syncWaiterZones($user, $zoneIds);

        return back()->with('success', 'Staff berhasil diperbarui.');
    }

    public function resetPassword(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate(['password' => ['required', 'string', 'min:8']]);

        $user->update([
            'password' => Hash::make($validated['password']),
            'must_change_password' => true,
        ]);

        $this->audit($request, 'user.password.reset', User::class, $user->id, null, ['must_change_password' => true]);

        return back()->with('success', 'Password staff berhasil direset.');
    }

    public function updateStatus(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate(['is_active' => ['required', 'boolean']]);
        $oldValue = ['is_active' => $user->is_active];

        $user->update($validated);
        $this->audit($request, 'user.status.updated', User::class, $user->id, $oldValue, $validated);

        return back()->with('success', 'Status staff berhasil diperbarui.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $restaurantId = session('active_restaurant_id');

        RestaurantUser::query()
            ->where('restaurant_id', $restaurantId)
            ->where('user_id', $user->id)
            ->delete();

        $this->audit($request, 'user.removed_from_restaurant', User::class, $user->id, null, ['restaurant_id' => $restaurantId]);

        return back()->with('success', 'Staff berhasil dikeluarkan dari restoran.');
    }

    private function validated(Request $request, ?User $user = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user)],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['manager', 'kasir', 'waiter', 'dapur', 'bar'])],
            'kitchen_station_id' => ['nullable', 'exists:kitchen_stations,id'],
            'bar_station_id' => ['nullable', 'exists:bar_stations,id'],
            'is_active' => ['required', 'boolean'],
            'zone_ids' => ['nullable', 'array'],
            'zone_ids.*' => ['exists:zones,id'],
        ]);
    }

    private function syncWaiterZones(User $user, array $zoneIds): void
    {
        $restaurantRole = RestaurantUser::query()
            ->where('restaurant_id', session('active_restaurant_id'))
            ->where('user_id', $user->id)
            ->value('role');

        if ($restaurantRole !== 'waiter') {
            WaiterZoneAssignment::query()
                ->where('user_id', $user->id)
                ->delete();

            return;
        }

        WaiterZoneAssignment::query()
            ->where('user_id', $user->id)
            ->whereNotIn('zone_id', $zoneIds)
            ->delete();

        foreach ($zoneIds as $zoneId) {
            WaiterZoneAssignment::query()->updateOrCreate(
                ['user_id' => $user->id, 'zone_id' => $zoneId],
                ['assigned_at' => now()],
            );
        }
    }

    private function role(string $roleName): Role
    {
        return Role::query()->firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
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
