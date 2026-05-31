import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, ReceiptText } from 'lucide-react';
import { useEffect, useState } from 'react';

type Transaction = {
    id: number;
    amount_paid: string;
    payment_method: string;
    order?: {
        id: number;
        table?: {
            id: number;
            name: string;
        } | null;
    } | null;
};

type XenditPayment = {
    id: number;
    external_id: string;
    status: string;
};

type Props = {
    payment: XenditPayment;
    transaction: Transaction;
    redirectSeconds: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'POS', href: '/pos' },
    { title: 'Pembayaran Berhasil', href: '#' },
];

const money = (value: number | string) => Number(value || 0).toLocaleString('id-ID');

export default function PaymentSuccess({ payment, transaction, redirectSeconds }: Props) {
    const [secondsLeft, setSecondsLeft] = useState(redirectSeconds);
    const receiptUrl = `/pos/transactions/${transaction.id}/receipt`;

    useEffect(() => {
        const redirectTimer = window.setTimeout(() => {
            router.visit(receiptUrl);
        }, redirectSeconds * 1000);

        const countdownTimer = window.setInterval(() => {
            setSecondsLeft((current) => Math.max(0, current - 1));
        }, 1000);

        return () => {
            window.clearTimeout(redirectTimer);
            window.clearInterval(countdownTimer);
        };
    }, [receiptUrl, redirectSeconds]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pembayaran QRIS Berhasil" />
            <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
                <section className="w-full max-w-md rounded-md border bg-background p-6 text-center shadow-sm">
                    <div className="relative mx-auto flex size-20 items-center justify-center">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-25" />
                        <span className="relative flex size-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                            <CheckCircle2 className="size-10" />
                        </span>
                    </div>

                    <Badge className="mt-5" variant="outline">
                        {payment.status}
                    </Badge>
                    <h1 className="mt-4 text-2xl font-semibold">Pembayaran QRIS Berhasil</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Struk akan dibuka otomatis dalam {secondsLeft} detik.</p>

                    <div className="mt-5 grid gap-2 rounded-md border bg-muted/30 p-3 text-left text-sm">
                        <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Meja</span>
                            <strong>{transaction.order?.table?.name ?? '-'}</strong>
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

                    <Button type="button" className="mt-5 w-full" onClick={() => router.visit(receiptUrl)}>
                        <ReceiptText />
                        Cetak Struk Sekarang
                    </Button>
                </section>
            </main>
        </AppLayout>
    );
}
