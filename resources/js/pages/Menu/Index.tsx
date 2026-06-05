import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    ChefHat,
    Edit2,
    GlassWater,
    Package,
    Percent,
    Plus,
    Printer,
    Save,
    Search,
    Tag,
    Trash2,
    X,
} from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';

type Category = { id: number; name: string; description?: string | null; sort_order: number; is_active: boolean; active_items_count: number };
type Item = { id: number; category_id: number; name: string; description?: string | null; price: string; print_to: string; image_url?: string | null; is_available: boolean; sort_order: number; category?: Category };
type Promotion = { id: number; name: string; type: string; value: string; applies_to: string; is_active: boolean; valid_from: string; valid_until: string };
type Props = { categories: Category[]; items: Item[]; promotions: Promotion[] };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Menu', href: '/menu' }];

const printTargetLabels: Record<string, { label: string; icon: typeof Printer; color: string }> = {
    kasir:       { label: 'Kasir',        icon: Printer,   color: 'bg-slate-100 text-slate-700 border-slate-200' },
    kitchen:     { label: 'Kitchen',      icon: ChefHat,   color: 'bg-orange-100 text-orange-700 border-orange-200' },
    bar:         { label: 'Bar',          icon: GlassWater, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    kitchen_bar: { label: 'Kitchen & Bar', icon: ChefHat,  color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const money = (v: number | string) => Number(v || 0).toLocaleString('id-ID');

export default function MenuIndex({ categories, items, promotions }: Props) {
    const [tab, setTab] = useState<'items' | 'categories' | 'promotions'>('items');
    const { auth } = usePage<SharedData>().props;
    const canManageMenu = auth.permissions?.includes('menu.manage') ?? false;

    const tabs = [
        { key: 'items' as const,      label: 'Menu Item',  icon: Package,  count: items.length },
        { key: 'categories' as const, label: 'Kategori',   icon: Tag,      count: categories.length },
        { key: 'promotions' as const, label: 'Promo',      icon: Percent,  count: promotions.length },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Menu Management" />
            <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold">Menu Management</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Kelola kategori, item menu, dan promo.</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 rounded-xl bg-muted p-1">
                    {tabs.map(({ key, label, icon: Icon, count }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Icon className="size-4 shrink-0" />
                            <span className="hidden sm:inline">{label}</span>
                            <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${tab === key ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'}`}>{count}</span>
                        </button>
                    ))}
                </div>

                {tab === 'items'      && <ItemsTab categories={categories} items={items} canManage={canManageMenu} />}
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
                <div ref={formRef} className="rounded-xl border bg-card">
                    <div className="border-b px-4 py-3 sm:px-5 sm:py-4">
                        <h2 className="font-semibold">{editItem ? 'Edit Item' : 'Tambah Item Baru'}</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">{editItem ? `Mengedit: ${editItem.name}` : 'Isi detail menu item baru'}</p>
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
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari nama menu..."
                            className="pl-9"
                        />
                    </div>
                    <Select value={filterCat} onValueChange={setFilterCat}>
                        <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="Semua kategori" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Kategori</SelectItem>
                            {categories.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Cards grid */}
                {filtered.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed p-12 text-center">
                        <Package className="mx-auto size-10 text-muted-foreground/40" />
                        <p className="mt-3 font-medium text-muted-foreground">Tidak ada item ditemukan</p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((item) => {
                            const pt = printTargetLabels[item.print_to] ?? printTargetLabels.kasir;
                            const PtIcon = pt.icon;
                            return (
                                <div key={item.id} className={`group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-sm ${!item.is_available ? 'opacity-60' : ''}`}>
                                    <div className="absolute left-3 top-3 z-10 sm:left-auto sm:right-3">
                                        <span className={`block size-2 rounded-full ${item.is_available ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    </div>

                                    <div className="grid grid-cols-[104px_1fr] sm:block">
                                        <div className="aspect-square bg-muted sm:aspect-[4/3]">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                                    <Package className="size-9" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 p-3 sm:p-4">
                                            <p className="pr-4 font-semibold leading-tight">{item.name}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">{item.category?.name ?? '-'}</p>

                                        <p className="mt-2 text-lg font-bold text-primary">Rp {money(item.price)}</p>

                                        <div className="mt-2 flex items-center gap-1.5">
                                            <span className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${pt.color}`}>
                                                <PtIcon className="size-3" /> {pt.label}
                                            </span>
                                            {!item.is_available && (
                                                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Habis</span>
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
                                                    onClick={() => router.patch(`/menu/items/${item.id}/availability`, { is_available: !item.is_available }, { preserveScroll: true })}
                                                >
                                                    {item.is_available ? 'Nonaktifkan' : 'Aktifkan'}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="col-span-2 h-9 shrink-0 text-muted-foreground hover:text-destructive sm:col-span-1 sm:w-9"
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

                <p className="text-xs text-muted-foreground">{filtered.length} dari {items.length} item</p>
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
        { value: 'kasir',       label: 'Kasir' },
        { value: 'kitchen',     label: 'Kitchen' },
        { value: 'bar',         label: 'Bar' },
        { value: 'kitchen_bar', label: 'Kitchen & Bar' },
    ];

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
                <Label>Kategori <span className="text-destructive">*</span></Label>
                <Select value={form.data.category_id} onValueChange={(v) => form.setData('category_id', v)}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
                    <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                {form.errors.category_id && <p className="text-xs text-destructive">{form.errors.category_id}</p>}
            </div>

            <div className="space-y-1.5">
                <Label>Nama Menu <span className="text-destructive">*</span></Label>
                <Input className="min-h-[44px]" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="cth: Nasi Goreng Spesial" />
                {form.errors.name && <p className="text-xs text-destructive">{form.errors.name}</p>}
            </div>

            <div className="space-y-1.5">
                <Label>Deskripsi</Label>
                <Input className="min-h-[44px]" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} placeholder="Deskripsi singkat (opsional)" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label>Harga (Rp) <span className="text-destructive">*</span></Label>
                    <Input
                        className="min-h-[44px]"
                        type="number"
                        min={0}
                        value={form.data.price || ''}
                        onChange={(e) => form.setData('price', Number(e.target.value))}
                        placeholder="0"
                    />
                    {form.errors.price && <p className="text-xs text-destructive">{form.errors.price}</p>}
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
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {printOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label>Gambar</Label>
                {imagePreview && (
                    <img src={imagePreview} alt={form.data.name || 'Preview menu'} className="aspect-[16/10] w-full rounded-lg border object-cover sm:aspect-[4/3]" />
                )}
                <Input className="min-h-[44px] file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm" type="file" accept="image/*" onChange={(e) => form.setData('image', e.target.files?.[0] ?? null)} />
                {form.errors.image && <p className="text-xs text-destructive">{form.errors.image}</p>}
            </div>

            <div className="flex items-center gap-2">
                <Checkbox
                    id="is_available"
                    checked={form.data.is_available}
                    onCheckedChange={(v) => form.setData('is_available', Boolean(v))}
                />
                <Label htmlFor="is_available" className="cursor-pointer font-normal">Item tersedia / aktif</Label>
            </div>

            <div className="grid gap-2 pt-1 sm:flex">
                <Button type="submit" disabled={form.processing} className="min-h-[44px] flex-1">
                    {editItem ? <><Save className="size-4" /> Simpan Perubahan</> : <><Plus className="size-4" /> Tambah Item</>}
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
    const [editCat, setEditCat] = useState<Category | null>(null);

    return (
        <div className={`grid gap-6 ${canManage ? 'xl:grid-cols-[380px_1fr]' : ''}`}>
            {/* Form */}
            {canManage && (
                <div className="rounded-xl border bg-card">
                    <div className="border-b px-5 py-4">
                        <h2 className="font-semibold">{editCat ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">{editCat ? `Mengedit: ${editCat.name}` : 'Buat kategori untuk mengelompokkan menu'}</p>
                    </div>
                    <div className="p-5">
                        <CategoryForm editCat={editCat} onCancelEdit={() => setEditCat(null)} />
                    </div>
                </div>
            )}

            {/* List */}
            <div className="space-y-3">
                {categories.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed p-12 text-center">
                        <Tag className="mx-auto size-10 text-muted-foreground/40" />
                        <p className="mt-3 font-medium text-muted-foreground">Belum ada kategori</p>
                    </div>
                ) : (
                    categories.map((cat) => (
                        <div key={cat.id} className={`flex items-center gap-4 rounded-xl border bg-card px-5 py-4 transition-all hover:shadow-sm ${!cat.is_active ? 'opacity-60' : ''}`}>
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                                {cat.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold">{cat.name}</p>
                                    {!cat.is_active && <Badge variant="outline" className="text-xs">Nonaktif</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground">{cat.active_items_count} item aktif · urutan {cat.sort_order}</p>
                                {cat.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{cat.description}</p>}
                            </div>
                            {canManage && (
                                <div className="flex shrink-0 gap-1.5">
                                    <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setEditCat(cat)}>
                                        <Edit2 className="size-3.5" /> Edit
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function CategoryForm({ editCat, onCancelEdit }: { editCat: Category | null; onCancelEdit: () => void }) {
    const form = useForm({
        name: editCat?.name ?? '',
        description: editCat?.description ?? '',
        sort_order: editCat?.sort_order ?? 0,
        is_active: editCat?.is_active ?? true,
    });

    const [lastEditId, setLastEditId] = useState<number | null>(null);
    if (editCat && editCat.id !== lastEditId) {
        setLastEditId(editCat.id);
        form.setData({ name: editCat.name, description: editCat.description ?? '', sort_order: editCat.sort_order, is_active: editCat.is_active });
    }
    if (!editCat && lastEditId !== null) {
        setLastEditId(null);
        form.reset();
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        const opts = { preserveScroll: true };
        if (editCat) {
            form.post(`/menu/categories/${editCat.id}?_method=PUT`, { ...opts, onSuccess: onCancelEdit });
        } else {
            form.post('/menu/categories', { ...opts, onSuccess: () => form.reset() });
        }
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
                <Label>Nama Kategori <span className="text-destructive">*</span></Label>
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="cth: Makanan, Minuman, Snack" />
                {form.errors.name && <p className="text-xs text-destructive">{form.errors.name}</p>}
            </div>

            <div className="space-y-1.5">
                <Label>Deskripsi</Label>
                <Input value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} placeholder="Deskripsi kategori (opsional)" />
            </div>

            <div className="space-y-1.5">
                <Label>Urutan Tampil</Label>
                <Input type="number" min={0} value={form.data.sort_order} onChange={(e) => form.setData('sort_order', Number(e.target.value))} placeholder="0" />
                <p className="text-xs text-muted-foreground">Angka lebih kecil tampil lebih dulu</p>
            </div>

            <div className="flex items-center gap-2">
                <Checkbox id="cat_active" checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', Boolean(v))} />
                <Label htmlFor="cat_active" className="cursor-pointer font-normal">Kategori aktif / ditampilkan</Label>
            </div>

            <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={form.processing} className="flex-1">
                    {editCat ? <><Save className="size-4" /> Simpan</> : <><Plus className="size-4" /> Tambah Kategori</>}
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

function PromotionsTab({ categories, items, promotions, canManage }: { categories: Category[]; items: Item[]; promotions: Promotion[]; canManage: boolean }) {
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
        is_active: true,
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
                <div className="rounded-xl border bg-card">
                    <div className="border-b px-5 py-4">
                        <h2 className="font-semibold">Tambah Promo</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">Buat diskon atau promo baru</p>
                    </div>
                    <form onSubmit={submit} className="space-y-4 p-5">
                    <div className="space-y-1.5">
                        <Label>Nama Promo <span className="text-destructive">*</span></Label>
                        <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="cth: Diskon Hari Jadi 10%" />
                        {form.errors.name && <p className="text-xs text-destructive">{form.errors.name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Tipe Diskon</Label>
                            <Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percentage">Persentase (%)</SelectItem>
                                    <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>{form.data.type === 'percentage' ? 'Besar (%)' : 'Nominal (Rp)'}</Label>
                            <Input type="number" min={0} value={form.data.value || ''} onChange={(e) => form.setData('value', Number(e.target.value))} placeholder="0" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Berlaku untuk</Label>
                        <Select value={form.data.applies_to} onValueChange={(v) => form.setData('applies_to', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
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
                                <SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
                                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}

                    {form.data.applies_to === 'item' && (
                        <div className="space-y-1.5">
                            <Label>Item Menu</Label>
                            <Select value={form.data.menu_item_id} onValueChange={(v) => form.setData('menu_item_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Pilih item..." /></SelectTrigger>
                                <SelectContent>{items.map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Berlaku Mulai</Label>
                            <Input type="datetime-local" value={form.data.valid_from} onChange={(e) => form.setData('valid_from', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Berlaku Sampai</Label>
                            <Input type="datetime-local" value={form.data.valid_until} onChange={(e) => form.setData('valid_until', e.target.value)} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Checkbox id="promo_active" checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', Boolean(v))} />
                        <Label htmlFor="promo_active" className="cursor-pointer font-normal">Promo aktif</Label>
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
                        <Percent className="mx-auto size-10 text-muted-foreground/40" />
                        <p className="mt-3 font-medium text-muted-foreground">Belum ada promo aktif</p>
                    </div>
                ) : (
                    promotions.map((promo) => {
                        const isActive = promo.is_active;
                        const now = new Date();
                        const expired = promo.valid_until && new Date(promo.valid_until) < now;
                        return (
                            <div key={promo.id} className={`rounded-xl border bg-card px-5 py-4 transition-all hover:shadow-sm ${!isActive || expired ? 'opacity-60' : ''}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold">{promo.name}</p>
                                            {expired ? (
                                                <Badge variant="outline" className="text-xs">Kadaluarsa</Badge>
                                            ) : isActive ? (
                                                <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">Aktif</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs">Nonaktif</Badge>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {promo.type === 'percentage' ? `${promo.value}% diskon` : `Diskon Rp ${money(promo.value)}`}
                                            {' · '}
                                            {promo.applies_to === 'all' ? 'Semua item' : promo.applies_to === 'category' ? 'Kategori tertentu' : 'Item tertentu'}
                                        </p>
                                        {(promo.valid_from || promo.valid_until) && (
                                            <p className="mt-1 text-xs text-muted-foreground">
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
                                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
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
