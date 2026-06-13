import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Download, Eye, QrCode, Save, Trash2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { FormEvent, useState } from 'react';

type Zone = { id: number; name: string; color_hex: string; assignment?: unknown | null };
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
type Props = { tables: Table[]; zones: Zone[] };
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Tables', href: '/settings/tables' }];
const statuses = ['available', 'occupied', 'open_bill', 'reserved', 'blocked'];

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

export default function TablesIndex({ tables, zones }: Props) {
    const [selected, setSelected] = useState<Table | undefined>(tables[0]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Table & QR Management" />
            <main className="flex flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Table & QR Management</h1>
                    <p className="text-muted-foreground text-sm">CRUD meja, assignment zona, denah visual, dan token self-order.</p>
                </div>
                <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
                    <div className="space-y-4">
                        <TableForm zones={zones} table={selected} />
                        <TableForm zones={zones} />
                    </div>
                    <div className="space-y-4">
                        <FloorCanvas tables={tables} zones={zones} onSelect={setSelected} />
                        <TableList tables={tables} onSelect={setSelected} />
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}

function TableForm({ zones, table }: { zones: Zone[]; table?: Table }) {
    const { appUrl, restaurant } = usePage().props as any;
    const form = useForm({
        name: table?.name ?? '',
        capacity: table?.capacity ?? 4,
        zone_id: table ? String(table.zone_id) : '',
        position_x: table?.position_x ?? 0,
        position_y: table?.position_y ?? 0,
        status: table?.status ?? 'available',
        self_order_enabled: table?.self_order_enabled ?? true,
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({ ...data, zone_id: Number(data.zone_id) }));
        table
            ? form.put(`/settings/tables/${table.id}`, { preserveScroll: true })
            : form.post('/settings/tables', { preserveScroll: true, onSuccess: () => form.reset() });
    }

    function downloadQR() {
        if (!table) return;
        downloadQRPoster(table, appUrl, restaurant?.name, `qr-canvas-${table.id}`);
    }

    return (
        <form onSubmit={submit} className="rounded-md border p-4">
            <h2 className="mb-3 text-base font-semibold">{table ? `Edit ${table.name}` : 'Tambah Meja'}</h2>
            {table?.active_qr_code && (
                <div className="bg-muted/10 mb-4 flex flex-col items-center gap-3 rounded-md border p-4">
                    <div className="rounded-md bg-white p-2">
                        <QRCodeCanvas id={`qr-canvas-${table.id}`} value={`${appUrl}/s/${table.active_qr_code.qr_token}`} size={160} />
                    </div>
                    <p className="text-muted-foreground text-center text-xs font-medium break-all">
                        {appUrl}/s/{table.active_qr_code.qr_token}
                    </p>
                    <div className="flex gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button type="button" variant="secondary" size="sm">
                                    <Eye className="mr-2 h-4 w-4" />
                                    Lihat QR
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>QR Code Meja: {table.name}</DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col items-center justify-center gap-4 p-6">
                                    <div className="rounded-md bg-white p-4">
                                        <QRCodeCanvas value={`${appUrl}/s/${table.active_qr_code.qr_token}`} size={300} />
                                    </div>
                                    <p className="text-muted-foreground text-center text-sm font-medium break-all">
                                        {appUrl}/s/{table.active_qr_code.qr_token}
                                    </p>
                                    <Button type="button" onClick={downloadQR} className="mt-2 w-full">
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Poster QR
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Button type="button" variant="outline" size="sm" onClick={downloadQR}>
                            <Download className="mr-2 h-4 w-4" />
                            Download Poster
                        </Button>
                    </div>
                </div>
            )}
            <div className="grid gap-3">
                <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} placeholder="Nama meja" />
                <Input
                    type="number"
                    value={form.data.capacity}
                    onChange={(event) => form.setData('capacity', Number(event.target.value))}
                    placeholder="Kapasitas"
                />
                <Select value={form.data.zone_id} onValueChange={(value) => form.setData('zone_id', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Zona" />
                    </SelectTrigger>
                    <SelectContent>
                        {zones.map((zone) => (
                            <SelectItem key={zone.id} value={String(zone.id)}>
                                {zone.name}
                                {zone.assignment ? '' : ' - belum dikonfigurasi'}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                    <Input
                        type="number"
                        value={form.data.position_x}
                        onChange={(event) => form.setData('position_x', Number(event.target.value))}
                        placeholder="X"
                    />
                    <Input
                        type="number"
                        value={form.data.position_y}
                        onChange={(event) => form.setData('position_y', Number(event.target.value))}
                        placeholder="Y"
                    />
                </div>
                <Select value={form.data.status} onValueChange={(value) => form.setData('status', value)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {statuses.map((status) => (
                            <SelectItem key={status} value={status}>
                                {status}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                        checked={form.data.self_order_enabled}
                        onCheckedChange={(checked) => form.setData('self_order_enabled', Boolean(checked))}
                    />{' '}
                    Self-order aktif
                </label>
                <div className="flex flex-wrap gap-2">
                    <Button type="submit">
                        <Save />
                        Simpan
                    </Button>
                    {table && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.post(`/settings/tables/${table.id}/qr`, {}, { preserveScroll: true })}
                        >
                            <QrCode />
                            Regenerate QR
                        </Button>
                    )}
                    {table && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => router.delete(`/settings/tables/${table.id}`, { preserveScroll: true })}
                        >
                            <Trash2 />
                            Hapus
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
}

function FloorCanvas({ tables, zones, onSelect }: { tables: Table[]; zones: Zone[]; onSelect: (table: Table) => void }) {
    return (
        <Card className="rounded-md">
            <CardHeader>
                <CardTitle className="text-base">Denah Visual</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="bg-muted/20 relative h-[440px] overflow-hidden rounded-md border">
                    {tables.map((table) => (
                        <button
                            key={table.id}
                            type="button"
                            onClick={() => onSelect(table)}
                            className="bg-background absolute flex h-16 w-24 flex-col items-center justify-center rounded-md border-2 text-xs font-medium shadow-sm"
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

function TableList({ tables, onSelect }: { tables: Table[]; onSelect: (table: Table) => void }) {
    const { appUrl, restaurant } = usePage().props as any;
    return (
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
                        </tr>
                    </thead>
                    <tbody>
                        {tables.map((table) => (
                            <tr key={table.id} onClick={() => onSelect(table)} className="hover:bg-muted/50 cursor-pointer border-b">
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
                                <td className="text-right" onClick={(e) => e.stopPropagation()}>
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}
