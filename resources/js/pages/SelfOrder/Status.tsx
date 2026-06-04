import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect } from 'react';

type SelfOrder = {
    id: number;
    status: string;
    total_amount: string;
    payment_preference: string;
    rejection_reason?: string | null;
    table?: { name: string };
    items: { id: number; quantity: number; menu_item?: { name: string } }[];
};
type Payment = { id: number; external_id: string; status: string; xendit_raw_response?: Record<string, unknown> | null } | null;
type Props = { qrToken: string; selfOrder: SelfOrder; payment: Payment };

const statusLabels: Record<string, string> = {
    pending: 'Menunggu kasir',
    converted_to_order: 'Pesanan diterima',
    rejected: 'Ditolak',
    expired: 'Kedaluwarsa',
};

export default function SelfOrderStatus({ qrToken, selfOrder, payment }: Props) {
    const { flash } = usePage<{ flash?: { error?: string; success?: string } }>().props;
    const title = statusLabels[selfOrder.status] ?? selfOrder.status;
    const qrString = typeof payment?.xendit_raw_response?.qr_string === 'string' ? payment.xendit_raw_response.qr_string : null;
    const isQrisPending = selfOrder.payment_preference === 'qris' && selfOrder.status === 'converted_to_order' && String(payment?.status ?? '').toLowerCase() !== 'paid';
    const shouldPoll = selfOrder.status === 'pending'
        || isQrisPending;

    function simulatePayment() {
        if (!payment) {
            return;
        }

        router.post(`/s/${qrToken}/status/${selfOrder.id}/payments/${payment.id}/simulate`, {}, {
            preserveScroll: true,
        });
    }

    useEffect(() => {
        if (!shouldPoll) {
            return;
        }

        const interval = window.setInterval(() => {
            if (document.hidden) {
                return;
            }

            router.reload({
                only: ['selfOrder', 'payment'],
                preserveScroll: true,
                preserveState: true,
            });
        }, 10000);

        return () => window.clearInterval(interval);
    }, [shouldPoll]);

    return (
        <>
            <Head title={`Self Order #${selfOrder.id}`} />
            <main className="min-h-screen bg-background p-4">
                <div className="mx-auto max-w-xl rounded-md border p-4">
                    <div className="mb-4 flex items-center justify-between gap-3 border-b pb-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Self Order #{selfOrder.id}</p>
                            <h1 className="text-xl font-semibold">{title}</h1>
                        </div>
                        <Badge variant="outline">{selfOrder.status}</Badge>
                    </div>
                    <div className="space-y-3 text-sm">
                        {flash?.success && <p className="rounded-md border border-emerald-500/40 bg-emerald-50 p-3 text-sm text-emerald-700">{flash.success}</p>}
                        {flash?.error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{flash.error}</p>}
                        {selfOrder.items.map((item) => (
                            <div key={item.id} className="flex justify-between border-b pb-2">
                                <span>{item.menu_item?.name}</span>
                                <span>x{item.quantity}</span>
                            </div>
                        ))}
                        <div className="flex justify-between text-base font-semibold">
                            <span>Total</span>
                            <span>Rp {Number(selfOrder.total_amount).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between rounded-md border bg-muted/30 p-3">
                            <span>Metode bayar</span>
                            <span>{selfOrder.payment_preference === 'qris' ? 'QRIS' : 'Bayar di Kasir'}</span>
                        </div>
                        {selfOrder.status === 'pending' && <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">Pesanan sudah masuk ke kasir dan sedang menunggu konfirmasi pembayaran tunai.</p>}
                        {selfOrder.status === 'converted_to_order' && selfOrder.payment_preference !== 'qris' && <p className="rounded-md border border-emerald-500/40 bg-emerald-50 p-3 text-sm text-emerald-700">Pesanan diterima kasir dan sedang diproses.</p>}
                        {selfOrder.status === 'converted_to_order' && selfOrder.payment_preference === 'qris' && String(payment?.status ?? '').toLowerCase() !== 'paid' && (
                            <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">Silakan scan QRIS di bawah. Pesanan akan masuk dapur/bar setelah pembayaran berhasil.</p>
                        )}
                        {selfOrder.status === 'converted_to_order' && selfOrder.payment_preference === 'qris' && String(payment?.status ?? '').toLowerCase() === 'paid' && (
                            <p className="rounded-md border border-emerald-500/40 bg-emerald-50 p-3 text-sm text-emerald-700">Pembayaran berhasil. Pesanan sedang diproses.</p>
                        )}
                        {selfOrder.payment_preference === 'qris' && selfOrder.status === 'converted_to_order' && !payment && (
                            <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">QRIS sedang dibuat.</p>
                        )}
                        {payment && (
                            <div className="rounded-md border p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="font-medium">QRIS</span>
                                    <Badge variant="outline">{payment.status}</Badge>
                                </div>
                                {qrString ? (
                                    <div className="rounded-md bg-white p-3">
                                        <QRCodeSVG value={qrString} size={260} className="mx-auto" />
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">QRIS sedang dibuat.</p>
                                )}
                                {isQrisPending && (
                                    <Button type="button" variant="outline" className="mt-3 w-full" onClick={simulatePayment}>
                                        Simulasi Bayar QRIS
                                    </Button>
                                )}
                            </div>
                        )}
                        {selfOrder.status === 'rejected' && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{selfOrder.rejection_reason || 'Pesanan ditolak kasir.'}</p>}
                        <Link className="block rounded-md border px-4 py-2 text-center text-sm font-medium hover:bg-muted/50" href={`/s/${qrToken}`}>
                            Tambah Pesanan
                        </Link>
                        <Link className="block rounded-md border px-4 py-2 text-center text-sm font-medium hover:bg-muted/50" href={`/s/${qrToken}/status/${selfOrder.id}`}>
                            Refresh Status
                        </Link>
                    </div>
                </div>
            </main>
        </>
    );
}
