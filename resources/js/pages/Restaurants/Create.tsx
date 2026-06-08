import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Building2, Upload } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

export default function Create() {
    const { errors } = usePage().props;
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
        form.post('/restaurants');
    }

    return (
        <>
            <Head title="Buat Restoran Baru" />

            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="mb-6 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                            <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-xl font-semibold">Buat Restoran Baru</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Isi detail restoran Anda</p>
                    </div>

                    <form onSubmit={submit} className="rounded-md border p-4">
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

                            <div>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={form.data.tax_percentage}
                                    onChange={(e) => form.setData('tax_percentage', Number(e.target.value))}
                                    placeholder="Tax %"
                                />
                                <label className="mt-1.5 flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={form.data.tax_is_active}
                                        onCheckedChange={(v) => form.setData('tax_is_active', Boolean(v))}
                                    />
                                    Tax aktif
                                </label>
                            </div>

                            <div>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={form.data.service_charge_percentage}
                                    onChange={(e) => form.setData('service_charge_percentage', Number(e.target.value))}
                                    placeholder="Service charge %"
                                />
                                <label className="mt-1.5 flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={form.data.service_charge_is_active}
                                        onCheckedChange={(v) => form.setData('service_charge_is_active', Boolean(v))}
                                    />
                                    Service charge aktif
                                </label>
                            </div>

                            <div className="mt-1 flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => window.history.back()}
                                >
                                    <ArrowLeft className="mr-1 h-4 w-4" />
                                    Kembali
                                </Button>
                                <Button type="submit" className="flex-1" disabled={form.processing}>
                                    {form.processing ? 'Membuat...' : 'Buat Restoran'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
