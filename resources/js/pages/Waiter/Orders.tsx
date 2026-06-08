import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Check, ChefHat, Clock, GlassWater, MapPin, StickyNote, Table2 } from 'lucide-react';
import { useState } from 'react';

type OrderItem = {
    id: number;
    quantity: number;
    notes?: string | null;
    order_item?: {
        id: number;
        quantity?: number;
        notes?: string | null;
        menu_item?: { id: number; name: string } | null;
    } | null;
};

type StationOrder = {
    id: number;
    status: string;
    sent_at: string | null;
    order: {
        id: number;
        notes?: string | null;
        table?: { id: number; name: string; zone?: { id: number; name: string; color_hex: string } | null } | null;
    };
    station?: { id: number; name: string } | null;
    items: OrderItem[];
};

type TableData = {
    id: number;
    name: string;
    status: string;
    zone_id: number;
    capacity: number;
    zone?: { id: number; name: string; color_hex: string } | null;
};

type Props = {
    tables: TableData[];
    kitchenOrders: StationOrder[];
    barOrders: StationOrder[];
    zoneIds: number[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Waiter', href: '/orders' }];

const statusLabel: Record<string, string> = {
    available: 'Kosong',
    occupied: 'Terisi',
    open_bill: 'Open Bill',
    reserved: 'Reservasi',
};

const statusColor: Record<string, string> = {
    available: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    occupied: 'bg-red-500/10 text-red-600 border-red-500/30',
    open_bill: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    reserved: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
};

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return '-';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff} dtk`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt`;
    return `${Math.floor(diff / 3600)} jam`;
}

export default function Orders({ tables, kitchenOrders, barOrders }: Props) {
    const [activeTab, setActiveTab] = useState<'orders' | 'tables'>('orders');
    const [delivering, setDelivering] = useState<number | null>(null);

    const allOrders = [
        ...kitchenOrders.map((o) => ({ ...o, type: 'kitchen' as const })),
        ...barOrders.map((o) => ({ ...o, type: 'bar' as const })),
    ].sort((a, b) => new Date(a.sent_at ?? 0).getTime() - new Date(b.sent_at ?? 0).getTime());

    function handleDeliver(order: (typeof allOrders)[0]) {
        setDelivering(order.id);
        const routeName = order.type === 'kitchen' ? 'waiter.kitchen-orders.deliver' : 'waiter.bar-orders.deliver';
        const paramKey = order.type === 'kitchen' ? 'kitchenOrder' : 'barOrder';

        router.post(route(routeName, { [paramKey]: order.id }), {}, {
            preserveScroll: true,
            onFinish: () => setDelivering(null),
        });
    }

    function handleTableStatus(table: TableData, newStatus: string) {
        router.patch(route('waiter.tables.status', { table: table.id }), { status: newStatus }, {
            preserveScroll: true,
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Waiter" />

            <div className="p-4 sm:p-6">
                {/* Tabs */}
                <div className="mb-6 flex gap-1 rounded-xl bg-muted/50 p-1">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                            activeTab === 'orders'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Order Masuk
                        {allOrders.length > 0 && (
                            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                {allOrders.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('tables')}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                            activeTab === 'tables'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Table2 className="mr-1 inline h-4 w-4" />
                        Meja ({tables.length})
                    </button>
                </div>

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <>
                        {allOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/30 py-20">
                                <Check className="mb-3 h-10 w-10 text-emerald-500/40" />
                                <p className="text-sm font-medium text-muted-foreground">Semua order sudah diantar</p>
                                <p className="mt-1 text-xs text-muted-foreground/60">Order baru akan muncul otomatis</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {allOrders.map((order) => (
                                    <div
                                        key={`${order.type}-${order.id}`}
                                        className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md"
                                    >
                                        {/* Header */}
                                        <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {order.type === 'kitchen' ? (
                                                    <ChefHat className="h-4 w-4 text-orange-500" />
                                                ) : (
                                                    <GlassWater className="h-4 w-4 text-violet-500" />
                                                )}
                                                <span className="text-sm font-bold text-foreground">
                                                    #{order.order.id}
                                                </span>
                                                {order.order.table?.zone && (
                                                    <span
                                                        className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                                                        style={{ backgroundColor: order.order.table.zone.color_hex }}
                                                    >
                                                        {order.order.table.zone.name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {timeAgo(order.sent_at)}
                                            </div>
                                        </div>

                                        {/* Table + Station */}
                                        <div className="flex items-center justify-between border-b border-border/30 px-4 py-2 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {order.order.table?.name ?? '-'}
                                            </span>
                                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                                                {order.station?.name ?? (order.type === 'kitchen' ? 'Kitchen' : 'Bar')}
                                            </span>
                                        </div>

                                        {/* Items */}
                                        <div className="divide-y divide-border/30 px-4">
                                            {order.items.map((item) => (
                                                <div key={item.id} className="py-2.5">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="text-sm font-medium text-foreground">
                                                            {item.order_item?.menu_item?.name ?? 'Item'}
                                                        </span>
                                                        <span className="shrink-0 text-xs font-bold text-muted-foreground">
                                                            x{item.quantity}
                                                        </span>
                                                    </div>
                                                    {(item.notes || item.order_item?.notes) && (
                                                        <div className="mt-0.5 flex items-start gap-1 text-xs text-amber-600 dark:text-amber-400">
                                                            <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                                                            <span>{item.notes || item.order_item?.notes}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Deliver Button */}
                                        <div className="border-t border-border/50 p-3">
                                            <button
                                                onClick={() => handleDeliver(order)}
                                                disabled={delivering === order.id}
                                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
                                            >
                                                <Check className="h-4 w-4" />
                                                {delivering === order.id ? 'Memproses...' : 'Sudah Diantar'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Tables Tab */}
                {activeTab === 'tables' && (
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {tables.map((table) => (
                            <div
                                key={table.id}
                                className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                            >
                                <div className="px-3 py-3 text-center">
                                    <p className="text-sm font-bold text-foreground">{table.name}</p>
                                    {table.zone && (
                                        <p className="mt-0.5 text-[10px] text-muted-foreground">{table.zone.name}</p>
                                    )}
                                    <div className={`mt-2 inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusColor[table.status] ?? statusColor.available}`}>
                                        {statusLabel[table.status] ?? table.status}
                                    </div>
                                </div>

                                <div className="flex border-t border-border/50">
                                    {table.status !== 'available' ? (
                                        <button
                                            onClick={() => handleTableStatus(table, 'available')}
                                            className="flex-1 px-2 py-2 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                        >
                                            → Kosong
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleTableStatus(table, 'occupied')}
                                            className="flex-1 px-2 py-2 text-[11px] font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/20"
                                        >
                                            → Terisi
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
