<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));
        $action = trim((string) $request->input('action', ''));
        $from = $request->input('from');
        $to = $request->input('to');

        $logs = AuditLog::query()
            ->with('user:id,name,email')
            ->when($action !== '', fn ($query) => $query->where('action', $action))
            ->when($search !== '', fn ($query) => $query->where(function ($inner) use ($search): void {
                $inner->where('action', 'like', "%{$search}%")
                    ->orWhere('resource_type', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($user) => $user
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            }))
            ->when($from, fn ($query) => $query->whereDate('created_at', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('created_at', '<=', $to))
            ->latest('created_at')
            ->paginate(25)
            ->withQueryString()
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
            ]);

        return Inertia::render('AuditLogs/Index', [
            'logs' => $logs,
            'filters' => [
                'search' => $search,
                'action' => $action,
                'from' => $from,
                'to' => $to,
            ],
            'actions' => AuditLog::query()
                ->select('action')
                ->distinct()
                ->orderBy('action')
                ->pluck('action'),
        ]);
    }
}
