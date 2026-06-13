import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
        form.post('/restaurants', {
            forceFormData: true,
            onError: (errors) => {
                console.error('Form errors:', errors);
            },
        });
    }

    const allErrors = Object.entries(form.errors);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Buat Restoran Baru" />

            <main className="grid flex-1 gap-4 p-4 xl:grid-cols-[420px_1fr]">
                <form onSubmit={submit} className="h-fit rounded-md border p-4">
                    <h1 className="mb-3 text-xl font-semibold">Buat Restoran Baru</h1>

                    {allErrors.length > 0 && (
                        <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                            <p className="mb-1 font-medium">Terjadi kesalahan:</p>
                            <ul className="list-inside list-disc space-y-0.5 text-xs">
                                {allErrors.map(([key, msg]) => (
                                    <li key={key}>{key}: {msg}</li>
                                ))}
                            </ul>
                        </div>
                    )}

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

                        <div>
                            <Input
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="Nama restoran *"
                                required
                            />
                            {form.errors.name && <p className="mt-1 text-xs text-destructive">{form.errors.name}</p>}
                        </div>

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
                            {form.processing ? 'Membuat...' : 'Buat Restoran'}
                        </Button>
                    </div>
                </form>

                <section className="space-y-4">
                    <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                        <p className="mb-2 font-medium text-foreground">Informasi</p>
                        <ul className="list-inside list-disc space-y-1">
                            <li>Restoran baru akan langsung aktif setelah dibuat</li>
                            <li>Anda otomatis menjadi manager restoran ini</li>
                            <li>Anda bisa menambahkan staff setelah restoran dibuat</li>
                            <li>Pengaturan tax dan service charge bisa diubah nanti</li>
                        </ul>
                    </div>
                </section>
            </main>
        </AppLayout>
    );
}
