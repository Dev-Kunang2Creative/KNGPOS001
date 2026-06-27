<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        p { margin-top: 0; color: #4b5563; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background: #f3f4f6; }
        .total { font-weight: bold; background: #f9fafb; }
    </style>
</head>
<body>
    <h1>Laporan Kasir</h1>
    <p>Periode {{ $report['filters']['from'] }} sampai {{ $report['filters']['to'] }}</p>
    <table>
        <thead>
            <tr>
                <th>Kasir</th>
                <th>Transaksi</th>
                <th>Cash</th>
                <th>QRIS</th>
                <th>Ewallet</th>
                <th>Bank Transfer</th>
                <th>VA</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($report['rows'] as $row)
                <tr class="{{ $row['is_total'] ? 'total' : '' }}">
                    <td>{{ $row['kasir_name'] }}</td>
                    <td>{{ $row['total_transactions'] }}</td>
                    <td>{{ number_format($row['cash'], 0, ',', '.') }}</td>
                    <td>{{ number_format($row['qris'], 0, ',', '.') }}</td>
                    <td>{{ number_format($row['ewallet'], 0, ',', '.') }}</td>
                    <td>{{ number_format($row['bank_transfer'], 0, ',', '.') }}</td>
                    <td>{{ number_format($row['va'], 0, ',', '.') }}</td>
                    <td>{{ number_format($row['total_revenue'], 0, ',', '.') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
