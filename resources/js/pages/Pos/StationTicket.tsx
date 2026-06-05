import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, CreditCard, Printer, QrCode, ReceiptText } from 'lucide-react';
import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type TicketItem = {
    id: number;
    quantity: number;
    notes?: string | null;
    order_item?: {
        id: number;
        quantity: number;
        notes?: string | null;
        menu_item?: { id: number; name: string; print_to: string } | null;
    } | null;
};

type StationBatch = {
    id: number;
    sent_at?: string | null;
    station?: { id: number; name: string } | null;
    items: TicketItem[];
};

type Props = {
    order: {
        id: number;
        status: string;
        notes?: string | null;
        table?: { id: number; name: string; zone?: { id: number; name: string } | null } | null;
        cashier?: { id: number; name: string } | null;
    };
    kitchenOrders: StationBatch[];
    barOrders: StationBatch[];
    xenditPayment?: { id: number; status: string; xendit_raw_response?: { qr_string?: string } | null } | null;
    receiptId?: number | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'POS', href: '/pos' },
    { title: 'Tiket Station', href: '#' },
];

function TicketBlock({ title, batch, order }: { title: string; batch: StationBatch; order: Props['order'] }) {
    return (
        <section className="ticket-block w-full max-w-sm border-b border-dashed border-black bg-white p-4 font-mono text-sm text-black last:border-b-0">
            <div className="text-center">
                <h1 className="text-base font-bold uppercase">{title}</h1>
                <p className="text-xs">{batch.station?.name ?? '-'}</p>
            </div>

            <div className="my-3 border-t border-dashed border-black" />

            <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-3">
                    <span>Order</span>
                    <span>#{order.id}</span>
                </div>
                <div className="flex justify-between gap-3">
                    <span>Meja</span>
                    <span>{order.table?.name ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-3">
                    <span>Zona</span>
                    <span>{order.table?.zone?.name ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-3">
                    <span>Kasir</span>
                    <span>{order.cashier?.name ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-3">
                    <span>Waktu</span>
                    <span>{batch.sent_at ? new Date(batch.sent_at).toLocaleString('id-ID') : '-'}</span>
                </div>
            </div>

            <div className="my-3 border-t border-dashed border-black" />

            <div className="space-y-3">
                {batch.items.map((item) => (
                    <div key={item.id}>
                        <div className="flex justify-between gap-3 font-semibold">
                            <span>{item.order_item?.menu_item?.name ?? 'Item'}</span>
                            <span>x{item.quantity}</span>
                        </div>
                        {(item.notes || item.order_item?.notes) && <div className="text-xs">Catatan: {item.notes ?? item.order_item?.notes}</div>}
                    </div>
                ))}
            </div>

            {order.notes && (
                <>
                    <div className="my-3 border-t border-dashed border-black" />
                    <div className="text-xs"><span className="font-semibold">Catatan: </span>{order.notes}</div>
                </>
            )}

            <div className="my-3 border-t border-dashed border-black" />

            <p className="text-center text-xs">{order.status === 'paid' ? 'PAID' : 'OPEN BILL'}</p>
        </section>
    );
}

export default function StationTicket({ order, kitchenOrders, barOrders, xenditPayment, receiptId }: Props) {
    const { restaurant } = usePage<SharedData>().props;

    useEffect(() => {
        if (receiptId) return;
        const timer = window.setTimeout(() => window.print(), 450);
        return () => window.clearTimeout(timer);
    }, [receiptId]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Tiket Station #${order.id}`} />
            <style>{`
                @media print {
                    @page { size: 80mm auto; margin: 4mm; }
                    body { background: #fff !important; }
                    body * { visibility: hidden; }
                    #station-ticket-print-area, #station-ticket-print-area * { visibility: visible; }
                    #station-ticket-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 72mm;
                        box-shadow: none !important;
                        border: 0 !important;
                    }
                    .ticket-block { break-after: page; page-break-after: always; }
                    .ticket-block:last-child { break-after: auto; page-break-after: auto; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <main className="flex flex-1 flex-col items-center gap-4 p-4">
                <div className="no-print flex w-full max-w-sm flex-wrap items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/pos?order=${order.id}`}>
                            <ArrowLeft className="size-4" />
                            Kembali POS
                        </Link>
                    </Button>
                    <Button type="button" variant="outline" onClick={() => window.print()}>
                        <Printer className="size-4" />
                        Cetak Tiket Kitchen/Bar
                    </Button>
                    {receiptId && (
                        <Button asChild>
                            <Link href={`/pos/transactions/${receiptId}/receipt`}>
                                <ReceiptText className="size-4" />
                                Cetak Struk Customer
                            </Link>
                        </Button>
                    )}
                </div>

                {xenditPayment && xenditPayment.status.toLowerCase() !== 'paid' && (
                    <div className="no-print w-full max-w-sm space-y-4 rounded-xl border bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 font-semibold">
                            <QrCode className="size-5 text-primary" />
                            <span>QRIS – Menunggu Pembayaran</span>
                        </div>
                        {typeof xenditPayment.xendit_raw_response?.qr_string === 'string' ? (
                            <div className="flex justify-center rounded-lg bg-white p-3">
                                <QRCodeSVG value={xenditPayment.xendit_raw_response.qr_string} size={220} />
                            </div>
                        ) : (
                            <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">QR string belum tersedia.</p>
                        )}
                        <p className="text-center text-xs text-muted-foreground">Tampilkan kode QR ini ke pelanggan untuk dibayar via QRIS.</p>
                        <Button
                            type="button"
                            className="w-full"
                            onClick={() => router.post(`/pos/orders/${order.id}/xendit/${xenditPayment.id}/simulate`, { back_to_station: true })}
                        >
                            <CreditCard className="size-4" />
                            Simulasi Pembayaran
                        </Button>
                    </div>
                )}

                <div id="station-ticket-print-area" className="w-full max-w-sm rounded-md border bg-white shadow-sm">
                    <div className="border-b border-dashed border-black p-4 text-center font-mono text-sm text-black">
                        <h1 className="text-base font-bold uppercase">{restaurant.name}</h1>
                    </div>
                    {kitchenOrders.map((batch) => (
                        <TicketBlock key={`kitchen-${batch.id}`} title="Kitchen Ticket" batch={batch} order={order} />
                    ))}
                    {barOrders.map((batch) => (
                        <TicketBlock key={`bar-${batch.id}`} title="Bar Ticket" batch={batch} order={order} />
                    ))}
                </div>
            </main>
        </AppLayout>
    );
}
