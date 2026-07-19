<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan Kasir</title>
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { font-size: 11px; color: #111; }
        h1 { font-size: 16px; margin: 0 0 2px; }
        .period { color: #555; margin: 0 0 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #999; padding: 5px 7px; }
        th { background: #f0f0f0; text-align: left; }
        td.number, th.number { text-align: right; }
        tr.total td { background: #f0f0f0; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Laporan Kasir</h1>
    <p class="period">Periode: {{ \Illuminate\Support\Carbon::parse($filters['from'])->isoFormat('D MMMM Y') }} — {{ \Illuminate\Support\Carbon::parse($filters['to'])->isoFormat('D MMMM Y') }}</p>
    <table>
        <thead>
            <tr>
                <th>Kasir</th>
                <th class="number">Trx</th>
                <th class="number">Cash</th>
                <th class="number">QRIS</th>
                <th class="number">Ewallet</th>
                <th class="number">Bank</th>
                <th class="number">VA</th>
                <th class="number">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($rows as $row)
                <tr @class(['total' => $row['is_total']])>
                    <td>{{ $row['kasir_name'] }}</td>
                    <td class="number">{{ $row['total_transactions'] }}</td>
                    <td class="number">Rp {{ number_format($row['cash'], 0, ',', '.') }}</td>
                    <td class="number">Rp {{ number_format($row['qris'], 0, ',', '.') }}</td>
                    <td class="number">Rp {{ number_format($row['ewallet'], 0, ',', '.') }}</td>
                    <td class="number">Rp {{ number_format($row['bank_transfer'], 0, ',', '.') }}</td>
                    <td class="number">Rp {{ number_format($row['va'], 0, ',', '.') }}</td>
                    <td class="number">Rp {{ number_format($row['total_revenue'], 0, ',', '.') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
