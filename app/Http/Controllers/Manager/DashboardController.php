<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(ReportService $reportService): Response
    {
        return Inertia::render('Dashboard/Index', [
            'metrics' => $reportService->dashboardMetrics(),
        ]);
    }
}
