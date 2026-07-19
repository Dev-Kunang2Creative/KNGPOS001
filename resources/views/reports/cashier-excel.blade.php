<html lang="id">
<head>
    <meta charset="UTF-8">
</head>
<body>
    <table border="1">
        <tr>
            <td colspan="8"><b>Laporan Kasir</b></td>
        </tr>
        <tr>
            <td colspan="8">Periode: {{ $filters['from'] }} s.d. {{ $filters['to'] }}</td>
        </tr>
        <tr>
            <th>Kasir</th>
            <th>Trx</th>
            <th>Cash</th>
            <th>QRIS</th>
            <th>Ewallet</th>
            <th>Bank</th>
            <th>VA</th>
            <th>Total</th>
        </tr>
        @foreach ($rows as $row)
            <tr>
                <td @if ($row['is_total']) style="font-weight:bold" @endif>{{ $row['kasir_name'] }}</td>
                <td>{{ $row['total_transactions'] }}</td>
                <td>{{ $row['cash'] }}</td>
                <td>{{ $row['qris'] }}</td>
                <td>{{ $row['ewallet'] }}</td>
                <td>{{ $row['bank_transfer'] }}</td>
                <td>{{ $row['va'] }}</td>
                <td>{{ $row['total_revenue'] }}</td>
            </tr>
        @endforeach
    </table>
</body>
</html>
