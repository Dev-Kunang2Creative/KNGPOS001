import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CirclePlus, Save, Trash2 } from 'lucide-react';
import { FormEvent } from 'react';

type Station = { id: number; name: string; status: string };
type Waiter = { id: number; name: string };
type Zone = {
    id: number;
    name: string;
    description?: string | null;
    color_hex: string;
    sort_order: number;
    is_active: boolean;
    assignment?: { kitchen_station_id: number; bar_station_id: number } | null;
    waiters: Waiter[];
};

type Props = {
    zone: Zone;
    kitchenStations: Station[];
    barStations: Station[];
    waiters: Waiter[];
};

export default function ZonesEdit({ zone, kitchenStations, barStations, waiters }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Zona & Meja', href: '/zones' },
        { title: `Edit ${zone.name}`, href: `/zones/${zone.id}/edit` },
    ];

    const form = useForm({
        name: zone.name,
        description: zone.description ?? '',
        color_hex: zone.color_hex,
        sort_order: zone.sort_order,
        is_active: zone.is_active,
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.put(`/zones/${zone.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Zona: ${zone.name}`} />
            <main className="flex w-full flex-1 flex-col gap-6 p-4 lg:p-8">
                <div className="mb-2 flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-normal">Edit Zona: {zone.name}</h1>
                    <p className="text-muted-foreground text-sm">Ubah detail zona, atur stasiun, dan tugaskan waiter.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Detail Zona */}
                    <form onSubmit={submit} className="bg-card h-fit space-y-4 rounded-md border p-6 shadow-sm">
                        <h2 className="border-b pb-2 text-lg font-medium">Informasi Dasar</h2>
                        <div className="grid gap-3">
                            <Label>Nama</Label>
                            <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                            <InputError message={form.errors.name} />

                            <Label>Deskripsi</Label>
                            <Input value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />

                            <Label>Warna</Label>
                            <Input
                                type="color"
                                value={form.data.color_hex}
                                onChange={(e) => form.setData('color_hex', e.target.value)}
                                className="h-10 w-24 cursor-pointer p-1"
                            />

                            <Label>Urutan</Label>
                            <Input type="number" value={form.data.sort_order} onChange={(e) => form.setData('sort_order', Number(e.target.value))} />

                            <label className="mt-2 flex items-center gap-2 text-sm">
                                <Checkbox checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', Boolean(checked))} />
                                Aktif
                            </label>
                        </div>

                        <div className="flex justify-between gap-2 pt-4">
                            <Button type="button" variant="destructive" onClick={() => router.delete(`/zones/${zone.id}`)}>
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

                    {/* Penugasan */}
                    <div className="space-y-6">
                        <AssignmentForm zone={zone} kitchenStations={kitchenStations} barStations={barStations} />
                        <WaiterAssignment zone={zone} waiters={waiters} />
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}

function AssignmentForm({ zone, kitchenStations, barStations }: { zone: Zone; kitchenStations: Station[]; barStations: Station[] }) {
    const form = useForm({
        kitchen_station_id: String(zone.assignment?.kitchen_station_id ?? ''),
        bar_station_id: String(zone.assignment?.bar_station_id ?? ''),
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({
            kitchen_station_id: Number(data.kitchen_station_id),
            bar_station_id: Number(data.bar_station_id),
        }));
        form.put(`/zones/${zone.id}/assignment`, { preserveScroll: true });
    }

    return (
        <form onSubmit={submit} className="bg-card space-y-4 rounded-md border p-6 shadow-sm">
            <h2 className="border-b pb-2 text-lg font-medium">Routing Station</h2>
            <div className="grid gap-3">
                <Label>Kitchen Station</Label>
                <Select value={form.data.kitchen_station_id} onValueChange={(value) => form.setData('kitchen_station_id', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih kitchen station" />
                    </SelectTrigger>
                    <SelectContent>
                        {kitchenStations.map((station) => (
                            <SelectItem key={station.id} value={String(station.id)}>
                                {station.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Label>Bar Station</Label>
                <Select value={form.data.bar_station_id} onValueChange={(value) => form.setData('bar_station_id', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih bar station" />
                    </SelectTrigger>
                    <SelectContent>
                        {barStations.map((station) => (
                            <SelectItem key={station.id} value={String(station.id)}>
                                {station.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button type="submit" disabled={form.processing} className="mt-2">
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Routing
                </Button>
            </div>
        </form>
    );
}

function WaiterAssignment({ zone, waiters }: { zone: Zone; waiters: Waiter[] }) {
    const form = useForm({ user_id: '' });
    const assignedIds = new Set(zone.waiters.map((waiter) => waiter.id));

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({ user_id: Number(data.user_id) }));
        form.post(`/zones/${zone.id}/waiters`, {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    }

    return (
        <form onSubmit={submit} className="bg-card space-y-4 rounded-md border p-6 shadow-sm">
            <h2 className="border-b pb-2 text-lg font-medium">Penugasan Waiter</h2>

            <div className="flex flex-wrap gap-2">
                {zone.waiters.length ? (
                    zone.waiters.map((waiter) => (
                        <button
                            key={waiter.id}
                            type="button"
                            onClick={() => router.delete(`/zones/${zone.id}/waiters/${waiter.id}`, { preserveScroll: true })}
                            className="hover:bg-destructive hover:text-destructive-foreground group flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors"
                        >
                            {waiter.name}
                            <span className="text-xs opacity-50 group-hover:opacity-100">✕</span>
                        </button>
                    ))
                ) : (
                    <span className="text-muted-foreground text-sm italic">Belum ada waiter yang ditugaskan ke zona ini.</span>
                )}
            </div>

            <div className="flex gap-2 pt-2">
                <Select value={form.data.user_id} onValueChange={(value) => form.setData('user_id', value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih waiter" />
                    </SelectTrigger>
                    <SelectContent>
                        {waiters
                            .filter((waiter) => !assignedIds.has(waiter.id))
                            .map((waiter) => (
                                <SelectItem key={waiter.id} value={String(waiter.id)}>
                                    {waiter.name}
                                </SelectItem>
                            ))}
                    </SelectContent>
                </Select>
                <Button type="submit" disabled={form.processing || !form.data.user_id}>
                    <CirclePlus className="mr-2 h-4 w-4" />
                    Tugaskan
                </Button>
            </div>
        </form>
    );
}
