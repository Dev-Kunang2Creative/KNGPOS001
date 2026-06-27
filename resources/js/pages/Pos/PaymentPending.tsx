import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { ArrowLeft, CreditCard, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type Order = {
    id: number;
    table?: {
        id: number;
        name: string;
    } | null;
};

type Transaction = {
    id: number;
    amount_paid: string;
    payment_method: string;
};

type XenditPayment = {
    id: number;
    external_id: string;
    status: string;
    xendit_raw_response?: Record<string, unknown> | null;
};

type Props = {
    payment: XenditPayment;
    transaction: Transaction;
    order: Order;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'POS', href: '/pos' },
    { title: 'QRIS', href: '#' },
];

const money = (value: number | string) => Number(value || 0).toLocaleString('id-ID');

export default function PaymentPending({ payment, transaction, order }: Props) {
    const { flash } = usePage<SharedData>().props;
    const qrString = typeof payment.xendit_raw_response?.qr_string === 'string' ? payment.xendit_raw_response.qr_string : '';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pembayaran QRIS" />
            <main className="grid min-h-[calc(100vh-8rem)] gap-4 p-4 lg:grid-cols-[1fr_360px]">
                <section className="flex items-center justify-center rounded-md border bg-background p-6">
                    <div className="w-full max-w-sm text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                            <QrCode className="size-7" />
                        </div>
                        <h1 className="mt-4 text-2xl font-semibold">Pembayaran QRIS</h1>
                        <p className="mt-2 text-sm text-muted-foreground">Scan QRIS untuk menyelesaikan close bill.</p>

                        {qrString ? (
                            <div className="mt-6 rounded-md border bg-white p-4">
                                <QRCodeSVG value={qrString} size={280} className="mx-auto max-w-full" />
                            </div>
                        ) : (
                            <div className="mt-6 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-warning">QR string tidak tersedia dari Xendit.</div>
                        )}

                        <Button
                            type="button"
                            className="mt-5 w-full"
                            onClick={() => router.post(`/pos/orders/${order.id}/xendit/${payment.id}/simulate`)}
                        >
                            <CreditCard />
                            Simulasi Bayar QRIS
                        </Button>
                    </div>
                </section>

                <aside className="space-y-4">
                    {flash.error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{flash.error}</div>}
                    {flash.success && <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700">{flash.success}</div>}

                    <div className="rounded-md border bg-background p-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-base font-semibold">Detail Pembayaran</h2>
                            <Badge variant="outline">{payment.status}</Badge>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm">
                            <div className="flex justify-between gap-3">
                                <span className="text-muted-foreground">Meja</span>
                                <strong>{order.table?.name ?? '-'}</strong>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-muted-foreground">Total</span>
                                <strong>Rp {money(transaction.amount_paid)}</strong>
                            </div>
                            <div className="grid gap-1">
                                <span className="text-muted-foreground">External ID</span>
                                <span className="break-all font-medium">{payment.external_id}</span>
                            </div>
                        </div>
                    </div>

                    <Button type="button" variant="outline" className="w-full" onClick={() => router.visit('/pos')}>
                        <ArrowLeft />
                        Kembali ke POS
                    </Button>
                </aside>
            </main>
        </AppLayout>
    );
}
