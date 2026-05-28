import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Save, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Category = { id: number; name: string; description?: string | null; sort_order: number; is_active: boolean; active_items_count: number };
type Item = { id: number; category_id: number; name: string; description?: string | null; price: string; print_to: string; is_available: boolean; sort_order: number; category?: Category };
type Promotion = { id: number; name: string; type: string; value: string; applies_to: string; is_active: boolean; valid_from: string; valid_until: string };
type Props = { categories: Category[]; items: Item[]; promotions: Promotion[] };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Menu', href: '/menu' }];
const printTargets = ['kasir', 'kitchen', 'bar', 'kitchen_bar'];

export default function MenuIndex({ categories, items, promotions }: Props) {
    const [tab, setTab] = useState<'items' | 'categories' | 'promotions'>('items');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Menu Management" />
            <main className="flex flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Menu Management</h1>
                    <p className="text-sm text-muted-foreground">Kategori, menu item, routing print_to, dan promo.</p>
                </div>
                <div className="flex gap-2 border-b">
                    {(['items', 'categories', 'promotions'] as const).map((value) => (
                        <button key={value} type="button" onClick={() => setTab(value)} className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                            {value}
                        </button>
                    ))}
                </div>
                {tab === 'items' && <ItemsTab categories={categories} items={items} />}
                {tab === 'categories' && <CategoriesTab categories={categories} />}
                {tab === 'promotions' && <PromotionsTab categories={categories} items={items} promotions={promotions} />}
            </main>
        </AppLayout>
    );
}

function CategoriesTab({ categories }: { categories: Category[] }) {
    return (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <CategoryForm />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{categories.map((category) => <CategoryForm key={category.id} category={category} />)}</div>
        </div>
    );
}

function CategoryForm({ category }: { category?: Category }) {
    const form = useForm({ name: category?.name ?? '', description: category?.description ?? '', sort_order: category?.sort_order ?? 0, is_active: category?.is_active ?? true, image: null as File | null });

    function submit(event: FormEvent) {
        event.preventDefault();
        const options = { preserveScroll: true, forceFormData: true };
        category ? form.post(`/menu/categories/${category.id}?_method=PUT`, options) : form.post('/menu/categories', options);
    }

    return (
        <form onSubmit={submit} className="rounded-md border p-4">
            <h2 className="mb-3 text-base font-semibold">{category ? category.name : 'Tambah Kategori'}</h2>
            {category && <p className="mb-3 text-sm text-muted-foreground">{category.active_items_count} item aktif</p>}
            <div className="grid gap-3">
                <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} placeholder="Nama kategori" />
                <Input value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} placeholder="Deskripsi" />
                <Input type="file" accept="image/*" onChange={(event) => form.setData('image', event.target.files?.[0] ?? null)} />
                <Input type="number" value={form.data.sort_order} onChange={(event) => form.setData('sort_order', Number(event.target.value))} />
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', Boolean(checked))} /> Aktif</label>
                <div className="flex gap-2">
                    <Button type="submit"><Save />Simpan</Button>
                    {category && <Button type="button" variant="destructive" onClick={() => router.delete(`/menu/categories/${category.id}`, { preserveScroll: true })}><Trash2 />Hapus</Button>}
                </div>
            </div>
        </form>
    );
}

function ItemsTab({ categories, items }: { categories: Category[]; items: Item[] }) {
    return (
        <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
            <ItemForm categories={categories} />
            <Card className="rounded-md">
                <CardHeader><CardTitle className="text-base">Menu Items</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-sm">
                        <thead className="border-b text-left text-muted-foreground"><tr><th className="py-2">Nama</th><th>Kategori</th><th>Harga</th><th>Print To</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>{items.map((item) => <tr key={item.id} className="border-b"><td className="py-3 font-medium">{item.name}</td><td>{item.category?.name}</td><td>Rp {Number(item.price).toLocaleString('id-ID')}</td><td><Badge variant="outline">{item.print_to}</Badge></td><td>{item.is_available ? 'Tersedia' : 'Habis'}</td><td className="flex gap-2 py-2"><Button type="button" size="sm" variant="outline" onClick={() => router.patch(`/menu/items/${item.id}/availability`, { is_available: !item.is_available }, { preserveScroll: true })}>Toggle</Button><Button type="button" size="sm" variant="destructive" onClick={() => router.delete(`/menu/items/${item.id}`, { preserveScroll: true })}>Hapus</Button></td></tr>)}</tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}

function ItemForm({ categories }: { categories: Category[] }) {
    const form = useForm({ category_id: '', name: '', description: '', price: 0, print_to: 'kasir', is_available: true, sort_order: 0, image: null as File | null });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({ ...data, category_id: Number(data.category_id) })).post('/menu/items', { preserveScroll: true, forceFormData: true, onSuccess: () => form.reset() });
    }

    return (
        <form onSubmit={submit} className="rounded-md border p-4">
            <h2 className="mb-3 text-base font-semibold">Tambah Menu Item</h2>
            <div className="grid gap-3">
                <Select value={form.data.category_id} onValueChange={(value) => form.setData('category_id', value)}><SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}</SelectContent></Select>
                <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} placeholder="Nama menu" />
                <Input value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} placeholder="Deskripsi" />
                <Input type="number" value={form.data.price} onChange={(event) => form.setData('price', Number(event.target.value))} placeholder="Harga" />
                <Select value={form.data.print_to} onValueChange={(value) => form.setData('print_to', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{printTargets.map((target) => <SelectItem key={target} value={target}>{target}</SelectItem>)}</SelectContent></Select>
                <Input type="file" accept="image/*" onChange={(event) => form.setData('image', event.target.files?.[0] ?? null)} />
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.data.is_available} onCheckedChange={(checked) => form.setData('is_available', Boolean(checked))} /> Tersedia</label>
                <Button type="submit"><Save />Tambah Item</Button>
            </div>
        </form>
    );
}

function PromotionsTab({ categories, items, promotions }: { categories: Category[]; items: Item[]; promotions: Promotion[] }) {
    const form = useForm({ name: '', type: 'percentage', value: 0, applies_to: 'all', category_id: '', menu_item_id: '', min_order_amount: '', valid_from: '', valid_until: '', is_active: true });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({ ...data, category_id: data.category_id || null, menu_item_id: data.menu_item_id || null, min_order_amount: data.min_order_amount || null })).post('/menu/promotions', { preserveScroll: true, onSuccess: () => form.reset() });
    }
    return (
        <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
            <form onSubmit={submit} className="rounded-md border p-4">
                <h2 className="mb-3 text-base font-semibold">Tambah Promo</h2>
                <div className="grid gap-3">
                    <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="Nama promo" />
                    <Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">percentage</SelectItem><SelectItem value="fixed">fixed</SelectItem></SelectContent></Select>
                    <Input type="number" value={form.data.value} onChange={(e) => form.setData('value', Number(e.target.value))} />
                    <Select value={form.data.applies_to} onValueChange={(v) => form.setData('applies_to', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">all</SelectItem><SelectItem value="category">category</SelectItem><SelectItem value="item">item</SelectItem></SelectContent></Select>
                    {form.data.applies_to === 'category' && <Select value={form.data.category_id} onValueChange={(v) => form.setData('category_id', v)}><SelectTrigger><SelectValue placeholder="Kategori" /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select>}
                    {form.data.applies_to === 'item' && <Select value={form.data.menu_item_id} onValueChange={(v) => form.setData('menu_item_id', v)}><SelectTrigger><SelectValue placeholder="Item" /></SelectTrigger><SelectContent>{items.map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}</SelectContent></Select>}
                    <Input type="datetime-local" value={form.data.valid_from} onChange={(e) => form.setData('valid_from', e.target.value)} />
                    <Input type="datetime-local" value={form.data.valid_until} onChange={(e) => form.setData('valid_until', e.target.value)} />
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', Boolean(checked))} /> Aktif</label>
                    <Button type="submit"><Save />Tambah Promo</Button>
                </div>
            </form>
            <Card><CardHeader><CardTitle className="text-base">Promo</CardTitle></CardHeader><CardContent className="space-y-2">{promotions.map((promo) => <div key={promo.id} className="flex items-center justify-between rounded-md border p-3 text-sm"><span>{promo.name}</span><Badge variant={promo.is_active ? 'secondary' : 'outline'}>{promo.type} {promo.value}</Badge></div>)}</CardContent></Card>
        </div>
    );
}
