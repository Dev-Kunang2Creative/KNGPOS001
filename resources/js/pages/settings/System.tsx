import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

type Station = { id: number; name: string };
type Printer = { id: number; name: string; type: string; ip_address?: string | null; port: number; paper_width: string; is_active: boolean; kitchen_station_id?: number | null; bar_station_id?: number | null };
type Props = { settings: Record<string, string | boolean | null>; printers: Printer[]; kitchenStations: Station[]; barStations: Station[] };
const breadcrumbs: BreadcrumbItem[] = [{ title: 'System Settings', href: '/settings/system' }];

export default function SystemSettings({ settings, printers, kitchenStations, barStations }: Props) {
    const form = useForm({
        restaurant_name: String(settings.restaurant_name ?? ''),
        restaurant_address: String(settings.restaurant_address ?? ''),
        restaurant_phone: String(settings.restaurant_phone ?? ''),
        receipt_header: String(settings.receipt_header ?? ''),
        receipt_footer: String(settings.receipt_footer ?? ''),
        tax_percentage: Number(settings.tax_percentage ?? 0),
        tax_is_active: settings.tax_is_active === '1',
        service_charge_percentage: Number(settings.service_charge_percentage ?? 0),
        service_charge_is_active: settings.service_charge_is_active === '1',
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.put('/settings/system', { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System Settings" />
            <main className="grid flex-1 gap-4 p-4 xl:grid-cols-[420px_1fr]">
                <form onSubmit={submit} className="h-fit rounded-md border p-4">
                    <h1 className="mb-3 text-xl font-semibold">System Settings</h1>
                    <div className="grid gap-3">
                        <Input value={form.data.restaurant_name} onChange={(e) => form.setData('restaurant_name', e.target.value)} placeholder="Nama restoran" />
                        <Input value={form.data.restaurant_address} onChange={(e) => form.setData('restaurant_address', e.target.value)} placeholder="Alamat" />
                        <Input value={form.data.restaurant_phone} onChange={(e) => form.setData('restaurant_phone', e.target.value)} placeholder="Telepon" />
                        <Input value={form.data.receipt_header} onChange={(e) => form.setData('receipt_header', e.target.value)} placeholder="Receipt header" />
                        <Input value={form.data.receipt_footer} onChange={(e) => form.setData('receipt_footer', e.target.value)} placeholder="Receipt footer" />
                        <Input type="number" value={form.data.tax_percentage} onChange={(e) => form.setData('tax_percentage', Number(e.target.value))} placeholder="Tax %" />
                        <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.data.tax_is_active} onCheckedChange={(v) => form.setData('tax_is_active', Boolean(v))} />Tax aktif</label>
                        <Input type="number" value={form.data.service_charge_percentage} onChange={(e) => form.setData('service_charge_percentage', Number(e.target.value))} placeholder="Service charge %" />
                        <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.data.service_charge_is_active} onCheckedChange={(v) => form.setData('service_charge_is_active', Boolean(v))} />Service charge aktif</label>
                        <div className="rounded-md border bg-muted/30 p-3 text-sm">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="font-medium">Xendit dari .env</span>
                                <Badge variant={settings.xendit_enabled === '1' ? 'default' : 'secondary'}>{settings.xendit_enabled === '1' ? 'Aktif' : 'Nonaktif'}</Badge>
                            </div>
                            <div className="grid gap-1 text-muted-foreground">
                                <span>Secret key: {settings.has_xendit_secret_key ? 'tersedia' : 'belum ada'}</span>
                                <span>Webhook token: {settings.has_xendit_webhook_token ? 'tersedia' : 'belum ada'}</span>
                            </div>
                        </div>
                        <Button type="submit">Simpan Settings</Button>
                    </div>
                </form>
                <section className="space-y-4">
                    <PrinterForm kitchenStations={kitchenStations} barStations={barStations} />
                    <div className="grid gap-3 md:grid-cols-2">
                        {printers.map((printer) => <PrinterForm key={printer.id} printer={printer} kitchenStations={kitchenStations} barStations={barStations} />)}
                    </div>
                </section>
            </main>
        </AppLayout>
    );
}

function PrinterForm({ printer, kitchenStations, barStations }: { printer?: Printer; kitchenStations: Station[]; barStations: Station[] }) {
    const form = useForm({ name: printer?.name ?? '', type: printer?.type ?? 'kasir', ip_address: printer?.ip_address ?? '', port: printer?.port ?? 9100, paper_width: printer?.paper_width ?? '80mm', is_active: printer?.is_active ?? true, kitchen_station_id: printer?.kitchen_station_id ? String(printer.kitchen_station_id) : 'none', bar_station_id: printer?.bar_station_id ? String(printer.bar_station_id) : 'none' });
    function submit(event: FormEvent) {
        event.preventDefault();
        const payload = { ...form.data, kitchen_station_id: form.data.kitchen_station_id === 'none' ? null : Number(form.data.kitchen_station_id), bar_station_id: form.data.bar_station_id === 'none' ? null : Number(form.data.bar_station_id) };
        form.transform(() => payload);
        if (printer) {
            form.put(`/settings/printers/${printer.id}`);
        } else {
            form.post('/settings/printers');
        }
    }
    return (
        <form onSubmit={submit} className="rounded-md border p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">{printer ? printer.name : 'Tambah Printer'}</h2>{printer && <Badge variant="outline">{printer.type}</Badge>}</div>
            <div className="grid gap-2">
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="Nama printer" />
                <Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="kasir">kasir</SelectItem><SelectItem value="kitchen">kitchen</SelectItem><SelectItem value="bar">bar</SelectItem></SelectContent></Select>
                <Input value={form.data.ip_address} onChange={(e) => form.setData('ip_address', e.target.value)} placeholder="IP address" />
                <Input type="number" value={form.data.port} onChange={(e) => form.setData('port', Number(e.target.value))} />
                <Select value={form.data.paper_width} onValueChange={(v) => form.setData('paper_width', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="58mm">58mm</SelectItem><SelectItem value="80mm">80mm</SelectItem></SelectContent></Select>
                <Select value={form.data.kitchen_station_id} onValueChange={(v) => form.setData('kitchen_station_id', v)}><SelectTrigger><SelectValue placeholder="Kitchen station" /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa kitchen</SelectItem>{kitchenStations.map((station) => <SelectItem key={station.id} value={String(station.id)}>{station.name}</SelectItem>)}</SelectContent></Select>
                <Select value={form.data.bar_station_id} onValueChange={(v) => form.setData('bar_station_id', v)}><SelectTrigger><SelectValue placeholder="Bar station" /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa bar</SelectItem>{barStations.map((station) => <SelectItem key={station.id} value={String(station.id)}>{station.name}</SelectItem>)}</SelectContent></Select>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', Boolean(v))} />Aktif</label>
                <Button type="submit">Simpan Printer</Button>
            </div>
        </form>
    );
}
