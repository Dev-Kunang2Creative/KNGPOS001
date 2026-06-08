import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Building2, Upload } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Restoran', href: '/restaurants/select' },
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
        form.post('/restaurants');
    }

    return (
        <>
            <Head title="Buat Restoran Baru" />

            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="mb-6 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
                            <Building2 className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-white">Buat Restoran Baru</h1>
                        <p className="mt-1 text-sm text-gray-400">
                            Isi detail restoran Anda
                        </p>
                    </div>

                    <form onSubmit={submit} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                        <div className="grid gap-3">
                            {/* Logo */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/20 bg-white/5"
                                >
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                                    ) : (
                                        <Upload className="h-4 w-4 text-gray-500" />
                                    )}
                                </button>
                                <div className="text-sm">
                                    <p className="font-medium text-gray-300">Logo</p>
                                    <p className="text-xs text-gray-500">PNG, JPG</p>
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
                                placeholder="Nama restoran *"
                                required
                                className="border-white/10 bg-white/5 text-white placeholder:text-gray-600"
                            />
                            {form.errors.name && <p className="text-xs text-red-400">{form.errors.name}</p>}

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    value={form.data.phone}
                                    onChange={(e) => form.setData('phone', e.target.value)}
                                    placeholder="Telepon"
                                    className="border-white/10 bg-white/5 text-white placeholder:text-gray-600"
                                />
                                <Input
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                    placeholder="Email"
                                    className="border-white/10 bg-white/5 text-white placeholder:text-gray-600"
                                />
                            </div>

                            <Input
                                value={form.data.address}
                                onChange={(e) => form.setData('address', e.target.value)}
                                placeholder="Alamat"
                                className="border-white/10 bg-white/5 text-white placeholder:text-gray-600"
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    value={form.data.receipt_header}
                                    onChange={(e) => form.setData('receipt_header', e.target.value)}
                                    placeholder="Header struk"
                                    className="border-white/10 bg-white/5 text-white placeholder:text-gray-600"
                                />
                                <Input
                                    value={form.data.receipt_footer}
                                    onChange={(e) => form.setData('receipt_footer', e.target.value)}
                                    placeholder="Footer struk"
                                    className="border-white/10 bg-white/5 text-white placeholder:text-gray-600"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={form.data.tax_percentage}
                                        onChange={(e) => form.setData('tax_percentage', Number(e.target.value))}
                                        placeholder="Tax %"
                                        className="border-white/10 bg-white/5 text-white placeholder:text-gray-600"
                                    />
                                    <label className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
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
                                        placeholder="Service %"
                                        className="border-white/10 bg-white/5 text-white placeholder:text-gray-600"
                                    />
                                    <label className="mt-1.5 flex items-center gap-2 text-xs text-gray-400">
                                        <Checkbox
                                            checked={form.data.service_charge_is_active}
                                            onCheckedChange={(v) => form.setData('service_charge_is_active', Boolean(v))}
                                        />
                                        Service aktif
                                    </label>
                                </div>
                            </div>

                            <div className="mt-2 flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-white/10 text-gray-400 hover:text-white"
                                    onClick={() => router.visit('/restaurants/select')}
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
