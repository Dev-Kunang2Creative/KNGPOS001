<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    public function exportCashier(Request $request, ReportService $reportService): SymfonyResponse|StreamedResponse
    {
        $report = $reportService->cashierReport(
            from: $request->input('from'),
            to: $request->input('to'),
            cashierId: $request->integer('cashier_id') ?: null,
            shiftId: $request->integer('shift_id') ?: null,
        );

        if ($request->input('format') === 'pdf') {
            return Pdf::loadView('reports.cashier-pdf', ['report' => $report])
                ->setPaper('a4', 'landscape')
                ->download('laporan-kasir.pdf');
        }

        return response()->streamDownload(function () use ($report): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Kasir', 'Transaksi', 'Cash', 'QRIS', 'Ewallet', 'Bank Transfer', 'VA', 'Total']);

            foreach ($report['rows'] as $row) {
                fputcsv($handle, [
                    $row['kasir_name'],
                    $row['total_transactions'],
                    $row['cash'],
                    $row['qris'],
                    $row['ewallet'],
                    $row['bank_transfer'],
                    $row['va'],
                    $row['total_revenue'],
                ]);
            }

            fclose($handle);
        }, 'laporan-kasir.csv', ['Content-Type' => 'text/csv']);
    }
}
