<?php

namespace Database\Seeders;

use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\User;
use App\Models\WaiterZoneAssignment;
use App\Models\Zone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class StaffSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'pos.view', 'pos.create', 'pos.cancel', 'pos.checkout', 'pos.void',
            'shift.view', 'shift.open', 'shift.close',
            'kitchen.view', 'kitchen.update', 'kitchen.manage',
            'bar.view', 'bar.update',
            'waiter.view', 'waiter.update',
            'tables.view', 'tables.manage',
            'dashboard.view',
            'reports.view', 'reports.export',
            'zones.manage',
            'menu.view', 'menu.manage',
            'users.view', 'users.manage',
            'settings.view', 'settings.manage',
            'audit.view',
        ];

        foreach ($permissions as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $roles = [
            'super_admin' => $permissions,
            'manager' => [
                'dashboard.view', 'reports.view', 'reports.export', 'zones.manage',
                'menu.view', 'menu.manage', 'users.view', 'users.manage',
                'settings.view', 'settings.manage', 'audit.view',
                'kitchen.manage', 'tables.view', 'tables.manage',
            ],
            'kasir' => ['pos.view', 'pos.create', 'pos.cancel', 'pos.checkout', 'pos.void', 'shift.view', 'shift.open', 'shift.close', 'tables.view', 'menu.view'],
            'waiter' => ['waiter.view', 'waiter.update', 'tables.view'],
            'dapur' => ['kitchen.view', 'kitchen.update'],
            'bar' => ['bar.view', 'bar.update'],
        ];

        foreach ($roles as $roleName => $rolePermissions) {
            Role::query()->firstOrCreate(['name' => $roleName, 'guard_name' => 'web'])
                ->syncPermissions($rolePermissions);
        }

        $kitchen1 = KitchenStation::query()->where('name', 'Kitchen 1')->first();
        $kitchen2 = KitchenStation::query()->where('name', 'Kitchen 2')->first();
        $bar1 = BarStation::query()->where('name', 'Bar 1')->first();
        $bar2 = BarStation::query()->where('name', 'Bar 2')->first();

        $staff = [
            ['Super Admin', 'superadmin@karcisqu.test', 'super_admin'],
            ['Manager', 'manager@karcisqu.test', 'manager'],
            ['Kasir 1', 'kasir1@karcisqu.test', 'kasir'],
            ['Kasir 2', 'kasir2@karcisqu.test', 'kasir'],
            ['Waiter Indoor', 'waiter.indoor@karcisqu.test', 'waiter'],
            ['Waiter Outdoor', 'waiter.outdoor@karcisqu.test', 'waiter'],
            ['Waiter VIP', 'waiter.vip@karcisqu.test', 'waiter'],
            ['Dapur 1', 'dapur1@karcisqu.test', 'dapur', $kitchen1?->id, null],
            ['Dapur 2', 'dapur2@karcisqu.test', 'dapur', $kitchen2?->id, null],
            ['Bar 1', 'bar1@karcisqu.test', 'bar', null, $bar1?->id],
            ['Bar 2', 'bar2@karcisqu.test', 'bar', null, $bar2?->id],
        ];

        foreach ($staff as $person) {
            [$name, $email, $role, $kitchenStationId, $barStationId] = array_pad($person, 5, null);

            $user = User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => Hash::make('password'),
                    'role' => $role,
                    'kitchen_station_id' => $kitchenStationId,
                    'bar_station_id' => $barStationId,
                    'is_active' => true,
                    'must_change_password' => true,
                    'email_verified_at' => now(),
                ],
            );

            $user->syncRoles([$role]);
        }

        $waiterZones = [
            'waiter.indoor@karcisqu.test' => 'Indoor',
            'waiter.outdoor@karcisqu.test' => 'Outdoor',
            'waiter.vip@karcisqu.test' => 'VIP',
        ];

        foreach ($waiterZones as $email => $zoneName) {
            $user = User::query()->where('email', $email)->first();
            $zone = Zone::query()->where('name', $zoneName)->first();

            if ($user && $zone) {
                WaiterZoneAssignment::query()->updateOrCreate(
                    ['user_id' => $user->id, 'zone_id' => $zone->id],
                    ['assigned_at' => now()],
                );
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
