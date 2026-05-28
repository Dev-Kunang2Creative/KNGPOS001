<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\BarStation;
use App\Models\KitchenStation;
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

class UserManagementController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Users/Index', [
            'users' => User::query()
                ->with(['roles:id,name'])
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'role', 'kitchen_station_id', 'bar_station_id', 'is_active']),
            'kitchenStations' => KitchenStation::query()->orderBy('name')->get(['id', 'name']),
            'barStations' => BarStation::query()->orderBy('name')->get(['id', 'name']),
            'zones' => Zone::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $zoneIds = $data['zone_ids'] ?? [];
        unset($data['zone_ids']);

        $user = User::query()->create([
            ...$data,
            'password' => Hash::make($request->input('password', 'password')),
            'must_change_password' => true,
        ]);
        $user->syncRoles([$this->role($data['role'])]);
        $this->syncWaiterZones($user, $zoneIds);
        $this->audit($request, 'user.created', User::class, $user->id, null, $user->only(['name', 'email', 'role']));

        return back()->with('success', 'User berhasil dibuat.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $oldRole = $user->role;
        $data = $this->validated($request, $user);
        $zoneIds = $data['zone_ids'] ?? [];
        unset($data['zone_ids']);
        unset($data['password']);

        $user->update($data);
        $user->syncRoles([$this->role($data['role'])]);
        $this->syncWaiterZones($user, $zoneIds);

        if ($oldRole !== $data['role']) {
            $this->audit($request, 'user.role.updated', User::class, $user->id, ['role' => $oldRole], ['role' => $data['role']]);
        }

        return back()->with('success', 'User berhasil diperbarui.');
    }

    public function resetPassword(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate(['password' => ['required', 'string', 'min:8']]);

        $user->update([
            'password' => Hash::make($validated['password']),
            'must_change_password' => true,
        ]);

        $this->audit($request, 'user.password.reset', User::class, $user->id, null, ['must_change_password' => true]);

        return back()->with('success', 'Password user berhasil direset.');
    }

    public function updateStatus(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate(['is_active' => ['required', 'boolean']]);
        $oldValue = ['is_active' => $user->is_active];

        $user->update($validated);
        $this->audit($request, 'user.status.updated', User::class, $user->id, $oldValue, $validated);

        return back()->with('success', 'Status user berhasil diperbarui.');
    }

    private function validated(Request $request, ?User $user = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user)],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['super_admin', 'manager', 'kasir', 'waiter', 'dapur', 'bar'])],
            'kitchen_station_id' => ['nullable', 'exists:kitchen_stations,id'],
            'bar_station_id' => ['nullable', 'exists:bar_stations,id'],
            'is_active' => ['required', 'boolean'],
            'zone_ids' => ['nullable', 'array'],
            'zone_ids.*' => ['exists:zones,id'],
        ]);
    }

    private function syncWaiterZones(User $user, array $zoneIds): void
    {
        if ($user->role !== 'waiter') {
            WaiterZoneAssignment::query()->where('user_id', $user->id)->delete();

            return;
        }

        WaiterZoneAssignment::query()->where('user_id', $user->id)->whereNotIn('zone_id', $zoneIds)->delete();

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
