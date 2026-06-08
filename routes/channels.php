<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('pos.{kasirId}', function (User $user, int $kasirId): bool {
    return $user->id === $kasirId && $user->can('pos.view');
});

Broadcast::channel('dashboard', function (User $user): bool {
    return $user->can('dashboard.view');
});

// Kitchen station channel — scoped per station
Broadcast::channel('kitchen.station.{stationId}', function (User $user, int $stationId): bool {
    return $user->kitchen_station_id === $stationId && $user->can('kitchen.view');
});

// Bar station channel — scoped per station
Broadcast::channel('bar.station.{stationId}', function (User $user, int $stationId): bool {
    return $user->bar_station_id === $stationId && $user->can('bar.view');
});

// Waiter zone channel
Broadcast::channel('waiter.zone.{zoneId}', function (User $user, int $zoneId): bool {
    return $user->can('waiter.view');
});
