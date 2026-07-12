<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function cashier(Request $request, ReportService $reportService): Response
    {
        return Inertia::render('Reports/Cashier', $reportService->cashierReport(
            from: $request->query('from'),
            to: $request->query('to'),
            cashierId: $request->integer('cashier_id') ?: null,
            shiftId: $request->integer('shift_id') ?: null,
        ));
    }
}
