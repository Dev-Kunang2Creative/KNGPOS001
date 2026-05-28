import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { QrCode, Save, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Zone = { id: number; name: string; color_hex: string; assignment?: unknown | null };
type TableQr = { qr_token: string };
type Table = { id: number; name: string; capacity: number; zone_id: number; position_x: number; position_y: number; status: string; self_order_enabled: boolean; zone?: Zone; active_qr_code?: TableQr | null };
type Props = { tables: Table[]; zones: Zone[] };
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Tables', href: '/settings/tables' }];
const statuses = ['available', 'occupied', 'open_bill', 'reserved', 'blocked'];

export default function TablesIndex({ tables, zones }: Props) {
    const [selected, setSelected] = useState<Table | undefined>(tables[0]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Table & QR Management" />
            <main className="flex flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Table & QR Management</h1>
                    <p className="text-sm text-muted-foreground">CRUD meja, assignment zona, denah visual, dan token self-order.</p>
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
        table ? form.put(`/settings/tables/${table.id}`, { preserveScroll: true }) : form.post('/settings/tables', { preserveScroll: true, onSuccess: () => form.reset() });
    }

    return (
        <form onSubmit={submit} className="rounded-md border p-4">
            <h2 className="mb-3 text-base font-semibold">{table ? `Edit ${table.name}` : 'Tambah Meja'}</h2>
            {table?.active_qr_code && <p className="mb-3 break-all text-xs text-muted-foreground">/s/{table.active_qr_code.qr_token}</p>}
            <div className="grid gap-3">
                <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} placeholder="Nama meja" />
                <Input type="number" value={form.data.capacity} onChange={(event) => form.setData('capacity', Number(event.target.value))} placeholder="Kapasitas" />
                <Select value={form.data.zone_id} onValueChange={(value) => form.setData('zone_id', value)}>
                    <SelectTrigger><SelectValue placeholder="Zona" /></SelectTrigger>
                    <SelectContent>{zones.map((zone) => <SelectItem key={zone.id} value={String(zone.id)}>{zone.name}{zone.assignment ? '' : ' - belum dikonfigurasi'}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                    <Input type="number" value={form.data.position_x} onChange={(event) => form.setData('position_x', Number(event.target.value))} placeholder="X" />
                    <Input type="number" value={form.data.position_y} onChange={(event) => form.setData('position_y', Number(event.target.value))} placeholder="Y" />
                </div>
                <Select value={form.data.status} onValueChange={(value) => form.setData('status', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.data.self_order_enabled} onCheckedChange={(checked) => form.setData('self_order_enabled', Boolean(checked))} /> Self-order aktif</label>
                <div className="flex flex-wrap gap-2">
                    <Button type="submit"><Save />Simpan</Button>
                    {table && <Button type="button" variant="outline" onClick={() => router.post(`/settings/tables/${table.id}/qr`, {}, { preserveScroll: true })}><QrCode />Regenerate QR</Button>}
                    {table && <Button type="button" variant="destructive" onClick={() => router.delete(`/settings/tables/${table.id}`, { preserveScroll: true })}><Trash2 />Hapus</Button>}
                </div>
            </div>
        </form>
    );
}

function FloorCanvas({ tables, zones, onSelect }: { tables: Table[]; zones: Zone[]; onSelect: (table: Table) => void }) {
    return (
        <Card className="rounded-md">
            <CardHeader><CardTitle className="text-base">Denah Visual</CardTitle></CardHeader>
            <CardContent>
                <div className="relative h-[440px] overflow-hidden rounded-md border bg-muted/20">
                    {tables.map((table) => (
                        <button key={table.id} type="button" onClick={() => onSelect(table)} className="absolute flex h-16 w-24 flex-col items-center justify-center rounded-md border-2 bg-background text-xs font-medium shadow-sm" style={{ left: table.position_x, top: table.position_y, borderColor: table.zone?.color_hex ?? '#737373' }}>
                            <span>{table.name}</span>
                            <span className="text-[10px] text-muted-foreground">{table.status}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">{zones.map((zone) => <span key={zone.id} className="inline-flex items-center gap-2 text-xs"><span className="size-3 rounded-sm border" style={{ backgroundColor: zone.color_hex }} />{zone.name}</span>)}</div>
            </CardContent>
        </Card>
    );
}

function TableList({ tables, onSelect }: { tables: Table[]; onSelect: (table: Table) => void }) {
    return (
        <Card className="rounded-md">
            <CardHeader><CardTitle className="text-base">Daftar Meja</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                    <thead className="border-b text-left text-muted-foreground"><tr><th className="py-2">Meja</th><th>Zona</th><th>Kapasitas</th><th>Self-order</th><th>QR</th><th>Status</th></tr></thead>
                    <tbody>{tables.map((table) => <tr key={table.id} onClick={() => onSelect(table)} className="cursor-pointer border-b hover:bg-muted/50"><td className="py-3 font-medium">{table.name}</td><td>{table.zone?.name ?? 'Tanpa zona'} {!table.zone?.assignment && <Badge variant="destructive">Zona belum dikonfigurasi</Badge>}</td><td>{table.capacity}</td><td>{table.self_order_enabled ? 'Aktif' : 'Nonaktif'}</td><td>{table.active_qr_code ? `/s/${table.active_qr_code.qr_token.slice(0, 10)}...` : '-'}</td><td><Badge variant="outline">{table.status}</Badge></td></tr>)}</tbody>
                </table>
            </CardContent>
        </Card>
    );
}
