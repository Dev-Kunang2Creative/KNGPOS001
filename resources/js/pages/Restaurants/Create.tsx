import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Upload } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Restoran', href: '/restaurant/edit' },
    { title: 'Buat Baru', href: '/restaurants/create' },
];

export default function Create() {
    const form = useForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        tax_percentage: 11,
        tax_is_active: false,
        service_charge_percentage: 0,
        service_charge_is_active: false,
        currency: 'IDR',
        receipt_header: '',
        receipt_footer: '',
        logo: null as File | null,
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
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
        form.post('/restaurants', { forceFormData: true });
    }

    const allErrors = Object.entries(form.errors);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Buat Restoran Baru" />

            <main className="flex flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-normal">Buat Restoran Baru</h1>
                    <p className="text-muted-foreground text-sm">Restoran baru langsung aktif dan Anda otomatis menjadi managernya.</p>
                </div>

                {allErrors.length > 0 && (
                    <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border p-3 text-sm">
                        <p className="mb-1 font-medium">Terjadi kesalahan:</p>
                        <ul className="list-inside list-disc space-y-0.5 text-xs">
                            {allErrors.map(([key, msg]) => (
                                <li key={key}>
                                    {key}: {msg}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

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
                                    <Label>Nama Restoran *</Label>
                                    <Input
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        placeholder="Nama restoran"
                                        required
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

                    <div className="flex justify-end border-t pt-4">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Membuat...' : 'Buat Restoran'}
                        </Button>
                    </div>
                </form>
            </main>
        </AppLayout>
    );
}
