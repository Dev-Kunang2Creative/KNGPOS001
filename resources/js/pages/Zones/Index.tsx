import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { CirclePlus, Download, Eye, MapPinned, Pencil } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useState } from 'react';

type Station = { id: number; name: string; description?: string | null; status: 'active' | 'overloaded' | 'inactive'; active_orders_count: number };
type Waiter = { id: number; name: string; email: string };
type Zone = {
    id: number;
    name: string;
    description?: string | null;
    color_hex: string;
    sort_order: number;
    is_active: boolean;
    tables_count: number;
    assignment?: { kitchen_station_id: number; bar_station_id: number; kitchen_station?: Station; bar_station?: Station } | null;
    waiters: Waiter[];
};
type TableQr = { qr_token: string };
type Table = {
    id: number;
    name: string;
    capacity: number;
    zone_id: number;
    position_x: number;
    position_y: number;
    status: string;
    self_order_enabled: boolean;
    zone?: Zone;
    active_qr_code?: TableQr | null;
};

type Props = {
    zones: Zone[];
    kitchenStations: Station[];
    barStations: Station[];
    waiters: Waiter[];
    tables: Table[];
    allZonesAssigned: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Zona & Meja', href: '/zones' }];
const statuses = ['active', 'overloaded', 'inactive'] as const;

function downloadQRPoster(table: Table, appUrl: string, restaurantName: string, canvasId: string) {
    const qrCanvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!qrCanvas) {
        alert('QR Code sedang disiapkan, silakan coba lagi.');
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 1000;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, 220);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(restaurantName || 'Karcisqu POS', canvas.width / 2, 110);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '32px "Inter", sans-serif';
    ctx.fillText('Self-Order QR Code', canvas.width / 2, 170);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 80px "Inter", sans-serif';
    ctx.fillText(`Meja: ${table.name}`, canvas.width / 2, 360);

    const qrSize = 480;
    const qrX = (canvas.width - qrSize) / 2;
    const qrY = 420;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    ctx.fillStyle = '#64748b';
    ctx.font = '28px "Inter", sans-serif';
    ctx.fillText('Scan dengan kamera HP Anda untuk memesan', canvas.width / 2, 950);

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `QR-Poster-${table.name}.png`;
    link.href = url;
    link.click();
}

export default function ZonesIndex({ zones, kitchenStations, barStations, waiters, tables, allZonesAssigned }: Props) {
    const [tab, setTab] = useState<'zones' | 'tables' | 'kitchen' | 'bar'>('zones');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Zona & Meja" />
            <main className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-normal">Zona & Meja Management</h1>
                        <p className="text-muted-foreground text-sm">Kelola meja, routing zona ke station, dan token self-order.</p>
                    </div>
                    <Badge variant={allZonesAssigned ? 'secondary' : 'destructive'}>
                        {allZonesAssigned ? 'Semua zona siap order' : 'Ada zona belum dikonfigurasi'}
                    </Badge>
                </div>

                <div className="flex w-full gap-2 overflow-x-auto border-b">
                    {[
                        ['zones', 'Zona'],
                        ['tables', 'Meja'],
                        ['kitchen', 'Kitchen Stations'],
                        ['bar', 'Bar Stations'],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setTab(value as any)}
                            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === value ? 'border-primary text-primary' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'zones' && <ZonesTab zones={zones} />}
                {tab === 'tables' && <TablesTab tables={tables} zones={zones} />}
                {tab === 'kitchen' && <StationsTab type="kitchen" stations={kitchenStations} />}
                {tab === 'bar' && <StationsTab type="bar" stations={barStations} />}
            </main>
        </AppLayout>
    );
}

function ZonesTab({ zones }: { zones: Zone[] }) {
    return (
        <Card className="rounded-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Daftar Zona</CardTitle>
                <Button onClick={() => router.visit('/zones/create')} size="sm">
                    <CirclePlus className="mr-2 h-4 w-4" />
                    Tambah Zona
                </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                    <thead className="text-muted-foreground border-b text-left">
                        <tr>
                            <th className="py-2 font-medium">Nama</th>
                            <th className="py-2 font-medium">Warna</th>
                            <th className="py-2 font-medium">Kitchen</th>
                            <th className="py-2 font-medium">Bar</th>
                            <th className="py-2 font-medium">Meja</th>
                            <th className="py-2 font-medium">Status</th>
                            <th className="py-2 text-right font-medium">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {zones.map((zone) => (
                            <tr key={zone.id} className="hover:bg-muted/50 border-b">
                                <td className="py-3 font-medium">{zone.name}</td>
                                <td className="py-3">
                                    <span className="inline-flex size-5 rounded-sm border" style={{ backgroundColor: zone.color_hex }} />
                                </td>
                                <td className="py-3">
                                    {zone.assignment?.kitchen_station?.name ?? <Badge variant="destructive">Belum Dikonfigurasi</Badge>}
                                </td>
                                <td className="py-3">
                                    {zone.assignment?.bar_station?.name ?? <Badge variant="destructive">Belum Dikonfigurasi</Badge>}
                                </td>
                                <td className="py-3">{zone.tables_count}</td>
                                <td className="py-3">
                                    <Badge variant={zone.is_active ? 'secondary' : 'outline'}>{zone.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                                </td>
                                <td className="py-3 text-right">
                                    <Button variant="outline" size="sm" onClick={() => router.visit(`/zones/${zone.id}/edit`)}>
                                        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {zones.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-muted-foreground py-8 text-center">
                                    Belum ada zona.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}

function TablesTab({ tables, zones }: { tables: Table[]; zones: Zone[] }) {
    const { appUrl, restaurant } = usePage().props as any;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Meja Restoran</h2>
                <Button onClick={() => router.visit('/settings/tables/create')} size="sm">
                    <CirclePlus className="mr-2 h-4 w-4" />
                    Tambah Meja
                </Button>
            </div>

            <FloorCanvas tables={tables} zones={zones} />

            <Card className="rounded-md">
                <CardHeader>
                    <CardTitle className="text-base">Daftar Meja</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                        <thead className="text-muted-foreground border-b text-left">
                            <tr>
                                <th className="py-2">Meja</th>
                                <th>Zona</th>
                                <th>Kapasitas</th>
                                <th>Self-order</th>
                                <th>Status</th>
                                <th className="text-right">Aksi QR</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tables.map((table) => (
                                <tr key={table.id} className="hover:bg-muted/50 border-b">
                                    <td className="py-3 font-medium">{table.name}</td>
                                    <td>
                                        {table.zone?.name ?? 'Tanpa zona'}{' '}
                                        {!table.zone?.assignment && <Badge variant="destructive">Zona belum dikonfigurasi</Badge>}
                                    </td>
                                    <td>{table.capacity}</td>
                                    <td>{table.self_order_enabled ? 'Aktif' : 'Nonaktif'}</td>
                                    <td>
                                        <Badge variant="outline">{table.status}</Badge>
                                    </td>
                                    <td className="text-right">
                                        {table.active_qr_code ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="hidden">
                                                    <QRCodeCanvas
                                                        id={`qr-canvas-hidden-${table.id}`}
                                                        value={`${appUrl}/s/${table.active_qr_code.qr_token}`}
                                                        size={400}
                                                    />
                                                </div>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button type="button" variant="secondary" size="icon" title="Lihat QR">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-md">
                                                        <DialogHeader>
                                                            <DialogTitle>QR Code Meja: {table.name}</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="flex flex-col items-center justify-center gap-4 p-6">
                                                            <div className="rounded-md border bg-white p-4 shadow-sm">
                                                                <QRCodeCanvas value={`${appUrl}/s/${table.active_qr_code.qr_token}`} size={300} />
                                                            </div>
                                                            <p className="text-muted-foreground text-center text-sm font-medium break-all">
                                                                {appUrl}/s/{table.active_qr_code.qr_token}
                                                            </p>
                                                            <Button
                                                                type="button"
                                                                onClick={() =>
                                                                    downloadQRPoster(table, appUrl, restaurant?.name, `qr-canvas-hidden-${table.id}`)
                                                                }
                                                                className="mt-2 w-full"
                                                            >
                                                                <Download className="mr-2 h-4 w-4" />
                                                                Download Poster QR
                                                            </Button>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    title="Download Poster QR"
                                                    onClick={() => downloadQRPoster(table, appUrl, restaurant?.name, `qr-canvas-hidden-${table.id}`)}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => router.visit(`/settings/tables/${table.id}/edit`)}>
                                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {tables.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-muted-foreground py-8 text-center">
                                        Belum ada meja.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}

function FloorCanvas({ tables, zones }: { tables: Table[]; zones: Zone[] }) {
    return (
        <Card className="rounded-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <MapPinned className="h-5 w-5" /> Denah Visual
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="bg-muted/20 relative h-[440px] overflow-x-auto rounded-md border">
                    {tables.map((table) => (
                        <button
                            key={table.id}
                            type="button"
                            title={`Edit ${table.name}`}
                            onClick={() => router.visit(`/settings/tables/${table.id}/edit`)}
                            className="bg-background absolute flex h-16 w-24 flex-col items-center justify-center rounded-md border-2 text-xs font-medium shadow-sm transition-transform hover:scale-105"
                            style={{ left: table.position_x, top: table.position_y, borderColor: table.zone?.color_hex ?? '#737373' }}
                        >
                            <span>{table.name}</span>
                            <span className="text-muted-foreground text-[10px]">{table.status}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {zones.map((zone) => (
                        <span key={zone.id} className="inline-flex items-center gap-2 text-xs">
                            <span className="size-3 rounded-sm border" style={{ backgroundColor: zone.color_hex }} />
                            {zone.name}
                        </span>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function StationsTab({ type, stations }: { type: 'kitchen' | 'bar'; stations: Station[] }) {
    const isKitchen = type === 'kitchen';
    const baseUrl = isKitchen ? '/stations/kitchen' : '/stations/bar';
    const titleText = `${isKitchen ? 'Kitchen' : 'Bar'} Stations`;

    return (
        <Card className="rounded-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Daftar {titleText}</CardTitle>
                <Button onClick={() => router.visit(`${baseUrl}/create`)} size="sm">
                    <CirclePlus className="mr-2 h-4 w-4" />
                    Tambah Station
                </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                    <thead className="text-muted-foreground border-b text-left">
                        <tr>
                            <th className="py-2 font-medium">Nama Station</th>
                            <th className="py-2 font-medium">Deskripsi / Lokasi</th>
                            <th className="py-2 font-medium">Order Aktif</th>
                            <th className="py-2 font-medium">Status</th>
                            <th className="py-2 text-right font-medium">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stations.map((station) => (
                            <tr key={station.id} className="hover:bg-muted/50 border-b">
                                <td className="py-3 font-medium">{station.name}</td>
                                <td className="py-3">{station.description || '-'}</td>
                                <td className="py-3">{station.active_orders_count || 0}</td>
                                <td className="py-3">
                                    <Badge
                                        variant={
                                            station.status === 'active' ? 'secondary' : station.status === 'overloaded' ? 'destructive' : 'outline'
                                        }
                                    >
                                        {station.status}
                                    </Badge>
                                </td>
                                <td className="py-3 text-right">
                                    <Button variant="outline" size="sm" onClick={() => router.visit(`${baseUrl}/${station.id}/edit`)}>
                                        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {stations.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-muted-foreground py-8 text-center">
                                    Belum ada station.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}
