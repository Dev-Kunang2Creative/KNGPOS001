import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';

type Order = {
    id: number;
    status: string;
    total_amount: string;
    items: { id: number; quantity: number; menu_item?: { name: string } }[];
};
type Payment = { id: number; external_id: string; status: string; xendit_raw_response?: Record<string, unknown> | null } | null;
type Props = { qrToken: string; order: Order; payment: Payment };

export default function SelfOrderStatus({ qrToken, order, payment }: Props) {
    const qrString = typeof payment?.xendit_raw_response?.qr_string === 'string' ? payment.xendit_raw_response.qr_string : null;

    return (
        <>
            <Head title={`Order #${order.id}`} />
            <main className="min-h-screen bg-background p-4">
                <div className="mx-auto max-w-xl rounded-md border p-4">
                    <div className="mb-4 flex items-center justify-between gap-3 border-b pb-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Order #{order.id}</p>
                            <h1 className="text-xl font-semibold">Payment QRIS</h1>
                        </div>
                        <Badge variant="outline">{payment?.status ?? order.status}</Badge>
                    </div>
                    <div className="space-y-3 text-sm">
                        {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between border-b pb-2">
                                <span>{item.menu_item?.name}</span>
                                <span>x{item.quantity}</span>
                            </div>
                        ))}
                        <div className="flex justify-between text-base font-semibold">
                            <span>Total</span>
                            <span>Rp {Number(order.total_amount).toLocaleString('id-ID')}</span>
                        </div>
                        {payment && (
                            <div className="rounded-md border p-3">
                                <p className="text-xs font-medium">External ID</p>
                                <p className="break-all text-xs text-muted-foreground">{payment.external_id}</p>
                                {qrString && (
                                    <>
                                        <div className="mt-3 rounded-md bg-white p-3">
                                            <QRCodeSVG value={qrString} size={260} className="mx-auto" />
                                        </div>
                                        <p className="mt-2 text-xs font-medium">QR String</p>
                                        <p className="break-all text-xs text-muted-foreground">{qrString}</p>
                                    </>
                                )}
                            </div>
                        )}
                        <Button asChild className="w-full" variant="outline">
                            <Link href={`/s/${qrToken}`}>Tambah Pesanan</Link>
                        </Button>
                    </div>
                </div>
            </main>
        </>
    );
}
