<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('AuditLogs/Index', [
            'logs' => AuditLog::query()
                ->with('user:id,name,email')
                ->latest('created_at')
                ->paginate(50)
                ->through(fn (AuditLog $log) => [
                    'id' => $log->id,
                    'user' => $log->user?->only(['id', 'name', 'email']),
                    'role' => $log->role,
                    'action' => $log->action,
                    'resource_type' => $log->resource_type,
                    'resource_id' => $log->resource_id,
                    'old_value' => $log->old_value,
                    'new_value' => $log->new_value,
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at,
                ]),
        ]);
    }
}
