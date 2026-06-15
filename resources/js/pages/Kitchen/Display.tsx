import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChefHat, Clock, MapPin, StickyNote, UtensilsCrossed } from 'lucide-react';
import { useEffect } from 'react';

type KitchenOrderItem = {
    id: number;
    quantity: number;
    notes?: string | null;
    order_item?: {
        id: number;
        notes?: string | null;
        menu_item?: { id: number; name: string } | null;
    } | null;
};

type KitchenOrderData = {
    id: number;
    status: string;
    sent_at: string | null;
    started_at: string | null;
    order: {
        id: number;
        notes?: string | null;
        table?: { id: number; name: string; zone?: { id: number; name: string; color_hex: string } | null } | null;
    };
    station?: { id: number; name: string } | null;
    items: KitchenOrderItem[];
};

type Props = {
    orders: KitchenOrderData[];
    stationName: string;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Kitchen', href: '/kitchen' }];

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return '-';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff} dtk`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt`;
    return `${Math.floor(diff / 3600)} jam`;
}

export default function Display({ orders, stationName }: Props) {
    useEffect(() => {
        const interval = window.setInterval(() => {
            if (document.hidden) return;
            router.reload({ only: ['orders'] });
        }, 5000);
        return () => window.clearInterval(interval);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Kitchen — ${stationName}`} />

            <div className="p-4 sm:p-6">
                {/* Header */}
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                        <ChefHat className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-foreground text-lg font-bold">{stationName}</h1>
                        <p className="text-muted-foreground text-xs">
                            {orders.length} order{orders.length !== 1 ? 's' : ''} menunggu
                        </p>
                    </div>
                </div>

                {orders.length === 0 ? (
                    <div className="border-border/50 bg-muted/30 flex flex-col items-center justify-center rounded-2xl border border-dashed py-20">
                        <UtensilsCrossed className="text-muted-foreground/40 mb-3 h-10 w-10" />
                        <p className="text-muted-foreground text-sm font-medium">Tidak ada order saat ini</p>
                        <p className="text-muted-foreground/60 mt-1 text-xs">Order baru akan muncul otomatis</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="group border-border bg-card relative overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md"
                            >
                                {/* Header */}
                                <div className="border-border/50 bg-muted/30 flex items-center justify-between border-b px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-foreground text-sm font-bold">#{order.order.id}</span>
                                        {order.order.table?.zone && (
                                            <span
                                                className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                                                style={{ backgroundColor: order.order.table.zone.color_hex }}
                                            >
                                                {order.order.table.zone.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                        <Clock className="h-3 w-3" />
                                        {timeAgo(order.sent_at)}
                                    </div>
                                </div>

                                {/* Table info */}
                                {order.order.table && (
                                    <div className="border-border/30 text-muted-foreground flex items-center gap-1.5 border-b px-4 py-2 text-xs">
                                        <MapPin className="h-3 w-3" />
                                        {order.order.table.name}
                                    </div>
                                )}

                                {/* Items */}
                                <div className="divide-border/30 divide-y px-4">
                                    {order.items.map((item) => (
                                        <div key={item.id} className="py-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-foreground text-sm font-medium">
                                                    {item.order_item?.menu_item?.name ?? 'Item'}
                                                </span>
                                                <span className="bg-primary/10 text-primary shrink-0 rounded-md px-2 py-0.5 text-xs font-bold">
                                                    x{item.quantity}
                                                </span>
                                            </div>
                                            {(item.notes || item.order_item?.notes) && (
                                                <div className="mt-1 flex items-start gap-1 text-xs text-amber-600 dark:text-amber-400">
                                                    <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                                                    <span>{item.notes || item.order_item?.notes}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Order notes */}
                                {order.order.notes && (
                                    <div className="border-border/30 border-t bg-amber-50/50 px-4 py-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                                        <strong>Catatan:</strong> {order.order.notes}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
