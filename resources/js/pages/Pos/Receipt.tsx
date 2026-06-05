import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useMemo } from 'react';

type ReceiptItem = {
    id: number;
    quantity: number;
    unit_price: string;
    subtotal: string;
    notes?: string | null;
    menu_item?: { id: number; name: string; print_to: string } | null;
};

type ReceiptTransaction = {
    id: number;
    payment_method: string;
    amount_paid: string;
    change_amount: string;
    paid_at: string;
    cashier?: { id: number; name: string } | null;
    order: {
        id: number;
        subtotal: string;
        discount_amount?: string | null;
        service_charge_amount?: string | null;
        tax_amount?: string | null;
        total_amount: string;
        notes?: string | null;
        table?: { id: number; name: string; zone?: { id: number; name: string } | null } | null;
        items: ReceiptItem[];
    };
};

type Props = {
    transaction: ReceiptTransaction;
    stationTicketUrls?: { type: string; label: string; url: string }[];
};

type ReceiptLine = ReceiptItem & {
    ids: number[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'POS', href: '/pos' },
    { title: 'Struk', href: '#' },
];

const money = (value?: string | number | null) => Number(value ?? 0).toLocaleString('id-ID');

export default function Receipt({ transaction, stationTicketUrls = [] }: Props) {
    const { restaurant } = usePage<SharedData>().props;
    const order = transaction.order;
    const groupedItems = useMemo<ReceiptLine[]>(() => {
        const groups = new Map<string, ReceiptLine>();

        for (const item of order.items) {
            const key = [item.menu_item?.id ?? item.menu_item?.name ?? 'item', item.unit_price, item.notes ?? ''].join('|');
            const existing = groups.get(key);

            if (existing) {
                existing.ids.push(item.id);
                existing.quantity += item.quantity;
                existing.subtotal = String(Number(existing.subtotal) + Number(item.subtotal));
                continue;
            }

            groups.set(key, { ...item, ids: [item.id] });
        }

        return Array.from(groups.values());
    }, [order.items]);

    useEffect(() => {
        const timer = window.setTimeout(() => window.print(), 450);

        return () => window.clearTimeout(timer);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Struk #${transaction.id}`} />
            <style>{`
                @media print {
                    @page { size: 80mm auto; margin: 4mm; }
                    body { background: #fff !important; }
                    body * { visibility: hidden; }
                    #receipt-print-area, #receipt-print-area * { visibility: visible; }
                    #receipt-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 72mm;
                        box-shadow: none !important;
                        border: 0 !important;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>

            <main className="flex flex-1 flex-col items-center gap-4 p-4">
                <div className="no-print flex w-full max-w-sm items-center justify-between gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/pos">
                            <ArrowLeft className="size-4" />
                            Kembali POS
                        </Link>
                    </Button>
                    <Button type="button" onClick={() => window.print()}>
                        <Printer className="size-4" />
                        Cetak Struk
                    </Button>
                </div>
                {stationTicketUrls.length > 0 && (
                    <div className="no-print grid w-full max-w-sm gap-2">
                        {stationTicketUrls.map((ticket) => (
                            <Button key={`${ticket.type}-${ticket.url}`} type="button" className="w-full" variant="outline" asChild>
                                <Link href={ticket.url}>
                                    <Printer className="size-4" />
                                    {ticket.label}
                                </Link>
                            </Button>
                        ))}
                    </div>
                )}

                <section id="receipt-print-area" className="w-full max-w-sm rounded-md border bg-white p-5 font-mono text-sm text-black shadow-sm">
                    <div className="text-center">
                        <h1 className="text-base font-bold uppercase">{restaurant.name}</h1>
                        {restaurant.receipt_header && <p className="mt-1 text-xs">{restaurant.receipt_header}</p>}
                    </div>

                    <div className="my-3 border-t border-dashed border-black" />

                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between gap-3">
                            <span>No. Transaksi</span>
                            <span>#{transaction.id}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span>Order</span>
                            <span>#{order.id}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span>Meja</span>
                            <span>{order.table?.name ?? '-'}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span>Kasir</span>
                            <span>{transaction.cashier?.name ?? '-'}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span>Waktu</span>
                            <span>{new Date(transaction.paid_at).toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    {order.notes && (
                        <>
                            <div className="my-3 border-t border-dashed border-black" />
                            <div className="text-xs"><span className="font-semibold">Catatan: </span>{order.notes}</div>
                        </>
                    )}

                    <div className="my-3 border-t border-dashed border-black" />

                    <div className="space-y-2">
                        {groupedItems.map((item) => (
                            <div key={item.ids.join('-')}>
                                <div className="font-semibold">{item.menu_item?.name ?? 'Item'}</div>
                                <div className="flex justify-between gap-3 text-xs">
                                    <span>
                                        {item.quantity} x {money(item.unit_price)}
                                    </span>
                                    <span>{money(item.subtotal)}</span>
                                </div>
                                {item.notes && <div className="text-xs">Catatan: {item.notes}</div>}
                            </div>
                        ))}
                    </div>

                    <div className="my-3 border-t border-dashed border-black" />

                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between gap-3">
                            <span>Subtotal</span>
                            <span>{money(order.subtotal)}</span>
                        </div>
                        {Number(order.discount_amount ?? 0) > 0 && (
                            <div className="flex justify-between gap-3">
                                <span>Diskon</span>
                                <span>-{money(order.discount_amount)}</span>
                            </div>
                        )}
                        {Number(order.service_charge_amount ?? 0) > 0 && (
                            <div className="flex justify-between gap-3">
                                <span>Service</span>
                                <span>{money(order.service_charge_amount)}</span>
                            </div>
                        )}
                        {Number(order.tax_amount ?? 0) > 0 && (
                            <div className="flex justify-between gap-3">
                                <span>Pajak</span>
                                <span>{money(order.tax_amount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between gap-3 border-t border-black pt-2 text-base font-bold">
                            <span>Total</span>
                            <span>{money(order.total_amount)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span>Bayar ({transaction.payment_method.toUpperCase()})</span>
                            <span>{money(transaction.amount_paid)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span>Kembali</span>
                            <span>{money(transaction.change_amount)}</span>
                        </div>
                    </div>

                    <div className="my-3 border-t border-dashed border-black" />

                    <div className="text-center text-xs">
                        <p>{restaurant.receipt_footer ?? 'Terima kasih.'}</p>
                    </div>
                </section>
            </main>
        </AppLayout>
    );
}
