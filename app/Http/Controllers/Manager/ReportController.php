<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class ReportController extends Controller
{
    public function cashier(Request $request, ReportService $reportService): Response
    {
        return Inertia::render('Reports/Cashier', $this->cashierReportData($request, $reportService));
    }

    public function cashierExportExcel(Request $request, ReportService $reportService): HttpResponse
    {
        $report = $this->cashierReportData($request, $reportService);

        return response(view('reports.cashier-excel', $report)->render(), 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$this->cashierExportFilename($report, 'xls').'"',
        ]);
    }

    public function cashierExportPdf(Request $request, ReportService $reportService): HttpResponse
    {
        $report = $this->cashierReportData($request, $reportService);

        return Pdf::loadView('reports.cashier-pdf', $report)
            ->setPaper('a4', 'landscape')
            ->download($this->cashierExportFilename($report, 'pdf'));
    }

    /**
     * @return array{rows: list<array<string, mixed>>, filters: array{from: string, to: string, cashier_id: ?int, shift_id: ?int}, cashiers: mixed, shifts: mixed}
     */
    private function cashierReportData(Request $request, ReportService $reportService): array
    {
        return $reportService->cashierReport(
            from: $request->query('from'),
            to: $request->query('to'),
            cashierId: $request->integer('cashier_id') ?: null,
            shiftId: $request->integer('shift_id') ?: null,
        );
    }

    /**
     * @param  array{filters: array{from: string, to: string}}  $report
     */
    private function cashierExportFilename(array $report, string $extension): string
    {
        return sprintf('laporan-kasir-%s-sd-%s.%s', $report['filters']['from'], $report['filters']['to'], $extension);
    }
}
