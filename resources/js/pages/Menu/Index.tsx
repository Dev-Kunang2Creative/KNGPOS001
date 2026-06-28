import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ChefHat, Edit2, GlassWater, Package, Percent, Plus, Printer, Save, Search, Tag, Trash2, X } from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';

type Category = { id: number; name: string; description?: string | null; sort_order: number; is_active: boolean; active_items_count: number; parent_id?: number | null; parent?: { id: number; name: string } };
type Addon = { id: number | null; name: string; price: number | string; is_active: boolean };
type Item = {
    id: number;
    category_id: number;
    name: string;
    description?: string | null;
    price: string;
    print_to: string;
    image_url?: string | null;
    is_available: boolean;
    sort_order: number;
    category?: Category;
    addons?: Addon[];
};
type Promotion = {
    id: number;
    name: string;
    type: string;
    value: string;
    applies_to: string;
    is_active: boolean;
    valid_from: string;
    valid_until: string;
};
type Props = { categories: Category[]; items: Item[]; promotions: Promotion[] };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Menu', href: '/menu' }];

const printTargetLabels: Record<string, { label: string; icon: typeof Printer; color: string }> = {
    kasir: { label: 'Kasir', icon: Printer, color: 'bg-slate-100 text-slate-700 border-slate-200' },
    kitchen: { label: 'Kitchen', icon: ChefHat, color: 'bg-orange-100 text-orange-700 border-orange-200' },
    bar: { label: 'Bar', icon: GlassWater, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    kitchen_bar: { label: 'Kitchen & Bar', icon: ChefHat, color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const money = (v: number | string) => Number(v || 0).toLocaleString('id-ID');

export default function MenuIndex({ categories, items, promotions }: Props) {
    const [tab, setTab] = useState<'items' | 'categories' | 'promotions'>('items');
    const { auth } = usePage<SharedData>().props;
    const canManageMenu = auth.permissions?.includes('menu.manage') ?? false;

    const tabs = [
        { key: 'items' as const, label: 'Menu Item', icon: Package, count: items.length },
        { key: 'categories' as const, label: 'Kategori', icon: Tag, count: categories.length },
        { key: 'promotions' as const, label: 'Promo', icon: Percent, count: promotions.length },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Menu Management" />
            <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold">Menu Management</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Kelola kategori, item menu, dan promo.</p>
                </div>

                {/* Tabs */}
                <div className="bg-muted flex gap-1 rounded-xl p-1">
                    {tabs.map(({ key, label, icon: Icon, count }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Icon className="size-4 shrink-0" />
                            <span className="hidden sm:inline">{label}</span>
                            <span
                                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${tab === key ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'}`}
                            >
                                {count}
                            </span>
                        </button>
                    ))}
                </div>

                {tab === 'items' && <ItemsTab categories={categories} items={items} canManage={canManageMenu} />}
                {tab === 'categories' && <CategoriesTab categories={categories} canManage={canManageMenu} />}
                {tab === 'promotions' && <PromotionsTab categories={categories} items={items} promotions={promotions} canManage={canManageMenu} />}
            </main>
        </AppLayout>
    );
}

/* ─────────────────────────── ITEMS TAB ─────────────────────────── */

function ItemsTab({ categories, items, canManage }: { categories: Category[]; items: Item[]; canManage: boolean }) {
    const [editItem, setEditItem] = useState<Item | null>(null);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('all');
    const formRef = useRef<HTMLDivElement>(null);

    const filtered = items.filter((item) => {
        const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCat === 'all' || String(item.category_id) === filterCat;
        return matchSearch && matchCat;
    });

    function startEdit(item: Item) {
        setEditItem(item);
        window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }

    return (
        <div className={`grid gap-4 xl:gap-6 ${canManage ? 'xl:grid-cols-[400px_1fr]' : ''}`}>
            {/* Form */}
            {canManage && (
                <div ref={formRef} className="bg-card rounded-xl border">
                    <div className="border-b px-4 py-3 sm:px-5 sm:py-4">
                        <h2 className="font-semibold">{editItem ? 'Edit Item' : 'Tambah Item Baru'}</h2>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                            {editItem ? `Mengedit: ${editItem.name}` : 'Isi detail menu item baru'}
                        </p>
                    </div>
                    <div className="p-4 sm:p-5">
                        <ItemForm categories={categories} editItem={editItem} onCancelEdit={() => setEditItem(null)} />
                    </div>
                </div>
            )}

            {/* List */}
            <div className="flex flex-col gap-4">
                {/* Toolbar */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama menu..." className="pl-9" />
                    </div>
                    <Select value={filterCat} onValueChange={setFilterCat}>
                        <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="Semua kategori" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Kategori</SelectItem>
                            {categories.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Cards grid */}
                {filtered.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed p-12 text-center">
                        <Package className="text-muted-foreground/40 mx-auto size-10" />
                        <p className="text-muted-foreground mt-3 font-medium">Tidak ada item ditemukan</p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((item) => {
                            const pt = printTargetLabels[item.print_to] ?? printTargetLabels.kasir;
                            const PtIcon = pt.icon;
                            return (
                                <div
                                    key={item.id}
                                    className={`group bg-card relative overflow-hidden rounded-xl border transition-all hover:shadow-sm ${!item.is_available ? 'opacity-60' : ''}`}
                                >
                                    <div className="absolute top-3 left-3 z-10 sm:right-3 sm:left-auto">
                                        <span className={`block size-2 rounded-full ${item.is_available ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    </div>

                                    <div className="grid grid-cols-[104px_1fr] sm:block">
                                        <div className="bg-muted aspect-square sm:aspect-[4/3]">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                                            ) : (
                                                <div className="text-muted-foreground flex h-full items-center justify-center">
                                                    <Package className="size-9" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 p-3 sm:p-4">
                                            <p className="pr-4 leading-tight font-semibold">{item.name}</p>
                                            <p className="text-muted-foreground mt-0.5 text-xs">{item.category?.name ?? '-'}</p>

                                            <p className="text-primary mt-2 text-lg font-bold">Rp {money(item.price)}</p>

                                            <div className="mt-2 flex items-center gap-1.5">
                                                <span
                                                    className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${pt.color}`}
                                                >
                                                    <PtIcon className="size-3" /> {pt.label}
                                                </span>
                                                {!item.is_available && (
                                                    <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                                        Habis
                                                    </span>
                                                )}
                                            </div>

                                            {canManage && (
                                                <div className="mt-3 grid grid-cols-2 gap-1.5 sm:flex">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-9 flex-1 text-xs"
                                                        onClick={() => startEdit(item)}
                                                    >
                                                        <Edit2 className="size-3" /> Edit
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={item.is_available ? 'outline' : 'default'}
                                                        className="h-9 flex-1 text-xs"
                                                        onClick={() =>
                                                            router.patch(
                                                                `/menu/items/${item.id}/availability`,
                                                                { is_available: !item.is_available },
                                                                { preserveScroll: true },
                                                            )
                                                        }
                                                    >
                                                        {item.is_available ? 'Nonaktifkan' : 'Aktifkan'}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-muted-foreground hover:text-destructive col-span-2 h-9 shrink-0 sm:col-span-1 sm:w-9"
                                                        onClick={() => {
                                                            if (confirm(`Hapus "${item.name}"?`)) {
                                                                router.delete(`/menu/items/${item.id}`, { preserveScroll: true });
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <p className="text-muted-foreground text-xs">
                    {filtered.length} dari {items.length} item
                </p>
            </div>
        </div>
    );
}

function ItemForm({ categories, editItem, onCancelEdit }: { categories: Category[]; editItem: Item | null; onCancelEdit: () => void }) {
    const form = useForm({
        category_id: editItem ? String(editItem.category_id) : '',
        name: editItem?.name ?? '',
        description: editItem?.description ?? '',
        price: editItem ? Number(editItem.price) : 0,
        print_to: editItem?.print_to ?? 'kasir',
        is_available: editItem?.is_available ?? true,
        sort_order: editItem?.sort_order ?? 0,
        image: null as File | null,
        addons: editItem?.addons ? [...editItem.addons] : ([] as Addon[]),
    });
    const imagePreview = useMemo(() => {
        if (form.data.image) {
            return URL.createObjectURL(form.data.image);
        }

        return editItem?.image_url ?? null;
    }, [form.data.image, editItem?.image_url]);

    // Sync form when editItem changes
    const [lastEditId, setLastEditId] = useState<number | null>(null);
    if (editItem && editItem.id !== lastEditId) {
        setLastEditId(editItem.id);
        form.setData({
            category_id: String(editItem.category_id),
            name: editItem.name,
            description: editItem.description ?? '',
            price: Number(editItem.price),
            print_to: editItem.print_to,
            is_available: editItem.is_available,
            sort_order: editItem.sort_order,
            image: null,
            addons: editItem.addons ? [...editItem.addons] : [],
        });
    }
    if (!editItem && lastEditId !== null) {
        setLastEditId(null);
        form.reset();
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        const opts = { preserveScroll: true, forceFormData: true };
        form.transform((data) => ({
            ...data,
            category_id: Number(data.category_id),
            ...(editItem ? { _method: 'PUT' } : {}),
        }));

        if (editItem) {
            form.post(`/menu/items/${editItem.id}`, { ...opts, onSuccess: onCancelEdit });
        } else {
            form.post('/menu/items', { ...opts, onSuccess: () => form.reset() });
        }
    }

    const printOptions = [
        { value: 'kasir', label: 'Kasir' },
        { value: 'kitchen', label: 'Kitchen' },
        { value: 'bar', label: 'Bar' },
        { value: 'kitchen_bar', label: 'Kitchen & Bar' },
    ];

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
                <Label>
                    Kategori <span className="text-destructive">*</span>
                </Label>
                <Select value={form.data.category_id} onValueChange={(v) => form.setData('category_id', v)}>
                    <SelectTrigger className="min-h-[44px]">
                        <SelectValue placeholder="Pilih kategori..." />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                                {c.parent ? `${c.parent.name} - ${c.name}` : c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {form.errors.category_id && <p className="text-destructive text-xs">{form.errors.category_id}</p>}
            </div>

            <div className="space-y-1.5">
                <Label>
                    Nama Menu <span className="text-destructive">*</span>
                </Label>
                <Input
                    className="min-h-[44px]"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    placeholder="cth: Nasi Goreng Spesial"
                />
                {form.errors.name && <p className="text-destructive text-xs">{form.errors.name}</p>}
            </div>

            <div className="space-y-1.5">
                <Label>Deskripsi</Label>
                <Input
                    className="min-h-[44px]"
                    value={form.data.description}
                    onChange={(e) => form.setData('description', e.target.value)}
                    placeholder="Deskripsi singkat (opsional)"
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label>
                        Harga (Rp) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        className="min-h-[44px]"
                        type="number"
                        min={0}
                        value={form.data.price || ''}
                        onChange={(e) => form.setData('price', Number(e.target.value))}
                        placeholder="0"
                    />
                    {form.errors.price && <p className="text-destructive text-xs">{form.errors.price}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label>Urutan</Label>
                    <Input
                        className="min-h-[44px]"
                        type="number"
                        min={0}
                        value={form.data.sort_order}
                        onChange={(e) => form.setData('sort_order', Number(e.target.value))}
                        placeholder="0"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label>Dicetak ke</Label>
                <Select value={form.data.print_to} onValueChange={(v) => form.setData('print_to', v)}>
                    <SelectTrigger className="min-h-[44px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {printOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label>Gambar</Label>
                {imagePreview && (
                    <img
                        src={imagePreview}
                        alt={form.data.name || 'Preview menu'}
                        className="aspect-[16/10] w-full rounded-lg border object-cover sm:aspect-[4/3]"
                    />
                )}
                <Input
                    className="file:bg-muted min-h-[44px] file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm"
                    type="file"
                    accept="image/*"
                    onChange={(e) => form.setData('image', e.target.files?.[0] ?? null)}
                />
                {form.errors.image && <p className="text-destructive text-xs">{form.errors.image}</p>}
            </div>

            {/* Addons Section */}
            <div className="space-y-2 rounded-lg border bg-slate-50/50 p-4">
                <div className="flex items-center justify-between">
                    <Label>Add-ons (Opsional)</Label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                            form.setData('addons', [...form.data.addons, { id: null, name: '', price: 0, is_active: true }]);
                        }}
                    >
                        <Plus className="mr-1 size-3" /> Tambah Add-on
                    </Button>
                </div>
                {form.data.addons.length > 0 && (
                    <div className="space-y-2 pt-2">
                        {form.data.addons.map((addon, index) => (
                            <div key={index} className="bg-card flex flex-wrap items-start gap-2 rounded-md border p-2 sm:flex-nowrap">
                                <div className="w-full space-y-1 sm:w-auto sm:flex-1">
                                    <Input
                                        placeholder="Nama (cth: Ekstra Telor)"
                                        value={addon.name}
                                        onChange={(e) => {
                                            const newAddons = [...form.data.addons];
                                            newAddons[index].name = e.target.value;
                                            form.setData('addons', newAddons);
                                        }}
                                        required
                                    />
                                    {(form.errors as Record<string, string>)[`addons.${index}.name`] && (
                                        <p className="text-destructive text-[10px]">
                                            {(form.errors as Record<string, string>)[`addons.${index}.name`]}
                                        </p>
                                    )}
                                </div>
                                <div className="w-full space-y-1 sm:w-32">
                                    <Input
                                        type="number"
                                        placeholder="Harga"
                                        min={0}
                                        value={addon.price}
                                        onChange={(e) => {
                                            const newAddons = [...form.data.addons];
                                            newAddons[index].price = e.target.value;
                                            form.setData('addons', newAddons);
                                        }}
                                        required
                                    />
                                </div>
                                <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
                                    <div className="flex items-center gap-1.5 px-1">
                                        <Checkbox
                                            id={`addon_active_${index}`}
                                            checked={addon.is_active}
                                            onCheckedChange={(v) => {
                                                const newAddons = [...form.data.addons];
                                                newAddons[index].is_active = Boolean(v);
                                                form.setData('addons', newAddons);
                                            }}
                                        />
                                        <Label htmlFor={`addon_active_${index}`} className="cursor-pointer text-xs">
                                            Aktif
                                        </Label>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive size-8"
                                        onClick={() => {
                                            const newAddons = [...form.data.addons];
                                            newAddons.splice(index, 1);
                                            form.setData('addons', newAddons);
                                        }}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Checkbox id="is_available" checked={form.data.is_available} onCheckedChange={(v) => form.setData('is_available', Boolean(v))} />
                <Label htmlFor="is_available" className="cursor-pointer font-normal">
                    Item tersedia / aktif
                </Label>
            </div>

            <div className="grid gap-2 pt-1 sm:flex">
                <Button type="submit" disabled={form.processing} className="min-h-[44px] flex-1">
                    {editItem ? (
                        <>
                            <Save className="size-4" /> Simpan Perubahan
                        </>
                    ) : (
                        <>
                            <Plus className="size-4" /> Tambah Item
                        </>
                    )}
                </Button>
                {editItem && (
                    <Button type="button" variant="outline" className="min-h-[44px] sm:w-12" onClick={onCancelEdit}>
                        <X className="size-4" />
                        <span className="sm:hidden">Batal Edit</span>
                    </Button>
                )}
            </div>
        </form>
    );
}

/* ─────────────────────────── CATEGORIES TAB ─────────────────────────── */

function CategoriesTab({ categories, canManage }: { categories: Category[]; canManage: boolean }) {
    const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; cat?: Category } | null>(null);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold">Kategori Menu</h2>
                    <p className="text-muted-foreground text-sm">Kelola daftar kategori dan sub-kategori menu.</p>
                </div>
                {canManage && (
                    <Button onClick={() => setDialog({ mode: 'create' })}>
                        <Plus className="mr-2 h-4 w-4" /> Tambah Kategori
                    </Button>
                )}
            </div>

            <div className="bg-card rounded-xl border">
                <div className="overflow-x-auto p-0">
                    <table className="w-full min-w-[720px] text-sm">
                        <thead className="text-muted-foreground border-b text-left bg-muted/50">
                            <tr>
                                <th className="py-3 px-5 font-medium">Kategori</th>
                                <th className="py-3 px-5 font-medium">Induk Kategori</th>
                                <th className="py-3 px-5 font-medium">Urutan</th>
                                <th className="py-3 px-5 font-medium">Item Aktif</th>
                                <th className="py-3 px-5 font-medium">Status</th>
                                <th className="py-3 px-5 text-right font-medium">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                        <Tag className="mx-auto size-8 mb-2 opacity-20" />
                                        Belum ada kategori
                                    </td>
                                </tr>
                            ) : (
                                categories.map((cat) => (
                                    <tr key={cat.id} className={`border-b hover:bg-muted/50 ${!cat.is_active ? 'opacity-70' : ''}`}>
                                        <td className="py-3 px-5 font-medium">
                                            {cat.name}
                                            {cat.description && <p className="text-muted-foreground mt-0.5 font-normal truncate max-w-[200px] text-xs">{cat.description}</p>}
                                        </td>
                                        <td className="py-3 px-5 text-muted-foreground">
                                            {cat.parent ? cat.parent.name : '-'}
                                        </td>
                                        <td className="py-3 px-5">{cat.sort_order}</td>
                                        <td className="py-3 px-5">{cat.active_items_count}</td>
                                        <td className="py-3 px-5">
                                            <Badge variant={cat.is_active ? 'secondary' : 'outline'} className="text-xs">
                                                {cat.is_active ? 'Aktif' : 'Nonaktif'}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-5 text-right">
                                            {canManage && (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={() => setDialog({ mode: 'edit', cat })}>
                                                        <Edit2 className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-muted-foreground hover:text-destructive h-8 w-8 px-0"
                                                        onClick={() => {
                                                            if (confirm(`Hapus kategori "${cat.name}"? Item di dalamnya perlu dipindah dulu.`)) {
                                                                router.delete(`/menu/categories/${cat.id}`, { preserveScroll: true });
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{dialog?.mode === 'edit' ? 'Edit Kategori' : 'Tambah Kategori Baru'}</DialogTitle>
                    </DialogHeader>
                    {dialog && (
                        <CategoryForm 
                            editCat={dialog.cat ?? null} 
                            categories={categories} 
                            onCancelEdit={() => setDialog(null)} 
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CategoryForm({ editCat, categories, onCancelEdit }: { editCat: Category | null; categories: Category[]; onCancelEdit: () => void }) {
    const form = useForm({
        parent_id: editCat?.parent_id ? String(editCat.parent_id) : 'none',
        name: editCat?.name ?? '',
        description: editCat?.description ?? '',
        sort_order: editCat?.sort_order ?? 0,
        is_active: editCat?.is_active ?? true,
    });

    const [lastEditId, setLastEditId] = useState<number | null>(null);
    if (editCat && editCat.id !== lastEditId) {
        setLastEditId(editCat.id);
        form.setData({ parent_id: editCat.parent_id ? String(editCat.parent_id) : 'none', name: editCat.name, description: editCat.description ?? '', sort_order: editCat.sort_order, is_active: editCat.is_active });
    }
    if (!editCat && lastEditId !== null) {
        setLastEditId(null);
        form.reset();
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: onCancelEdit };
        const payload = {
            name: form.data.name,
            description: form.data.description,
            sort_order: form.data.sort_order,
            is_active: form.data.is_active,
            parent_id: form.data.parent_id === 'none' ? null : Number(form.data.parent_id)
        };
        
        if (editCat) {
            router.put(`/menu/categories/${editCat.id}`, payload, opts);
        } else {
            router.post('/menu/categories', payload, opts);
        }
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
                <Label>Kategori Induk (Opsional)</Label>
                <Select value={form.data.parent_id} onValueChange={(v) => form.setData('parent_id', v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Tidak ada (Kategori Utama)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Tidak ada (Kategori Utama)</SelectItem>
                        {categories.filter(c => c.parent_id === null && c.id !== editCat?.id).map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">Pilih induk jika ini adalah sub-kategori.</p>
            </div>

            <div className="space-y-1.5">
                <Label>
                    Nama Kategori <span className="text-destructive">*</span>
                </Label>
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="cth: Makanan, Minuman, Snack" />
                {form.errors.name && <p className="text-destructive text-xs">{form.errors.name}</p>}
            </div>

            <div className="space-y-1.5">
                <Label>Deskripsi</Label>
                <Input
                    value={form.data.description}
                    onChange={(e) => form.setData('description', e.target.value)}
                    placeholder="Deskripsi kategori (opsional)"
                />
            </div>

            <div className="space-y-1.5">
                <Label>Urutan Tampil</Label>
                <Input
                    type="number"
                    min={0}
                    value={form.data.sort_order}
                    onChange={(e) => form.setData('sort_order', Number(e.target.value))}
                    placeholder="0"
                />
                <p className="text-muted-foreground text-xs">Angka lebih kecil tampil lebih dulu</p>
            </div>

            <div className="flex items-center gap-2">
                <Checkbox id="cat_active" checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', Boolean(v))} />
                <Label htmlFor="cat_active" className="cursor-pointer font-normal">
                    Kategori aktif / ditampilkan
                </Label>
            </div>

            <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={form.processing} className="flex-1">
                    {editCat ? (
                        <>
                            <Save className="size-4" /> Simpan
                        </>
                    ) : (
                        <>
                            <Plus className="size-4" /> Tambah Kategori
                        </>
                    )}
                </Button>
                {editCat && (
                    <Button type="button" variant="outline" onClick={onCancelEdit}>
                        <X className="size-4" />
                    </Button>
                )}
            </div>
        </form>
    );
}

/* ─────────────────────────── PROMOTIONS TAB ─────────────────────────── */

function PromotionsTab({
    categories,
    items,
    promotions,
    canManage,
}: {
    categories: Category[];
    items: Item[];
    promotions: Promotion[];
    canManage: boolean;
}) {
    const form = useForm({
        name: '',
        type: 'percentage',
        value: 0,
        applies_to: 'all',
        category_id: '',
        menu_item_id: '',
        min_order_amount: '',
        valid_from: '',
        valid_until: '',
        is_active: true as boolean,
    });

    function submit(e: FormEvent) {
        e.preventDefault();
        form.transform((data) => ({
            ...data,
            category_id: data.category_id || null,
            menu_item_id: data.menu_item_id || null,
            min_order_amount: data.min_order_amount || null,
        }));
        form.post('/menu/promotions', { preserveScroll: true, onSuccess: () => form.reset() });
    }

    return (
        <div className={`grid gap-6 ${canManage ? 'xl:grid-cols-[380px_1fr]' : ''}`}>
            {/* Form */}
            {canManage && (
                <div className="bg-card rounded-xl border">
                    <div className="border-b px-5 py-4">
                        <h2 className="font-semibold">Tambah Promo</h2>
                        <p className="text-muted-foreground mt-0.5 text-xs">Buat diskon atau promo baru</p>
                    </div>
                    <form onSubmit={submit} className="space-y-4 p-5">
                        <div className="space-y-1.5">
                            <Label>
                                Nama Promo <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="cth: Diskon Hari Jadi 10%"
                            />
                            {form.errors.name && <p className="text-destructive text-xs">{form.errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Tipe Diskon</Label>
                                <Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Persentase (%)</SelectItem>
                                        <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>{form.data.type === 'percentage' ? 'Besar (%)' : 'Nominal (Rp)'}</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.data.value || ''}
                                    onChange={(e) => form.setData('value', Number(e.target.value))}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Berlaku untuk</Label>
                            <Select value={form.data.applies_to} onValueChange={(v) => form.setData('applies_to', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Item</SelectItem>
                                    <SelectItem value="category">Kategori Tertentu</SelectItem>
                                    <SelectItem value="item">Item Tertentu</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {form.data.applies_to === 'category' && (
                            <div className="space-y-1.5">
                                <Label>Kategori</Label>
                                <Select value={form.data.category_id} onValueChange={(v) => form.setData('category_id', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih kategori..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {form.data.applies_to === 'item' && (
                            <div className="space-y-1.5">
                                <Label>Item Menu</Label>
                                <Select value={form.data.menu_item_id} onValueChange={(v) => form.setData('menu_item_id', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih item..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {items.map((i) => (
                                            <SelectItem key={i.id} value={String(i.id)}>
                                                {i.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Berlaku Mulai</Label>
                                <Input
                                    type="datetime-local"
                                    value={form.data.valid_from}
                                    onChange={(e) => form.setData('valid_from', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Berlaku Sampai</Label>
                                <Input
                                    type="datetime-local"
                                    value={form.data.valid_until}
                                    onChange={(e) => form.setData('valid_until', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="promo_active"
                                checked={form.data.is_active}
                                onCheckedChange={(v) => form.setData('is_active', Boolean(v))}
                            />
                            <Label htmlFor="promo_active" className="cursor-pointer font-normal">
                                Promo aktif
                            </Label>
                        </div>

                        <Button type="submit" disabled={form.processing} className="w-full">
                            <Plus className="size-4" /> Tambah Promo
                        </Button>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="space-y-3">
                {promotions.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed p-12 text-center">
                        <Percent className="text-muted-foreground/40 mx-auto size-10" />
                        <p className="text-muted-foreground mt-3 font-medium">Belum ada promo aktif</p>
                    </div>
                ) : (
                    promotions.map((promo) => {
                        const isActive = promo.is_active;
                        const now = new Date();
                        const expired = promo.valid_until && new Date(promo.valid_until) < now;
                        return (
                            <div
                                key={promo.id}
                                className={`bg-card rounded-xl border px-5 py-4 transition-all hover:shadow-sm ${!isActive || expired ? 'opacity-60' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold">{promo.name}</p>
                                            {expired ? (
                                                <Badge variant="outline" className="text-xs">
                                                    Kadaluarsa
                                                </Badge>
                                            ) : isActive ? (
                                                <Badge className="border-emerald-200 bg-emerald-100 text-xs text-emerald-700">Aktif</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs">
                                                    Nonaktif
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            {promo.type === 'percentage' ? `${promo.value}% diskon` : `Diskon Rp ${money(promo.value)}`}
                                            {' · '}
                                            {promo.applies_to === 'all'
                                                ? 'Semua item'
                                                : promo.applies_to === 'category'
                                                  ? 'Kategori tertentu'
                                                  : 'Item tertentu'}
                                        </p>
                                        {(promo.valid_from || promo.valid_until) && (
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                {promo.valid_from && `Mulai: ${new Date(promo.valid_from).toLocaleDateString('id-ID')}`}
                                                {promo.valid_from && promo.valid_until && ' – '}
                                                {promo.valid_until && `s/d ${new Date(promo.valid_until).toLocaleDateString('id-ID')}`}
                                            </p>
                                        )}
                                    </div>
                                    {canManage && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
                                            onClick={() => {
                                                if (confirm(`Hapus promo "${promo.name}"?`)) {
                                                    router.delete(`/menu/promotions/${promo.id}`, { preserveScroll: true });
                                                }
                                            }}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
