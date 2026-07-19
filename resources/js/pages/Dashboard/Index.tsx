import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Banknote, ChefHat, GlassWater, Receipt, ShoppingBag, TrendingUp, Trophy, Wallet } from 'lucide-react';
import { useState } from 'react';

type Station = { id: number; name: string; status: string; queue_count: number };
type CashierRow = { kasir_name: string; total_transactions: number; total_revenue: number; is_total: boolean };
type TrendPoint = { date: string; label: string; revenue: number };
type MenuRow = { name: string; quantity: number; revenue: number };
type PaymentRow = { method: string; amount: number; count: number };

type Props = {
    metrics: {
        totalOrders: number;
        todayRevenue: number;
        todayTransactions: number;
        avgOrderValue: number;
        revenueTrend: TrendPoint[];
        topMenuItems: MenuRow[];
        paymentMethods: PaymentRow[];
        kitchenStations: Station[];
        barStations: Station[];
        cashierBreakdown: CashierRow[];
    };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

const money = (v: number | string) => Number(v || 0).toLocaleString('id-ID');
const compact = (v: number) => {
    if (v >= 1_000_000) {
        return `${(v / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`;
    }
    if (v >= 1_000) {
        return `${Math.round(v / 1_000)}rb`;
    }
    return String(Math.round(v));
};

// Validated categorical palette (fixed order, never cycled).
const PALETTE = ['#2a78d6', '#1baf7a', '#eda100', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834', '#008300'];
const METHOD_LABELS: Record<string, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    xendit: 'Online',
    invoice: 'Online',
    online: 'Online',
    ewallet: 'E-Wallet',
    va: 'Virtual Account',
    bank_transfer: 'Transfer Bank',
    card: 'Kartu',
};

export default function DashboardIndex({ metrics }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Manager" />
            <main className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard Manager</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Pantau omzet, menu terlaris, metode pembayaran, dan antrean station.</p>
                </div>

                {/* KPI tiles */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatTile
                        icon={Banknote}
                        label="Omzet Hari Ini"
                        value={`Rp ${money(metrics.todayRevenue)}`}
                        accent="text-emerald-600"
                        tint="bg-emerald-500/10"
                    />
                    <StatTile icon={Receipt} label="Transaksi Hari Ini" value={money(metrics.todayTransactions)} accent="text-blue-600" tint="bg-blue-500/10" />
                    <StatTile icon={ShoppingBag} label="Total Order" value={money(metrics.totalOrders)} accent="text-violet-600" tint="bg-violet-500/10" />
                    <StatTile
                        icon={Wallet}
                        label="Rata-rata / Transaksi"
                        value={`Rp ${money(metrics.avgOrderValue)}`}
                        accent="text-orange-600"
                        tint="bg-orange-500/10"
                    />
                </div>

                {/* Trend + payment methods */}
                <div className="grid gap-4 xl:grid-cols-3">
                    <Card className="rounded-xl xl:col-span-2">
                        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <TrendingUp className="text-primary size-4" /> Tren Omzet 7 Hari
                            </CardTitle>
                            <span className="text-muted-foreground text-xs">Pembayaran lunas per hari</span>
                        </CardHeader>
                        <CardContent>
                            <RevenueTrendChart data={metrics.revenueTrend} />
                        </CardContent>
                    </Card>

                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Wallet className="text-primary size-4" /> Metode Pembayaran
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PaymentDonut data={metrics.paymentMethods} />
                        </CardContent>
                    </Card>
                </div>

                {/* Top menu + cashier breakdown */}
                <div className="grid gap-4 xl:grid-cols-2">
                    <Card className="rounded-xl">
                        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Trophy className="text-primary size-4" /> Menu Terlaris
                            </CardTitle>
                            <span className="text-muted-foreground text-xs">7 hari terakhir</span>
                        </CardHeader>
                        <CardContent>
                            <TopMenuList items={metrics.topMenuItems} />
                        </CardContent>
                    </Card>

                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle className="text-base">Breakdown Kasir Hari Ini</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <table className="w-full min-w-[420px] text-sm">
                                <thead className="text-muted-foreground border-b text-left">
                                    <tr>
                                        <th className="py-2 font-medium">Kasir</th>
                                        <th className="py-2 font-medium">Transaksi</th>
                                        <th className="py-2 text-right font-medium">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metrics.cashierBreakdown.map((row) => (
                                        <tr key={row.kasir_name} className={`border-b last:border-0 ${row.is_total ? 'font-semibold' : ''}`}>
                                            <td className="py-2">{row.kasir_name}</td>
                                            <td className="py-2 tabular-nums">{row.total_transactions}</td>
                                            <td className="py-2 text-right tabular-nums">Rp {money(row.total_revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>

                {/* Station queues */}
                <div className="grid gap-4 xl:grid-cols-2">
                    <StationPanel title="Antrean Kitchen" icon={ChefHat} stations={metrics.kitchenStations} />
                    <StationPanel title="Antrean Bar" icon={GlassWater} stations={metrics.barStations} />
                </div>
            </main>
        </AppLayout>
    );
}

function StatTile({
    icon: Icon,
    label,
    value,
    accent,
    tint,
}: {
    icon: typeof Banknote;
    label: string;
    value: string;
    accent: string;
    tint: string;
}) {
    return (
        <Card className="rounded-xl">
            <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tint} ${accent}`}>
                    <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-muted-foreground truncate text-xs font-medium">{label}</p>
                    <p className="mt-0.5 truncate text-xl font-bold">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
    const max = Math.max(...data.map((d) => d.revenue), 1);
    const hasData = data.some((d) => d.revenue > 0);

    return (
        <div>
            <div className="flex h-44 items-end gap-2 sm:gap-3">
                {data.map((point) => {
                    const heightPct = Math.max((point.revenue / max) * 100, point.revenue > 0 ? 4 : 0);
                    return (
                        <div key={point.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                            <div className="bg-foreground text-background pointer-events-none rounded-md px-2 py-1 text-[11px] font-semibold opacity-0 shadow transition-opacity group-hover:opacity-100">
                                Rp {money(point.revenue)}
                            </div>
                            <div className="flex w-full flex-1 items-end">
                                <div
                                    className="bg-primary/85 group-hover:bg-primary w-full rounded-t-[4px] transition-all"
                                    style={{ height: `${heightPct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-2 flex gap-2 sm:gap-3">
                {data.map((point) => (
                    <span key={point.date} className="text-muted-foreground flex-1 text-center text-[11px]">
                        {point.label}
                    </span>
                ))}
            </div>
            {!hasData && <p className="text-muted-foreground mt-3 text-center text-xs">Belum ada pembayaran dalam 7 hari terakhir.</p>}
        </div>
    );
}

function TopMenuList({ items }: { items: MenuRow[] }) {
    if (items.length === 0) {
        return <p className="text-muted-foreground py-8 text-center text-sm">Belum ada penjualan tercatat.</p>;
    }
    const max = Math.max(...items.map((i) => i.quantity), 1);

    return (
        <div className="space-y-3">
            {items.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                    <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-400 text-amber-950' : 'bg-muted text-muted-foreground'}`}
                    >
                        {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-medium">{item.name}</p>
                            <p className="text-muted-foreground shrink-0 text-xs tabular-nums">Rp {money(item.revenue)}</p>
                        </div>
                        <div className="bg-muted mt-1 h-2 overflow-hidden rounded-full">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${(item.quantity / max) * 100}%` }} />
                        </div>
                    </div>
                    <span className="text-primary w-12 shrink-0 text-right text-sm font-semibold tabular-nums">{item.quantity}x</span>
                </div>
            ))}
        </div>
    );
}

function PaymentDonut({ data }: { data: PaymentRow[] }) {
    const [active, setActive] = useState<number | null>(null);
    const total = data.reduce((sum, d) => sum + d.amount, 0);

    if (total === 0) {
        return <p className="text-muted-foreground py-8 text-center text-sm">Belum ada pembayaran hari ini.</p>;
    }

    const radius = 60;
    const stroke = 22;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <svg viewBox="0 0 160 160" className="size-40 -rotate-90">
                    {data.map((row, index) => {
                        const fraction = row.amount / total;
                        const dash = fraction * circumference;
                        const segment = (
                            <circle
                                key={row.method}
                                cx="80"
                                cy="80"
                                r={radius}
                                fill="none"
                                stroke={PALETTE[index % PALETTE.length]}
                                strokeWidth={active === index ? stroke + 4 : stroke}
                                strokeDasharray={`${dash} ${circumference - dash}`}
                                strokeDashoffset={-offset}
                                className="transition-all"
                                onMouseEnter={() => setActive(index)}
                                onMouseLeave={() => setActive(null)}
                            />
                        );
                        offset += dash;
                        return segment;
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {active !== null ? (
                        <>
                            <span className="text-muted-foreground text-[11px]">{METHOD_LABELS[data[active].method] ?? data[active].method}</span>
                            <span className="text-sm font-bold">Rp {compact(data[active].amount)}</span>
                            <span className="text-muted-foreground text-[11px]">{Math.round((data[active].amount / total) * 100)}%</span>
                        </>
                    ) : (
                        <>
                            <span className="text-muted-foreground text-[11px]">Total</span>
                            <span className="text-sm font-bold">Rp {compact(total)}</span>
                        </>
                    )}
                </div>
            </div>

            <div className="grid w-full gap-1.5">
                {data.map((row, index) => (
                    <div
                        key={row.method}
                        className="flex items-center gap-2 rounded-md px-1 py-0.5 text-xs"
                        onMouseEnter={() => setActive(index)}
                        onMouseLeave={() => setActive(null)}
                    >
                        <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: PALETTE[index % PALETTE.length] }} />
                        <span className="flex-1 truncate">{METHOD_LABELS[row.method] ?? row.method}</span>
                        <span className="text-muted-foreground tabular-nums">Rp {money(row.amount)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StationPanel({ title, icon: Icon, stations }: { title: string; icon: typeof ChefHat; stations: Station[] }) {
    return (
        <Card className="rounded-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="text-primary size-4" /> {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {stations.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-center text-sm">Belum ada station.</p>
                ) : (
                    stations.map((station) => (
                        <div key={station.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                            <span className="font-medium">{station.name}</span>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize">
                                    {station.status}
                                </Badge>
                                <Badge variant={station.queue_count > 0 ? 'default' : 'secondary'}>{station.queue_count} antre</Badge>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
