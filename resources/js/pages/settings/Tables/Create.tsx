import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { FormEvent } from 'react';

type Zone = { id: number; name: string; assignment?: unknown | null };
type Props = { zones: Zone[] };

const statuses = ['available', 'occupied', 'open_bill', 'reserved', 'blocked'];
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Zona & Meja', href: '/zones' },
    { title: 'Tambah Meja', href: '/settings/tables/create' },
];

export default function TablesCreate({ zones }: Props) {
    const form = useForm({
        name: '',
        capacity: 4,
        zone_id: '',
        position_x: 0,
        position_y: 0,
        status: 'available',
        self_order_enabled: true as boolean,
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({ ...data, zone_id: Number(data.zone_id) }));
        form.post('/settings/tables');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tambah Meja" />
            <main className="flex w-full flex-1 flex-col gap-4 p-4 lg:p-8">
                <div className="mb-4 flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-normal">Tambah Meja</h1>
                    <p className="text-muted-foreground text-sm">Tambahkan meja baru ke dalam denah restoran.</p>
                </div>

                <form onSubmit={submit} className="bg-card space-y-4 rounded-md border p-6 shadow-sm">
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
                                placeholder="Kapasitas"
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
                                    placeholder="Posisi X"
                                />
                                <Input
                                    type="number"
                                    value={form.data.position_y}
                                    onChange={(event) => form.setData('position_y', Number(event.target.value))}
                                    placeholder="Posisi Y"
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

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => router.visit('/zones')}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            <Save className="mr-2 h-4 w-4" />
                            Simpan Meja
                        </Button>
                    </div>
                </form>
            </main>
        </AppLayout>
    );
}
