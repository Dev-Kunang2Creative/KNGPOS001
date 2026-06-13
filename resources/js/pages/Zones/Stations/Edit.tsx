import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Save, Trash2 } from 'lucide-react';
import { FormEvent } from 'react';

const statuses = ['active', 'overloaded', 'inactive'] as const;

type Station = { id: number; name: string; description?: string | null; status: string; active_orders_count?: number };
type Props = {
    type: 'kitchen' | 'bar';
    station: Station;
};

export default function StationsEdit({ type, station }: Props) {
    const isKitchen = type === 'kitchen';
    const baseUrl = isKitchen ? '/stations/kitchen' : '/stations/bar';
    const titleText = `Edit ${isKitchen ? 'Kitchen' : 'Bar'} Station`;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Zona & Meja', href: '/zones' },
        { title: `Edit ${station.name}`, href: `${baseUrl}/${station.id}/edit` },
    ];

    const form = useForm({
        name: station.name,
        description: station.description ?? '',
        status: station.status,
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.put(`${baseUrl}/${station.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${titleText}: ${station.name}`} />
            <main className="flex w-full flex-1 flex-col gap-4 p-4 lg:p-8">
                <div className="mb-4 flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-normal">
                        {titleText}: {station.name}
                    </h1>
                    <p className="text-muted-foreground text-sm">Ubah rincian informasi dan kelola status stasiun.</p>
                </div>

                <form onSubmit={submit} className="bg-card space-y-4 rounded-md border p-6 shadow-sm">
                    <div className="grid gap-3">
                        <Label>Nama Station</Label>
                        <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="Contoh: Dapur Utama" />
                        <InputError message={form.errors.name} />

                        <Label>Deskripsi / Lokasi</Label>
                        <Input value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} placeholder="Opsional" />

                        <Label>Status Operasional</Label>
                        <Select value={form.data.status} onValueChange={(value) => form.setData('status', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih status" />
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

                    <div className="flex justify-between gap-2 pt-6">
                        <Button type="button" variant="destructive" onClick={() => router.delete(`${baseUrl}/${station.id}`)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
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
            </main>
        </AppLayout>
    );
}
