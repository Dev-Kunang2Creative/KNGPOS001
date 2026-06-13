import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Download, Eye, QrCode, Save, Trash2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { FormEvent } from 'react';

type Zone = { id: number; name: string; assignment?: unknown | null };
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
    active_qr_code?: TableQr | null;
};
type Props = { table: Table; zones: Zone[] };

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

export default function TablesEdit({ table, zones }: Props) {
    const { appUrl, restaurant } = usePage().props as any;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Zona & Meja', href: '/zones' },
        { title: `Edit Meja ${table.name}`, href: `/settings/tables/${table.id}/edit` },
    ];

    const form = useForm({
        name: table.name,
        capacity: table.capacity,
        zone_id: String(table.zone_id),
        position_x: table.position_x,
        position_y: table.position_y,
        status: table.status,
        self_order_enabled: table.self_order_enabled,
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({ ...data, zone_id: Number(data.zone_id) }));
        form.put(`/settings/tables/${table.id}`);
    }

    function downloadQR() {
        downloadQRPoster(table, appUrl, restaurant?.name, `qr-canvas-${table.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Meja ${table.name}`} />
            <main className="flex w-full flex-1 flex-col gap-6 p-4 lg:p-8">
                <div className="mb-2 flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-normal">Edit Meja: {table.name}</h1>
                    <p className="text-muted-foreground text-sm">Ubah detail meja, atur posisi, dan kelola QR Code meja.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-[1fr_320px]">
                    <form onSubmit={submit} className="bg-card h-fit space-y-4 rounded-md border p-6 shadow-sm">
                        <h2 className="border-b pb-2 text-lg font-medium">Informasi Meja</h2>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>Nama / Nomor Meja</Label>
                                <Input
                                    value={form.data.name}
                                    onChange={(event) => form.setData('name', event.target.value)}
                                    placeholder="Contoh: Meja 1"
                                />
                                <InputError message={form.errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Kapasitas Kursi</Label>
                                <Input
                                    type="number"
                                    value={form.data.capacity}
                                    onChange={(event) => form.setData('capacity', Number(event.target.value))}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Zona</Label>
                                <Select value={form.data.zone_id} onValueChange={(value) => form.setData('zone_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Zona" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {zones.map((zone) => (
                                            <SelectItem key={zone.id} value={String(zone.id)}>
                                                {zone.name}
                                                {zone.assignment ? '' : ' (belum dikonfigurasi)'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select value={form.data.status} onValueChange={(value) => form.setData('status', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Posisi Denah (X, Y)</Label>
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
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={form.data.self_order_enabled}
                                    onCheckedChange={(checked) => form.setData('self_order_enabled', Boolean(checked))}
                                />{' '}
                                Izinkan pelanggan self-order dari meja ini
                            </label>
                        </div>

                        <div className="flex justify-between gap-2 pt-4">
                            <Button type="button" variant="destructive" onClick={() => router.delete(`/settings/tables/${table.id}`)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus
                            </Button>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => router.visit('/zones')}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    <Save className="mr-2 h-4 w-4" />
                                    Simpan
                                </Button>
                            </div>
                        </div>
                    </form>

                    <div className="space-y-4">
                        <div className="bg-card flex flex-col items-center gap-4 rounded-md border p-6 shadow-sm">
                            <h3 className="w-full border-b pb-2 text-left text-lg font-medium">QR Code Self-Order</h3>

                            {table.active_qr_code ? (
                                <>
                                    <div className="rounded-md border p-3">
                                        <QRCodeCanvas
                                            id={`qr-canvas-${table.id}`}
                                            value={`${appUrl}/s/${table.active_qr_code.qr_token}`}
                                            size={180}
                                        />
                                    </div>

                                    <div className="flex w-full flex-col gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button type="button" variant="secondary" className="w-full">
                                                    <Eye className="mr-2 h-4 w-4" /> Lihat Besar
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>QR Code Meja: {table.name}</DialogTitle>
                                                </DialogHeader>
                                                <div className="flex flex-col items-center justify-center gap-4 p-6">
                                                    <div className="rounded-md border p-4">
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

                                        <Button type="button" variant="outline" onClick={downloadQR} className="w-full">
                                            <Download className="mr-2 h-4 w-4" /> Download Poster
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={() => router.post(`/settings/tables/${table.id}/qr`, {}, { preserveScroll: true })}
                                            className="mt-4 w-full"
                                        >
                                            <QrCode className="mr-2 h-4 w-4" /> Regenerate QR Baru
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted-foreground text-center text-sm">QR Code belum dibuat.</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}
