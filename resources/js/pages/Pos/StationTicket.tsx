import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Printer, QrCode } from 'lucide-react';
import { useEffect } from 'react';

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
        table?: { id: number; name: string; zone?: { id: number; name: string } | null } | null;
        cashier?: { id: number; name: string } | null;
    };
    kitchenOrders: StationBatch[];
    barOrders: StationBatch[];
    xenditPayment?: { id: number; status: string } | null;
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

            <div className="my-3 border-t border-dashed border-black" />

            <p className="text-center text-xs">UNPAID - OPEN BILL</p>
        </section>
    );
}

export default function StationTicket({ order, kitchenOrders, barOrders, xenditPayment }: Props) {
    const { restaurant } = usePage<SharedData>().props;

    useEffect(() => {
        const timer = window.setTimeout(() => window.print(), 450);

        return () => window.clearTimeout(timer);
    }, []);

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
                <div className="no-print flex w-full max-w-sm items-center justify-between gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/pos?order=${order.id}`}>
                            <ArrowLeft className="size-4" />
                            Kembali POS
                        </Link>
                    </Button>
                    <Button type="button" onClick={() => window.print()}>
                        <Printer className="size-4" />
                        Cetak Tiket
                    </Button>
                    {xenditPayment && (
                        <Button variant="outline" asChild>
                            <Link href={`/pos?order=${order.id}&payment=${xenditPayment.id}`}>
                                <QrCode className="size-4" />
                                QRIS
                            </Link>
                        </Button>
                    )}
                </div>

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
