<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Models\Table;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CashierTableController extends Controller
{
    /**
     * Table management for the cashier — used when the restaurant has no
     * waiter, so the cashier is responsible for table status.
     */
    public function index(): Response
    {
        $tables = Table::query()
            ->with('zone:id,name,color_hex')
            ->orderBy('name')
            ->get(['id', 'name', 'zone_id', 'status', 'capacity']);

        return Inertia::render('Pos/Tables', [
            'tables' => $tables,
        ]);
    }

    public function updateStatus(Request $request, Table $table): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:available,occupied,open_bill,reserved'],
        ]);

        $table->update(['status' => $validated['status']]);

        return back()->with('success', "Meja {$table->name} → {$validated['status']}.");
    }
}
