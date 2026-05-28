import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CirclePlus, Save, Trash2 } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

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

type Props = {
    zones: Zone[];
    kitchenStations: Station[];
    barStations: Station[];
    waiters: Waiter[];
    allZonesAssigned: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Zones', href: '/zones' }];
const statuses = ['active', 'overloaded', 'inactive'] as const;

export default function ZonesIndex({ zones, kitchenStations, barStations, waiters, allZonesAssigned }: Props) {
    const [tab, setTab] = useState<'zones' | 'kitchen' | 'bar'>('zones');
    const [selectedZoneId, setSelectedZoneId] = useState<number | null>(zones[0]?.id ?? null);
    const selectedZone = useMemo(() => zones.find((zone) => zone.id === selectedZoneId) ?? zones[0], [zones, selectedZoneId]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Zone & Station Management" />
            <main className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-normal">Zone & Station Management</h1>
                        <p className="text-sm text-muted-foreground">Routing zona ke kitchen/bar station dan penugasan waiter.</p>
                    </div>
                    <Badge variant={allZonesAssigned ? 'secondary' : 'destructive'}>
                        {allZonesAssigned ? 'Semua zona siap order' : 'Ada zona belum dikonfigurasi'}
                    </Badge>
                </div>

                <div className="flex w-full gap-2 overflow-x-auto border-b">
                    {[
                        ['zones', 'Zona'],
                        ['kitchen', 'Kitchen Stations'],
                        ['bar', 'Bar Stations'],
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setTab(value as 'zones' | 'kitchen' | 'bar')}
                            className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'zones' && <ZonesTab zones={zones} selectedZone={selectedZone} setSelectedZoneId={setSelectedZoneId} kitchenStations={kitchenStations} barStations={barStations} waiters={waiters} />}
                {tab === 'kitchen' && <StationsTab type="kitchen" stations={kitchenStations} />}
                {tab === 'bar' && <StationsTab type="bar" stations={barStations} />}
            </main>
        </AppLayout>
    );
}

function ZonesTab({ zones, selectedZone, setSelectedZoneId, kitchenStations, barStations, waiters }: { zones: Zone[]; selectedZone?: Zone; setSelectedZoneId: (id: number) => void; kitchenStations: Station[]; barStations: Station[]; waiters: Waiter[] }) {
    return (
        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
            <Card className="rounded-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">Zona</CardTitle>
                    <ZoneForm />
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                        <thead className="border-b text-left text-muted-foreground">
                            <tr>
                                <th className="py-2 font-medium">Nama</th>
                                <th className="py-2 font-medium">Warna</th>
                                <th className="py-2 font-medium">Kitchen</th>
                                <th className="py-2 font-medium">Bar</th>
                                <th className="py-2 font-medium">Meja</th>
                                <th className="py-2 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {zones.map((zone) => (
                                <tr key={zone.id} onClick={() => setSelectedZoneId(zone.id)} className="cursor-pointer border-b hover:bg-muted/50">
                                    <td className="py-3 font-medium">{zone.name}</td>
                                    <td className="py-3"><span className="inline-flex size-5 rounded-sm border" style={{ backgroundColor: zone.color_hex }} /></td>
                                    <td className="py-3">{zone.assignment?.kitchen_station?.name ?? <Badge variant="destructive">Belum Dikonfigurasi</Badge>}</td>
                                    <td className="py-3">{zone.assignment?.bar_station?.name ?? <Badge variant="destructive">Belum Dikonfigurasi</Badge>}</td>
                                    <td className="py-3">{zone.tables_count}</td>
                                    <td className="py-3"><Badge variant={zone.is_active ? 'secondary' : 'outline'}>{zone.is_active ? 'Aktif' : 'Nonaktif'}</Badge></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {selectedZone && (
                <div className="space-y-4">
                    <ZoneForm zone={selectedZone} />
                    <AssignmentForm zone={selectedZone} kitchenStations={kitchenStations} barStations={barStations} />
                    <WaiterAssignment zone={selectedZone} waiters={waiters} />
                </div>
            )}
        </div>
    );
}

function ZoneForm({ zone }: { zone?: Zone }) {
    const form = useForm({
        name: zone?.name ?? '',
        description: zone?.description ?? '',
        color_hex: zone?.color_hex ?? '#2563EB',
        sort_order: zone?.sort_order ?? 0,
        is_active: zone?.is_active ?? true,
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        zone ? form.put(`/zones/${zone.id}`, { preserveScroll: true }) : form.post('/zones', { preserveScroll: true });
    }

    return (
        <form onSubmit={submit} className={zone ? 'rounded-md border p-4' : ''}>
            {zone && <h2 className="mb-3 text-base font-semibold">Edit Zona</h2>}
            <div className="grid gap-3">
                <Label>Nama</Label>
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                <InputError message={form.errors.name} />
                <Label>Deskripsi</Label>
                <Input value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                <Label>Warna</Label>
                <Input type="color" value={form.data.color_hex} onChange={(e) => form.setData('color_hex', e.target.value)} />
                <Label>Urutan</Label>
                <Input type="number" value={form.data.sort_order} onChange={(e) => form.setData('sort_order', Number(e.target.value))} />
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', Boolean(checked))} /> Aktif</label>
                <div className="flex gap-2">
                    <Button type="submit" disabled={form.processing}><Save />{zone ? 'Simpan' : 'Tambah Zona'}</Button>
                    {zone && <Button type="button" variant="destructive" onClick={() => router.delete(`/zones/${zone.id}`, { preserveScroll: true })}><Trash2 />Hapus</Button>}
                </div>
            </div>
        </form>
    );
}

function AssignmentForm({ zone, kitchenStations, barStations }: { zone: Zone; kitchenStations: Station[]; barStations: Station[] }) {
    const form = useForm({
        kitchen_station_id: String(zone.assignment?.kitchen_station_id ?? ''),
        bar_station_id: String(zone.assignment?.bar_station_id ?? ''),
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({ kitchen_station_id: Number(data.kitchen_station_id), bar_station_id: Number(data.bar_station_id) })).put(`/zones/${zone.id}/assignment`, { preserveScroll: true });
    }

    return (
        <form onSubmit={submit} className="rounded-md border p-4">
            <h2 className="mb-3 text-base font-semibold">Assignment Station</h2>
            <div className="grid gap-3">
                <Select value={form.data.kitchen_station_id} onValueChange={(value) => form.setData('kitchen_station_id', value)}>
                    <SelectTrigger><SelectValue placeholder="Pilih kitchen station" /></SelectTrigger>
                    <SelectContent>{kitchenStations.filter((station) => station.status === 'active').map((station) => <SelectItem key={station.id} value={String(station.id)}>{station.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.data.bar_station_id} onValueChange={(value) => form.setData('bar_station_id', value)}>
                    <SelectTrigger><SelectValue placeholder="Pilih bar station" /></SelectTrigger>
                    <SelectContent>{barStations.filter((station) => station.status === 'active').map((station) => <SelectItem key={station.id} value={String(station.id)}>{station.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="submit" disabled={form.processing}><Save />Simpan Assignment</Button>
            </div>
        </form>
    );
}

function WaiterAssignment({ zone, waiters }: { zone: Zone; waiters: Waiter[] }) {
    const form = useForm({ user_id: '' });
    const assignedIds = new Set(zone.waiters.map((waiter) => waiter.id));

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({ user_id: Number(data.user_id) })).post(`/zones/${zone.id}/waiters`, { preserveScroll: true, onSuccess: () => form.reset() });
    }

    return (
        <form onSubmit={submit} className="rounded-md border p-4">
            <h2 className="mb-3 text-base font-semibold">Waiter Zona</h2>
            <div className="mb-3 flex flex-wrap gap-2">
                {zone.waiters.length ? zone.waiters.map((waiter) => (
                    <button key={waiter.id} type="button" onClick={() => router.delete(`/zones/${zone.id}/waiters/${waiter.id}`, { preserveScroll: true })} className="rounded-full border px-3 py-1 text-xs hover:bg-muted">
                        {waiter.name} x
                    </button>
                )) : <span className="text-sm text-muted-foreground">Belum ada waiter.</span>}
            </div>
            <div className="flex gap-2">
                <Select value={form.data.user_id} onValueChange={(value) => form.setData('user_id', value)}>
                    <SelectTrigger><SelectValue placeholder="Pilih waiter" /></SelectTrigger>
                    <SelectContent>{waiters.filter((waiter) => !assignedIds.has(waiter.id)).map((waiter) => <SelectItem key={waiter.id} value={String(waiter.id)}>{waiter.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="submit" disabled={form.processing || !form.data.user_id}><CirclePlus />Assign</Button>
            </div>
        </form>
    );
}

function StationsTab({ type, stations }: { type: 'kitchen' | 'bar'; stations: Station[] }) {
    return (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <StationForm type={type} />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {stations.map((station) => <StationForm key={station.id} type={type} station={station} />)}
            </div>
        </div>
    );
}

function StationsStatusSelect({ value, onChange }: { value: Station['status']; onChange: (value: Station['status']) => void }) {
    return (
        <Select value={value} onValueChange={(selected) => onChange(selected as Station['status'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
        </Select>
    );
}

function StationForm({ type, station }: { type: 'kitchen' | 'bar'; station?: Station }) {
    const form = useForm({ name: station?.name ?? '', description: station?.description ?? '', status: station?.status ?? 'active' });
    const baseUrl = type === 'kitchen' ? '/stations/kitchen' : '/stations/bar';

    function submit(event: FormEvent) {
        event.preventDefault();
        station ? form.put(`${baseUrl}/${station.id}`, { preserveScroll: true }) : form.post(baseUrl, { preserveScroll: true, onSuccess: () => form.reset() });
    }

    return (
        <form onSubmit={submit} className="rounded-md border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold">{station ? station.name : `Tambah ${type === 'kitchen' ? 'Kitchen' : 'Bar'} Station`}</h2>
                {station && <Badge variant={station.status === 'active' ? 'secondary' : station.status === 'overloaded' ? 'destructive' : 'outline'}>{station.status}</Badge>}
            </div>
            {station && <p className="mb-3 text-sm text-muted-foreground">{station.active_orders_count} order aktif</p>}
            <div className="grid gap-3">
                <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} placeholder="Nama station" />
                <Input value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} placeholder="Deskripsi atau lokasi" />
                <StationsStatusSelect value={form.data.status as Station['status']} onChange={(status) => form.setData('status', status)} />
                <div className="flex gap-2">
                    <Button type="submit" disabled={form.processing}><Save />{station ? 'Simpan' : 'Tambah'}</Button>
                    {station && <Button type="button" variant="destructive" onClick={() => router.delete(`${baseUrl}/${station.id}`, { preserveScroll: true })}><Trash2 />Hapus</Button>}
                </div>
            </div>
        </form>
    );
}
