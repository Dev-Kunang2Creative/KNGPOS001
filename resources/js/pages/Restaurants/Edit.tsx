import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';

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

export default function Edit({ restaurantData }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: restaurantData.name ?? '',
        phone: restaurantData.phone ?? '',
        email: restaurantData.email ?? '',
        address: restaurantData.address ?? '',
        tax_percentage: restaurantData.tax_percentage ?? '0',
        tax_is_active: restaurantData.tax_is_active ?? false,
        service_charge_percentage: restaurantData.service_charge_percentage ?? '0',
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
            setData('logo', file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        router.post(route('restaurants.update'), {
            ...data,
            _method: 'PUT',
        });
    };

    return (
        <AppLayout>
            <Head title="Edit Restoran" />
            <div className="mx-auto max-w-3xl p-4 sm:p-6">
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-white">Pengaturan Restoran</h1>
                    <p className="mt-1 text-sm text-gray-400">
                        Kelola informasi dan konfigurasi restoran
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Logo */}
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-white/5 transition hover:border-indigo-500/50 hover:bg-white/10"
                        >
                            {logoPreview ? (
                                <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                            ) : (
                                <Upload className="h-6 w-6 text-gray-500" />
                            )}
                        </button>
                        <div>
                            <p className="text-sm font-medium text-white">Logo Restoran</p>
                            <p className="text-xs text-gray-500">PNG, JPG, max 2MB</p>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoChange}
                        />
                    </div>

                    {/* Basic Info */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                        <h2 className="mb-4 text-sm font-semibold text-gray-300">Informasi Dasar</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-400">Nama Restoran *</label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    required
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-400">Telepon</label>
                                    <input
                                        type="text"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-400">Email</label>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-400">Alamat</label>
                                <textarea
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tax & Service */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                        <h2 className="mb-4 text-sm font-semibold text-gray-300">Pajak & Service Charge</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <label className="mb-1 block text-xs font-medium text-gray-400">Pajak (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.tax_percentage}
                                        onChange={(e) => setData('tax_percentage', e.target.value)}
                                        className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={data.tax_is_active}
                                        onChange={(e) => setData('tax_is_active', e.target.checked)}
                                        className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                                    />
                                    <span className="text-xs text-gray-400">Aktif</span>
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <label className="mb-1 block text-xs font-medium text-gray-400">Service Charge (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={data.service_charge_percentage}
                                        onChange={(e) => setData('service_charge_percentage', e.target.value)}
                                        className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={data.service_charge_is_active}
                                        onChange={(e) => setData('service_charge_is_active', e.target.checked)}
                                        className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                                    />
                                    <span className="text-xs text-gray-400">Aktif</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Receipt */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                        <h2 className="mb-4 text-sm font-semibold text-gray-300">Struk</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-400">Header Struk</label>
                                <textarea
                                    value={data.receipt_header}
                                    onChange={(e) => setData('receipt_header', e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-400">Footer Struk</label>
                                <textarea
                                    value={data.receipt_footer}
                                    onChange={(e) => setData('receipt_footer', e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={processing}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40 disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </form>
            </div>
        </AppLayout>
    );
}
