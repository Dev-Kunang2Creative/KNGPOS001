<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Struk Pembayaran</title>
</head>
<body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
    <h1 style="font-size: 20px; margin-bottom: 4px;">Struk Pembayaran</h1>
    <p style="margin-top: 0;">Terima kasih, {{ $selfOrder->customer_name }}.</p>

    <table style="width: 100%; max-width: 560px; border-collapse: collapse; margin: 16px 0;">
        <tr>
            <td style="padding: 4px 0;">Order</td>
            <td style="padding: 4px 0; text-align: right;">#{{ $order->id }}</td>
        </tr>
        <tr>
            <td style="padding: 4px 0;">Meja</td>
            <td style="padding: 4px 0; text-align: right;">{{ $order->table?->name ?? '-' }}</td>
        </tr>
        <tr>
            <td style="padding: 4px 0;">Kasir</td>
            <td style="padding: 4px 0; text-align: right;">{{ $order->transaction?->cashier?->name ?? '-' }}</td>
        </tr>
        <tr>
            <td style="padding: 4px 0;">Waktu Bayar</td>
            <td style="padding: 4px 0; text-align: right;">{{ $order->transaction?->paid_at?->timezone(config('app.timezone'))->format('d/m/Y H:i') }}</td>
        </tr>
    </table>

    <table style="width: 100%; max-width: 560px; border-collapse: collapse;">
        <thead>
            <tr>
                <th style="border-bottom: 1px solid #d1d5db; padding: 8px 0; text-align: left;">Item</th>
                <th style="border-bottom: 1px solid #d1d5db; padding: 8px 0; text-align: right;">Qty</th>
                <th style="border-bottom: 1px solid #d1d5db; padding: 8px 0; text-align: right;">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($order->items as $item)
                <tr>
                    <td style="border-bottom: 1px solid #e5e7eb; padding: 8px 0;">
                        {{ $item->menuItem?->name ?? 'Item' }}
                        @if ($item->notes)
                            <br><span style="font-size: 12px; color: #6b7280;">{{ $item->notes }}</span>
                        @endif
                    </td>
                    <td style="border-bottom: 1px solid #e5e7eb; padding: 8px 0; text-align: right;">{{ $item->quantity }}</td>
                    <td style="border-bottom: 1px solid #e5e7eb; padding: 8px 0; text-align: right;">Rp {{ number_format((float) $item->subtotal, 0, ',', '.') }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td colspan="2" style="padding: 12px 0; font-weight: 700;">Total</td>
                <td style="padding: 12px 0; text-align: right; font-weight: 700;">Rp {{ number_format((float) $order->total_amount, 0, ',', '.') }}</td>
            </tr>
            <tr>
                <td colspan="2" style="padding: 4px 0;">Metode Bayar</td>
                <td style="padding: 4px 0; text-align: right;">{{ strtoupper($order->transaction?->payment_method ?? '-') }}</td>
            </tr>
        </tfoot>
    </table>
</body>
</html>
