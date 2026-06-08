import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Building2, Plus, Upload } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

interface Restaurant {
    id: number;
    name: string;
    slug: string;
    logo_path: string | null;
    logo_url: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    tax_percentage: string;
    tax_is_active: boolean;
    service_charge_percentage: string;
    service_charge_is_active: boolean;
    currency: string;
    receipt_header: string | null;
    receipt_footer: string | null;
}

interface Props {
    restaurantData: Restaurant;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Restoran', href: '/restaurant/edit' }];

export default function Edit({ restaurantData }: Props) {
    const form = useForm({
        name: restaurantData.name ?? '',
        phone: restaurantData.phone ?? '',
        email: restaurantData.email ?? '',
        address: restaurantData.address ?? '',
        tax_percentage: Number(restaurantData.tax_percentage ?? 0),
        tax_is_active: restaurantData.tax_is_active ?? false,
        service_charge_percentage: Number(restaurantData.service_charge_percentage ?? 0),
        service_charge_is_active: restaurantData.service_charge_is_active ?? false,
        currency: restaurantData.currency ?? 'IDR',
        receipt_header: restaurantData.receipt_header ?? '',
        receipt_footer: restaurantData.receipt_footer ?? '',
        logo: null as File | null,
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(restaurantData.logo_url);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setData('logo', file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    function submit(event: FormEvent) {
        event.preventDefault();
        router.post('/restaurant', {
            ...form.data,
            _method: 'PUT',
        }, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Restoran" />

            <main className="grid flex-1 gap-4 p-4 xl:grid-cols-[420px_1fr]">
                {/* Form Edit Restoran */}
                <form onSubmit={submit} className="h-fit rounded-md border p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <h1 className="text-xl font-semibold">Pengaturan Restoran</h1>
                    </div>

                    <div className="grid gap-3">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed"
                            >
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                                ) : (
                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                )}
                            </button>
                            <div className="text-sm">
                                <p className="font-medium">Logo Restoran</p>
                                <p className="text-xs text-muted-foreground">PNG, JPG, max 2MB</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoChange}
                            />
                        </div>

                        <Input
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            placeholder="Nama restoran"
                        />
                        {form.errors.name && <p className="text-xs text-destructive">{form.errors.name}</p>}

                        <Input
                            value={form.data.phone}
                            onChange={(e) => form.setData('phone', e.target.value)}
                            placeholder="Telepon"
                        />

                        <Input
                            type="email"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                            placeholder="Email"
                        />

                        <Input
                            value={form.data.address}
                            onChange={(e) => form.setData('address', e.target.value)}
                            placeholder="Alamat"
                        />

                        <Input
                            value={form.data.receipt_header}
                            onChange={(e) => form.setData('receipt_header', e.target.value)}
                            placeholder="Header struk"
                        />

                        <Input
                            value={form.data.receipt_footer}
                            onChange={(e) => form.setData('receipt_footer', e.target.value)}
                            placeholder="Footer struk"
                        />

                        <Input
                            type="number"
                            step="0.01"
                            value={form.data.tax_percentage}
                            onChange={(e) => form.setData('tax_percentage', Number(e.target.value))}
                            placeholder="Tax %"
                        />
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={form.data.tax_is_active}
                                onCheckedChange={(v) => form.setData('tax_is_active', Boolean(v))}
                            />
                            Tax aktif
                        </label>

                        <Input
                            type="number"
                            step="0.01"
                            value={form.data.service_charge_percentage}
                            onChange={(e) => form.setData('service_charge_percentage', Number(e.target.value))}
                            placeholder="Service charge %"
                        />
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={form.data.service_charge_is_active}
                                onCheckedChange={(v) => form.setData('service_charge_is_active', Boolean(v))}
                            />
                            Service charge aktif
                        </label>

                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </Button>
                    </div>
                </form>

                {/* Side panel — quick actions */}
                <section className="space-y-4">
                    <div className="rounded-md border p-4">
                        <h2 className="mb-3 text-base font-semibold">Info Restoran</h2>
                        <div className="grid gap-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Slug</span>
                                <span className="font-mono">{restaurantData.slug}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">ID</span>
                                <span>#{restaurantData.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Currency</span>
                                <span>{restaurantData.currency ?? 'IDR'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-md border p-4">
                        <h2 className="mb-3 text-base font-semibold">Aksi Cepat</h2>
                        <div className="grid gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => router.visit('/restaurants/select')}
                            >
                                <Building2 className="mr-2 h-4 w-4" />
                                Kelola Semua Restoran
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => router.visit('/restaurants/create')}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Tambah Restoran Baru
                            </Button>
                        </div>
                    </div>
                </section>
            </main>
        </AppLayout>
    );
}
