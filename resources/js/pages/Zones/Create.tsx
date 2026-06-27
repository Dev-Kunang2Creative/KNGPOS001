import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Zona & Meja', href: '/zones' },
    { title: 'Tambah Zona', href: '/zones/create' },
];

export default function ZonesCreate() {
    const form = useForm({
        name: '',
        description: '',
        color_hex: '#2563EB',
        sort_order: 0,
        is_active: true as boolean,
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post('/zones');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tambah Zona" />
            <main className="flex w-full flex-1 flex-col gap-4 p-4 lg:p-8">
                <div className="mb-4 flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-normal">Tambah Zona</h1>
                    <p className="text-muted-foreground text-sm">Tambahkan area atau zona baru di restoran.</p>
                </div>

                <form onSubmit={submit} className="bg-card space-y-4 rounded-md border p-6 shadow-sm">
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

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => router.visit('/zones')}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            <Save className="mr-2 h-4 w-4" />
                            Simpan Zona
                        </Button>
                    </div>
                </form>
            </main>
        </AppLayout>
    );
}
