import { stripBillTag } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

type TicketItem = {
    id: number;
    quantity: number;
    notes?: string | null;
    order_item?: {
        id: number;
        notes?: string | null;
        menu_item?: { id: number; name: string } | null;
    } | null;
};

type BarOrderData = {
    id: number;
    status: string;
    sent_at: string | null;
    order: {
        id: number;
        notes?: string | null;
        table?: { id: number; name: string; zone?: { id: number; name: string } | null } | null;
    };
    station?: { id: number; name: string } | null;
    items: TicketItem[];
};

type Props = {
    barOrder: BarOrderData;
    stationName: string;
};

export default function Ticket({ barOrder, stationName }: Props) {
    const { restaurant } = usePage<SharedData>().props;
    const order = barOrder.order;

    useEffect(() => {
        function closeAfterPrint() {
            window.setTimeout(() => window.close(), 300);
        }

        window.addEventListener('afterprint', closeAfterPrint);
        const timer = window.setTimeout(() => window.print(), 450);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('afterprint', closeAfterPrint);
        };
    }, []);

    return (
        <>
            <Head title={`Tiket Bar #${order.id}`} />
            <style>{`
                @page { size: 80mm auto; margin: 4mm; }
                body { background: #fff; }
                @media print {
                    .no-print { display: none !important; }
                }
            `}</style>

            <main className="mx-auto w-[72mm] max-w-full p-3 font-mono text-sm text-black">
                <div className="text-center">
                    <h1 className="text-base font-bold uppercase">{restaurant?.name ?? 'Restaurant'}</h1>
                    <p className="text-xs font-semibold">BAR — {stationName}</p>
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
                        <span>Waktu</span>
                        <span>{barOrder.sent_at ? new Date(barOrder.sent_at).toLocaleString('id-ID') : '-'}</span>
                    </div>
                </div>

                <div className="my-3 border-t border-dashed border-black" />

                <div className="space-y-3">
                    {barOrder.items.map((item) => (
                        <div key={item.id}>
                            <div className="flex justify-between gap-3 font-semibold">
                                <span>{item.order_item?.menu_item?.name ?? 'Item'}</span>
                                <span>x{item.quantity}</span>
                            </div>
                            {(item.notes || item.order_item?.notes) && (
                                <div className="text-xs">Catatan: {item.notes ?? item.order_item?.notes}</div>
                            )}
                        </div>
                    ))}
                </div>

                {stripBillTag(order.notes) && (
                    <>
                        <div className="my-3 border-t border-dashed border-black" />
                        <div className="text-xs">
                            <span className="font-semibold">Catatan Order: </span>
                            {stripBillTag(order.notes)}
                        </div>
                    </>
                )}

                <div className="my-3 border-t border-dashed border-black" />
                <p className="text-center text-xs">*** TIKET BAR ***</p>

                <div className="no-print mt-6 flex justify-center">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                        Cetak Ulang
                    </button>
                </div>
            </main>
        </>
    );
}
