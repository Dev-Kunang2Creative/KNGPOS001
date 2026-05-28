import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

type Station = { id: number; name: string; status: string; queue_count: number };
type CashierRow = { kasir_name: string; total_transactions: number; total_revenue: number; is_total: boolean };
type Props = {
    metrics: {
        totalOrders: number;
        todayRevenue: number;
        kitchenStations: Station[];
        barStations: Station[];
        cashierBreakdown: CashierRow[];
    };
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

export default function DashboardIndex({ metrics }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard Manager" />
            <main className="flex flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Dashboard Manager</h1>
                    <p className="text-sm text-muted-foreground">Order, omzet, status station, dan breakdown kasir hari ini.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <Metric title="Total Order" value={metrics.totalOrders.toLocaleString('id-ID')} />
                    <Metric title="Omzet Hari Ini" value={`Rp ${Number(metrics.todayRevenue).toLocaleString('id-ID')}`} />
                    <Metric title="Station Queue" value={[...metrics.kitchenStations, ...metrics.barStations].reduce((sum, station) => sum + station.queue_count, 0).toLocaleString('id-ID')} />
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                    <StationPanel title="Kitchen Queue" stations={metrics.kitchenStations} />
                    <StationPanel title="Bar Queue" stations={metrics.barStations} />
                </div>
                <Card className="rounded-md">
                    <CardHeader><CardTitle className="text-base">Breakdown Kasir</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-sm">
                            <thead className="border-b text-left text-muted-foreground"><tr><th className="py-2">Kasir</th><th>Transaksi</th><th>Revenue</th></tr></thead>
                            <tbody>{metrics.cashierBreakdown.map((row) => <tr key={row.kasir_name} className={row.is_total ? 'font-semibold' : ''}><td className="py-2">{row.kasir_name}</td><td>{row.total_transactions}</td><td>Rp {Number(row.total_revenue).toLocaleString('id-ID')}</td></tr>)}</tbody>
                        </table>
                    </CardContent>
                </Card>
            </main>
        </AppLayout>
    );
}

function Metric({ title, value }: { title: string; value: string }) {
    return <Card className="rounded-md"><CardHeader><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{value}</CardContent></Card>;
}

function StationPanel({ title, stations }: { title: string; stations: Station[] }) {
    return (
        <Card className="rounded-md">
            <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
                {stations.map((station) => <div key={station.id} className="flex items-center justify-between rounded-md border p-3 text-sm"><span>{station.name}</span><div className="flex items-center gap-2"><Badge variant="outline">{station.status}</Badge><Badge>{station.queue_count} queued</Badge></div></div>)}
            </CardContent>
        </Card>
    );
}
