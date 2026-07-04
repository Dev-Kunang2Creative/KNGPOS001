import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Building2, ImageUp, Percent, Plus, Receipt, Store } from 'lucide-react';
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

            <form onSubmit={submit} className="flex flex-1 flex-col">
                <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 pb-24 md:p-6">
                    <div>
                        <h1 className="text-2xl font-bold">Pengaturan Restoran</h1>
                        <p className="text-muted-foreground mt-1 text-sm">Ubah identitas restoran, pajak, dan tampilan struk.</p>
                    </div>

                    {/* Identitas restoran */}
                    <SectionCard icon={Store} title="Identitas Restoran" description="Nama, kontak, dan logo yang tampil di aplikasi & struk.">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="group bg-muted relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed transition-colors hover:border-solid hover:border-primary"
                                >
                                    {logoPreview ? (
                                        <>
                                            <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                                            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                                                Ganti
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-muted-foreground flex flex-col items-center gap-1">
                                            <ImageUp className="size-6" />
                                            <span className="text-[11px]">Unggah</span>
                                        </span>
                                    )}
                                </button>
                                <span className="text-muted-foreground text-xs">Logo · max 2MB</span>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                            </div>

                            <div className="grid flex-1 gap-4 sm:grid-cols-2">
                                <Field label="Nama Restoran" required error={form.errors.name}>
                                    <Input
                                        className="min-h-[44px]"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        placeholder="cth: Warung Nusantara"
                                    />
                                </Field>
                                <Field label="Telepon">
                                    <Input
                                        className="min-h-[44px]"
                                        value={form.data.phone}
                                        onChange={(e) => form.setData('phone', e.target.value)}
                                        placeholder="08xxxxxxxxxx"
                                    />
                                </Field>
                                <Field label="Email">
                                    <Input
                                        className="min-h-[44px]"
                                        type="email"
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                        placeholder="email@resto.com"
                                    />
                                </Field>
                                <Field label="Mata Uang">
                                    <Input
                                        className="min-h-[44px]"
                                        value={form.data.currency}
                                        onChange={(e) => form.setData('currency', e.target.value)}
                                        placeholder="IDR"
                                    />
                                </Field>
                                <Field label="Alamat" className="sm:col-span-2">
                                    <Input
                                        className="min-h-[44px]"
                                        value={form.data.address}
                                        onChange={(e) => form.setData('address', e.target.value)}
                                        placeholder="Alamat lengkap restoran"
                                    />
                                </Field>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Pajak & Service Charge */}
                    <SectionCard
                        icon={Percent}
                        title="Pajak & Service Charge"
                        description="Aktifkan untuk menambahkan biaya otomatis pada setiap transaksi."
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <ChargeCard
                                label="Pajak (Tax)"
                                percentage={form.data.tax_percentage}
                                active={form.data.tax_is_active}
                                onPercentageChange={(v) => form.setData('tax_percentage', v)}
                                onActiveChange={(v) => form.setData('tax_is_active', v)}
                            />
                            <ChargeCard
                                label="Service Charge"
                                percentage={form.data.service_charge_percentage}
                                active={form.data.service_charge_is_active}
                                onPercentageChange={(v) => form.setData('service_charge_percentage', v)}
                                onActiveChange={(v) => form.setData('service_charge_is_active', v)}
                            />
                        </div>
                    </SectionCard>

                    {/* Struk */}
                    <SectionCard
                        icon={Receipt}
                        title="Tampilan Struk"
                        description="Logo & nama restoran tampil otomatis di atas struk. Header & footer bisa beberapa baris (alamat, telepon, password WiFi, dll)."
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Header Struk">
                                <Textarea
                                    value={form.data.receipt_header}
                                    onChange={(e) => form.setData('receipt_header', e.target.value)}
                                    placeholder={'Jl. Merdeka No. 1\nTelp 0274-123456'}
                                    rows={4}
                                />
                            </Field>
                            <Field label="Footer Struk">
                                <Textarea
                                    value={form.data.receipt_footer}
                                    onChange={(e) => form.setData('receipt_footer', e.target.value)}
                                    placeholder={'Terima kasih atas kunjungan Anda\nWiFi: namajaringan / pass123'}
                                    rows={4}
                                />
                            </Field>
                        </div>
                    </SectionCard>

                    {/* Info + quick actions */}
                    <SectionCard icon={Building2} title="Info & Aksi Cepat">
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="grid gap-2 text-sm">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-muted-foreground">Slug</span>
                                    <span className="font-mono">{restaurantData.slug}</span>
                                </div>
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-muted-foreground">ID Restoran</span>
                                    <span>#{restaurantData.id}</span>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-[44px] justify-start"
                                    onClick={() => router.visit('/restaurants/select')}
                                >
                                    <Building2 className="mr-2 h-4 w-4" /> Kelola Semua Restoran
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-[44px] justify-start"
                                    onClick={() => router.visit('/restaurants/create')}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Tambah Restoran Baru
                                </Button>
                            </div>
                        </div>
                    </SectionCard>
                </main>

                {/* Sticky save bar */}
                <div className="bg-background/80 sticky bottom-0 border-t backdrop-blur">
                    <div className="mx-auto flex w-full max-w-4xl items-center justify-end gap-3 p-4">
                        <p className="text-muted-foreground mr-auto hidden text-xs sm:block">Perubahan diterapkan setelah disimpan.</p>
                        <Button type="submit" disabled={form.processing} className="min-h-[44px] min-w-[160px]">
                            {form.processing ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </Button>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}

function SectionCard({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: typeof Store;
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-card rounded-xl border">
            <div className="flex items-start gap-3 border-b px-4 py-4 sm:px-5">
                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4.5" />
                </div>
                <div>
                    <h2 className="font-semibold">{title}</h2>
                    {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
                </div>
            </div>
            <div className="p-4 sm:p-5">{children}</div>
        </section>
    );
}

function Field({
    label,
    required,
    error,
    className,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={`grid gap-1.5 ${className ?? ''}`}>
            <Label>
                {label} {required && <span className="text-destructive">*</span>}
            </Label>
            {children}
            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}

function ChargeCard({
    label,
    percentage,
    active,
    onPercentageChange,
    onActiveChange,
}: {
    label: string;
    percentage: number;
    active: boolean;
    onPercentageChange: (v: number) => void;
    onActiveChange: (v: boolean) => void;
}) {
    return (
        <div className={`rounded-lg border p-4 transition-colors ${active ? 'border-primary/40 bg-primary/5' : 'bg-muted/30'}`}>
            <label className="flex cursor-pointer items-center justify-between gap-2">
                <span className="font-medium">{label}</span>
                <span className="flex items-center gap-2 text-sm">
                    <Checkbox checked={active} onCheckedChange={(v) => onActiveChange(Boolean(v))} />
                    <span className={active ? 'text-primary font-medium' : 'text-muted-foreground'}>{active ? 'Aktif' : 'Nonaktif'}</span>
                </span>
            </label>
            <div className="relative mt-3">
                <Input
                    type="number"
                    step="0.01"
                    min={0}
                    className="min-h-[44px] pr-8"
                    value={percentage}
                    onChange={(e) => onPercentageChange(Number(e.target.value))}
                    disabled={!active}
                />
                <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">%</span>
            </div>
        </div>
    );
}
