<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class AuditLogger
{
    public function __construct(private RestaurantContext $context) {}

    /**
     * Record a sensitive action in the audit trail. The restaurant is applied
     * automatically via the BelongsToRestaurant scope; the role is resolved
     * from the user's membership in the active restaurant.
     *
     * @param  array<string, mixed>|null  $oldValue
     * @param  array<string, mixed>|null  $newValue
     */
    public function log(
        string $action,
        string $resourceType,
        ?int $resourceId = null,
        ?array $oldValue = null,
        ?array $newValue = null,
        ?User $user = null,
    ): AuditLog {
        $user ??= Auth::user();

        return AuditLog::query()->create([
            'user_id' => $user?->id,
            'role' => $user?->roleInRestaurant($this->context->id()),
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'ip_address' => request()?->ip(),
        ]);
    }
}
