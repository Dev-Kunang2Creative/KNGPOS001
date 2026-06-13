import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
        router.post('/restaurant', { ...form.data, _method: 'PUT' }, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Restoran" />

            <main className="flex flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-normal">Pengaturan Restoran</h1>
                    <p className="text-muted-foreground text-sm">Ubah identitas restoran, pajak, dan tampilan struk.</p>
                </div>

                <form onSubmit={submit} className="space-y-6 rounded-md border p-6">
                    {/* Identitas restoran */}
                    <section className="space-y-4">
                        <h2 className="border-b pb-2 text-base font-medium">Identitas Restoran</h2>
                        <div className="flex flex-col gap-4 md:flex-row md:items-start">
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed"
                                >
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                                    ) : (
                                        <Upload className="text-muted-foreground h-6 w-6" />
                                    )}
                                </button>
                                <span className="text-muted-foreground text-xs">Logo (max 2MB)</span>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                            </div>

                            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label>Nama Restoran</Label>
                                    <Input
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        placeholder="Nama restoran"
                                    />
                                    {form.errors.name && <p className="text-destructive text-xs">{form.errors.name}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label>Telepon</Label>
                                    <Input value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} placeholder="08xxxx" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                        placeholder="email@resto.com"
                                    />
                                </div>
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label>Alamat</Label>
                                    <Input
                                        value={form.data.address}
                                        onChange={(e) => form.setData('address', e.target.value)}
                                        placeholder="Alamat restoran"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Mata Uang</Label>
                                    <Input value={form.data.currency} onChange={(e) => form.setData('currency', e.target.value)} placeholder="IDR" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Pajak & Struk side-by-side */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <section className="space-y-4">
                            <h2 className="border-b pb-2 text-base font-medium">Pajak & Service Charge</h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>Tax (%)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={form.data.tax_percentage}
                                        onChange={(e) => form.setData('tax_percentage', Number(e.target.value))}
                                    />
                                    <label className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={form.data.tax_is_active}
                                            onCheckedChange={(v) => form.setData('tax_is_active', Boolean(v))}
                                        />
                                        Tax aktif
                                    </label>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Service Charge (%)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={form.data.service_charge_percentage}
                                        onChange={(e) => form.setData('service_charge_percentage', Number(e.target.value))}
                                    />
                                    <label className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={form.data.service_charge_is_active}
                                            onCheckedChange={(v) => form.setData('service_charge_is_active', Boolean(v))}
                                        />
                                        Service charge aktif
                                    </label>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="border-b pb-2 text-base font-medium">Struk</h2>
                            <p className="text-muted-foreground text-xs">
                                Logo & nama restoran tampil otomatis di atas struk. Header & footer bisa beberapa baris (alamat, telepon, password
                                WiFi, dll).
                            </p>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>Header Struk</Label>
                                    <Textarea
                                        value={form.data.receipt_header}
                                        onChange={(e) => form.setData('receipt_header', e.target.value)}
                                        placeholder={'Jl. Merdeka No. 1\nTelp 0274-123456'}
                                        rows={4}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Footer Struk</Label>
                                    <Textarea
                                        value={form.data.receipt_footer}
                                        onChange={(e) => form.setData('receipt_footer', e.target.value)}
                                        placeholder={'Terima kasih atas kunjungan Anda\nWiFi: namajaringan / pass123'}
                                        rows={4}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Info + quick actions */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <section className="space-y-3">
                            <h2 className="border-b pb-2 text-base font-medium">Info Restoran</h2>
                            <div className="grid gap-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Slug</span>
                                    <span className="font-mono">{restaurantData.slug}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">ID</span>
                                    <span>#{restaurantData.id}</span>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="border-b pb-2 text-base font-medium">Aksi Cepat</h2>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <Button type="button" variant="outline" className="justify-start" onClick={() => router.visit('/restaurants/select')}>
                                    <Building2 className="mr-2 h-4 w-4" /> Kelola Semua Restoran
                                </Button>
                                <Button type="button" variant="outline" className="justify-start" onClick={() => router.visit('/restaurants/create')}>
                                    <Plus className="mr-2 h-4 w-4" /> Tambah Restoran Baru
                                </Button>
                            </div>
                        </section>
                    </div>

                    <div className="flex justify-end border-t pt-4">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </Button>
                    </div>
                </form>
            </main>
        </AppLayout>
    );
}
