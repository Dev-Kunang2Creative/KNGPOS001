<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Struk Pembayaran – Karcisqu</title>
</head>
<body style="margin:0; padding:0; background-color:#F3F4F6; font-family:Arial,sans-serif; color:#111827;">

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6; padding:32px 16px;">
        <tr>
            <td align="center">

                {{-- Card --}}
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.08);">

                    {{-- Header --}}
                    <tr>
                        <td style="background-color:#1E3A8A; padding:24px 32px; text-align:center;">
                            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                                <tr>
                                    <td style="vertical-align:middle; padding-right:10px;">
                                        <img src="{{ asset('logokarcisqusquare.png') }}" alt="Karcisqu" style="height:36px; width:36px; display:block;">
                                    </td>
                                    <td style="vertical-align:middle;">
                                        <span style="font-size:22px; font-weight:700; color:#ffffff; letter-spacing:0.02em;">karcisqu</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Intro banner --}}
                    <tr>
                        <td style="background-color:#EFF6FF; padding:14px 32px; text-align:center; border-bottom:1px solid #DBEAFE;">
                            <p style="margin:0; font-size:13px; color:#1E40AF; font-weight:600;">INVOICE / STRUK PEMBAYARAN DIGITAL</p>
                            <p style="margin:4px 0 0; font-size:12px; color:#3B82F6;">Simpan email ini sebagai bukti pembayaran yang sah.</p>
                        </td>
                    </tr>

                    {{-- Greeting --}}
                    <tr>
                        <td style="padding:28px 32px 0;">
                            <p style="margin:0; font-size:20px; font-weight:700; color:#111827;">Halo, {{ $selfOrder->customer_name }}!</p>
                            <p style="margin:8px 0 0; font-size:14px; color:#6B7280;">Pembayaran kamu telah berhasil diproses. Berikut adalah rincian pesanan dan bukti pembayaranmu.</p>
                        </td>
                    </tr>

                    {{-- Order Info --}}
                    <tr>
                        <td style="padding:20px 32px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB; border-radius:8px; padding:16px;">
                                <tr>
                                    <td style="padding:6px 16px; font-size:13px; color:#6B7280; width:50%;">No. Order</td>
                                    <td style="padding:6px 16px; font-size:13px; font-weight:600; text-align:right;">#{{ $order->id }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 16px; font-size:13px; color:#6B7280;">Meja</td>
                                    <td style="padding:6px 16px; font-size:13px; font-weight:600; text-align:right;">{{ $order->table?->name ?? '-' }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 16px; font-size:13px; color:#6B7280;">Kasir</td>
                                    <td style="padding:6px 16px; font-size:13px; font-weight:600; text-align:right;">{{ $order->transaction?->cashier?->name ?? '-' }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 16px; font-size:13px; color:#6B7280;">Waktu Bayar</td>
                                    <td style="padding:6px 16px; font-size:13px; font-weight:600; text-align:right;">
                                        {{ $order->transaction?->paid_at?->timezone(config('app.timezone'))->format('d M Y, H:i') }}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Divider --}}
                    <tr>
                        <td style="padding:24px 32px 0;">
                            <p style="margin:0; font-size:14px; font-weight:700; color:#111827; text-transform:uppercase; letter-spacing:0.05em;">Rincian Pesanan</p>
                        </td>
                    </tr>

                    {{-- Items --}}
                    <tr>
                        <td style="padding:12px 32px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <thead>
                                    <tr style="border-bottom:2px solid #E5E7EB;">
                                        <th style="padding:8px 0; font-size:12px; color:#6B7280; text-align:left; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Item</th>
                                        <th style="padding:8px 0; font-size:12px; color:#6B7280; text-align:center; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; width:40px;">Qty</th>
                                        <th style="padding:8px 0; font-size:12px; color:#6B7280; text-align:right; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach ($order->items as $item)
                                        <tr>
                                            <td style="padding:10px 0; border-bottom:1px solid #F3F4F6; font-size:14px;">
                                                {{ $item->menuItem?->name ?? 'Item' }}
                                                @if ($item->notes)
                                                    <br><span style="font-size:12px; color:#9CA3AF;">{{ $item->notes }}</span>
                                                @endif
                                            </td>
                                            <td style="padding:10px 0; border-bottom:1px solid #F3F4F6; font-size:14px; text-align:center; color:#6B7280;">{{ $item->quantity }}</td>
                                            <td style="padding:10px 0; border-bottom:1px solid #F3F4F6; font-size:14px; text-align:right;">Rp {{ number_format((float) $item->subtotal, 0, ',', '.') }}</td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    {{-- Total --}}
                    <tr>
                        <td style="padding:16px 32px 0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding:6px 0; font-size:13px; color:#6B7280;">Metode Pembayaran</td>
                                    <td style="padding:6px 0; font-size:13px; text-align:right; font-weight:600;">{{ strtoupper($order->transaction?->payment_method ?? '-') }}</td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding:4px 0;">
                                        <div style="border-top:2px solid #E5E7EB; margin:8px 0;"></div>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0; font-size:16px; font-weight:700; color:#111827;">Total</td>
                                    <td style="padding:6px 0; font-size:18px; font-weight:700; text-align:right; color:#1E3A8A;">Rp {{ number_format((float) $order->total_amount, 0, ',', '.') }}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- Disclaimer --}}
                    <tr>
                        <td style="padding:0 32px;">
                            <div style="background-color:#FFF7ED; border:1px solid #FED7AA; border-radius:6px; padding:12px 16px;">
                                <p style="margin:0; font-size:12px; color:#92400E; line-height:1.6;">
                                    <strong>Catatan:</strong> Email ini merupakan bukti pembayaran resmi yang dibuat secara otomatis oleh sistem Karcisqu.
                                    Harap simpan email ini sebagai referensi transaksi kamu. Jika ada pertanyaan mengenai pesanan,
                                    silakan hubungi langsung restoran terkait.
                                </p>
                            </div>
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="padding:24px 32px 28px;">
                            <div style="border-top:1px solid #E5E7EB; padding-top:20px; text-align:center;">
                                <img src="{{ asset('logokarcisqusquare.png') }}" alt="Karcisqu" style="height:28px; width:28px; display:inline-block; margin-bottom:8px;">
                                <p style="margin:0; font-size:13px; font-weight:600; color:#374151;">Karcisqu</p>
                                <p style="margin:6px 0 0; font-size:11px; color:#9CA3AF;">Pesan otomatis &mdash; mohon <strong>jangan membalas</strong> email ini.</p>
                                <p style="margin:4px 0 0; font-size:11px; color:#D1D5DB;">&copy; {{ date('Y') }} Karcisqu. All rights reserved.</p>
                            </div>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
