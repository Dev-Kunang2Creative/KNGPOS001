<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Models\Table;
use App\Services\AuditLogger;
use App\Services\TableMergeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use RuntimeException;

class TableMergeController extends Controller
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function merge(Request $request, TableMergeService $mergeService): RedirectResponse
    {
        $validated = $request->validate([
            'target_table_id' => ['required', 'integer', 'exists:tables,id'],
            'table_ids' => ['required', 'array', 'min:1'],
            'table_ids.*' => ['integer', 'distinct', 'different:target_table_id', 'exists:tables,id'],
        ], [
            'table_ids.required' => 'Pilih minimal satu meja lain untuk digabung.',
            'table_ids.*.different' => 'Meja utama tidak boleh dipilih lagi sebagai meja yang digabung.',
        ]);

        try {
            $order = $mergeService->merge(
                targetTableId: (int) $validated['target_table_id'],
                sourceTableIds: array_map(intval(...), $validated['table_ids']),
                kasir: $request->user(),
            );
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        $this->auditLogger->log('pos.tables.merge', 'Order', $order->id, null, [
            'target_table_id' => (int) $validated['target_table_id'],
            'source_table_ids' => array_map(intval(...), $validated['table_ids']),
        ]);

        return back()->with('success', "Meja berhasil digabung. Bill jadi satu di meja {$order->table?->name} (Order #{$order->id}).");
    }

    public function unmerge(Request $request, Table $table, TableMergeService $mergeService): RedirectResponse
    {
        try {
            $released = $mergeService->unmerge($table);
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        $this->auditLogger->log('pos.tables.unmerge', 'Table', $table->id, null, ['released' => $released]);

        return back()->with('success', "Gabungan meja {$table->name} dipisahkan ({$released} meja dilepas). Bill tetap di meja {$table->name}.");
    }
}
