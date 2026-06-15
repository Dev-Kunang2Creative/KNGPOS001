import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Check, ChefHat, Clock, GlassWater, MapPin, StickyNote, Table2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type OrderItem = {
    id: string;
    station: 'kitchen' | 'bar';
    name: string;
    quantity: number;
    notes?: string | null;
};

type WaiterOrder = {
    order: {
        id: number;
        notes?: string | null;
        table?: { id: number; name: string; zone?: { id: number; name: string; color_hex: string } | null } | null;
    };
    sent_at: string | null;
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
    orders: WaiterOrder[];
    zoneIds: number[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Waiter', href: '/orders' }];

const statusLabel: Record<string, string> = {
    available: 'Kosong',
    occupied: 'Terisi',
    open_bill: 'Sedang Pembayaran',
    reserved: 'Reservasi',
};

const tableStatusOptions: { value: string; label: string }[] = [
    { value: 'available', label: 'Kosong' },
    { value: 'occupied', label: 'Terisi' },
    { value: 'open_bill', label: 'Pembayaran' },
    { value: 'reserved', label: 'Reservasi' },
];

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

export default function Orders({ tables, orders }: Props) {
    const [activeTab, setActiveTab] = useState<'orders' | 'tables'>('orders');
    const [delivering, setDelivering] = useState<number | null>(null);

    useEffect(() => {
        const interval = window.setInterval(() => {
            if (document.hidden) return;
            router.reload({ only: ['orders', 'tables'] });
        }, 5000);
        return () => window.clearInterval(interval);
    }, []);

    function handleDeliver(order: WaiterOrder) {
        setDelivering(order.order.id);

        router.post(
            route('waiter.orders.deliver', { order: order.order.id }),
            {},
            {
                preserveScroll: true,
                onFinish: () => setDelivering(null),
            },
        );
    }

    function handleTableStatus(table: TableData, newStatus: string) {
        router.patch(
            route('waiter.tables.status', { table: table.id }),
            { status: newStatus },
            {
                preserveScroll: true,
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Waiter" />

            <div className="p-4 sm:p-6">
                {/* Tabs */}
                <div className="bg-muted/50 mb-6 flex gap-1 rounded-xl p-1">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                            activeTab === 'orders' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Order Masuk
                        {orders.length > 0 && (
                            <span className="bg-primary text-primary-foreground ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                                {orders.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('tables')}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                            activeTab === 'tables' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Table2 className="mr-1 inline h-4 w-4" />
                        Meja ({tables.length})
                    </button>
                </div>

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <>
                        {orders.length === 0 ? (
                            <div className="border-border/50 bg-muted/30 flex flex-col items-center justify-center rounded-2xl border border-dashed py-20">
                                <Check className="mb-3 h-10 w-10 text-emerald-500/40" />
                                <p className="text-muted-foreground text-sm font-medium">Semua order sudah diantar</p>
                                <p className="text-muted-foreground/60 mt-1 text-xs">Order baru akan muncul otomatis</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {orders.map((order) => (
                                    <div
                                        key={order.order.id}
                                        className="group border-border bg-card overflow-hidden rounded-xl border shadow-sm transition-all hover:shadow-md"
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

                                        {/* Table */}
                                        <div className="border-border/30 text-muted-foreground flex items-center gap-1.5 border-b px-4 py-2 text-xs">
                                            <MapPin className="h-3 w-3" />
                                            {order.order.table?.name ?? '-'}
                                        </div>

                                        {/* Items */}
                                        <div className="divide-border/30 divide-y px-4">
                                            {order.items.map((item) => (
                                                <div key={item.id} className="py-2.5">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="text-foreground flex items-center gap-1.5 text-sm font-medium">
                                                            {item.station === 'kitchen' ? (
                                                                <ChefHat className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                                            ) : (
                                                                <GlassWater className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                                                            )}
                                                            {item.name}
                                                        </span>
                                                        <span className="text-muted-foreground shrink-0 text-xs font-bold">x{item.quantity}</span>
                                                    </div>
                                                    {item.notes && (
                                                        <div className="mt-0.5 flex items-start gap-1 text-xs text-amber-600 dark:text-amber-400">
                                                            <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                                                            <span>{item.notes}</span>
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

                                        {/* Deliver Button */}
                                        <div className="border-border/50 border-t p-3">
                                            <button
                                                onClick={() => handleDeliver(order)}
                                                disabled={delivering === order.order.id}
                                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
                                            >
                                                <Check className="h-4 w-4" />
                                                {delivering === order.order.id ? 'Memproses...' : 'Sudah Diantar'}
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
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {tables.map((table) => (
                            <div key={table.id} className="group border-border bg-card overflow-hidden rounded-xl border shadow-sm">
                                <div className="px-3 py-3 text-center">
                                    <p className="text-foreground text-sm font-bold">{table.name}</p>
                                    {table.zone && <p className="text-muted-foreground mt-0.5 text-[10px]">{table.zone.name}</p>}
                                    <div
                                        className={`mt-2 inline-block rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusColor[table.status] ?? statusColor.available}`}
                                    >
                                        {statusLabel[table.status] ?? table.status}
                                    </div>
                                </div>

                                <div className="border-border/50 grid grid-cols-2 border-t">
                                    {tableStatusOptions.map((option) => {
                                        const isActive = table.status === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                onClick={() => handleTableStatus(table, option.value)}
                                                disabled={isActive}
                                                className={`border-border/50 border-t border-r px-2 py-2 text-[11px] font-medium transition last:border-r-0 odd:border-r [&:nth-child(-n+2)]:border-t-0 ${
                                                    isActive ? 'bg-muted text-muted-foreground cursor-default' : 'text-foreground hover:bg-muted/50'
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
