<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('pos.{kasirId}', function (User $user, int $kasirId): bool {
    return $user->id === $kasirId && $user->can('pos.view');
});

Broadcast::channel('dashboard', function (User $user): bool {
    return $user->can('dashboard.view');
});
