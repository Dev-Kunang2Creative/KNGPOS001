import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Minus, Plus, Send, ShoppingCart, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { FormEvent, useMemo, useState } from 'react';

type Table = {
    id: number;
    name: string;
    status: string;
    zone?: { id: number; name: string; color_hex: string; assignment?: unknown | null };
};
type MenuItem = { id: number; category_id: number; name: string; price: string; print_to: string };
type Category = { id: number; name: string; active_items: MenuItem[] };
type ActiveOrder = {
    id: number;
    status: string;
    subtotal: string;
    table?: Table;
    items: { id: number; quantity: number; subtotal: string; notes?: string | null; menu_item?: MenuItem }[];
} | null;
type XenditPayment = { id: number; external_id: string; status: string; xendit_raw_response?: Record<string, unknown> | null } | null;
type CartItem = { menu_item_id: number; name: string; quantity: number; notes: string; price: number };
type Props = { tables: Table[]; categories: Category[]; activeOrder: ActiveOrder; xenditPayment: XenditPayment };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'POS', href: '/pos' }];

export default function PosIndex({ tables, categories, activeOrder, xenditPayment }: Props) {
    const { flash } = usePage<SharedData>().props;
    const [selectedTableId, setSelectedTableId] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const allItems = useMemo(() => categories.flatMap((category) => category.active_items), [categories]);
    const selectedTable = tables.find((table) => String(table.id) === selectedTableId);

    const form = useForm({
        table_id: '',
        notes: '',
        items: [] as { menu_item_id: number; quantity: number; notes?: string }[],
    });
    const cashForm = useForm({ amount_paid: activeOrder ? Number(activeOrder.subtotal) : 0, notes: '' });

    function addItem(menuItem: MenuItem) {
        const price = Number(menuItem.price);
        setCart((current) => {
            const existing = current.find((item) => item.menu_item_id === menuItem.id);
            if (existing) {
                return current.map((item) => (item.menu_item_id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item));
            }

            return [...current, { menu_item_id: menuItem.id, name: menuItem.name, quantity: 1, notes: '', price }];
        });
    }

    function updateQuantity(menuItemId: number, delta: number) {
        setCart((current) => current
            .map((item) => (item.menu_item_id === menuItemId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
            .filter((item) => item.quantity > 0));
    }

    function removeItem(menuItemId: number) {
        setCart((current) => current.filter((item) => item.menu_item_id !== menuItemId));
    }

    function submitDraft(event: FormEvent) {
        event.preventDefault();
        const payload = {
            table_id: Number(selectedTableId),
            notes: form.data.notes,
            items: cart.map((item) => ({ menu_item_id: item.menu_item_id, quantity: item.quantity, notes: item.notes || undefined })),
        };

        form.transform(() => payload).post('/pos/orders', {
            preserveScroll: true,
            onSuccess: () => {
                setCart([]);
                setSelectedTableId('');
                form.reset();
            },
        });
    }

    const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="POS Kasir" />
            <main className="grid flex-1 gap-4 p-4 xl:grid-cols-[1fr_400px]">
                <section className="space-y-4">
                    <div>
                        <h1 className="text-2xl font-semibold">POS Kasir</h1>
                        <p className="text-sm text-muted-foreground">Pilih meja, susun cart, lalu submit order ke station.</p>
                    </div>
                    {flash.error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{flash.error}</div>}
                    {flash.success && <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700">{flash.success}</div>}

                    <Card className="rounded-md">
                        <CardHeader><CardTitle className="text-base">Meja</CardTitle></CardHeader>
                        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {tables.map((table) => (
                                <button
                                    key={table.id}
                                    type="button"
                                    onClick={() => setSelectedTableId(String(table.id))}
                                    className={`rounded-md border p-3 text-left text-sm transition hover:bg-muted/60 ${selectedTableId === String(table.id) ? 'border-primary bg-primary/10' : ''}`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium">{table.name}</span>
                                        <Badge variant={table.zone?.assignment ? 'outline' : 'destructive'}>{table.zone?.name ?? '-'}</Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">{table.status}</p>
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="rounded-md">
                        <CardHeader><CardTitle className="text-base">Menu</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {categories.map((category) => (
                                <div key={category.id}>
                                    <h2 className="mb-2 text-sm font-semibold">{category.name}</h2>
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {category.active_items.map((item) => (
                                            <button key={item.id} type="button" onClick={() => addItem(item)} className="rounded-md border p-3 text-left text-sm hover:bg-muted/60">
                                                <span className="block font-medium">{item.name}</span>
                                                <span className="text-xs text-muted-foreground">Rp {Number(item.price).toLocaleString('id-ID')} · {item.print_to}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {allItems.length === 0 && <p className="text-sm text-muted-foreground">Belum ada menu tersedia.</p>}
                        </CardContent>
                    </Card>
                </section>

                <aside className="space-y-4">
                    <form onSubmit={submitDraft} className="rounded-md border p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-base font-semibold"><ShoppingCart className="size-4" />Cart</h2>
                            <Badge variant="secondary">Rp {cartTotal.toLocaleString('id-ID')}</Badge>
                        </div>
                        <div className="grid gap-3">
                            <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                                <SelectTrigger><SelectValue placeholder="Pilih meja" /></SelectTrigger>
                                <SelectContent>{tables.map((table) => <SelectItem key={table.id} value={String(table.id)}>{table.name} · {table.zone?.name ?? '-'}</SelectItem>)}</SelectContent>
                            </Select>
                            {selectedTable && !selectedTable.zone?.assignment && <p className="text-sm text-destructive">Zona meja belum dikonfigurasi.</p>}
                            {cart.map((item) => (
                                <div key={item.menu_item_id} className="rounded-md border p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium">{item.name}</span>
                                        <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(item.menu_item_id)}><Trash2 className="size-4" /></Button>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <Button type="button" size="icon" variant="outline" onClick={() => updateQuantity(item.menu_item_id, -1)}><Minus className="size-4" /></Button>
                                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                                        <Button type="button" size="icon" variant="outline" onClick={() => updateQuantity(item.menu_item_id, 1)}><Plus className="size-4" /></Button>
                                        <span className="ml-auto text-sm">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            ))}
                            <Input value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} placeholder="Catatan order" />
                            <Button type="submit" disabled={!selectedTableId || cart.length === 0 || form.processing}><ShoppingCart />Simpan Draft</Button>
                        </div>
                    </form>

                    {activeOrder && (
                        <Card className="rounded-md">
                            <CardHeader><CardTitle className="text-base">Draft #{activeOrder.id}</CardTitle></CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <p>{activeOrder.table?.name} · Rp {Number(activeOrder.subtotal).toLocaleString('id-ID')}</p>
                                {activeOrder.items.map((item) => (
                                    <div key={item.id} className="flex justify-between border-b pb-2">
                                        <span>{item.menu_item?.name}</span>
                                        <span>x{item.quantity}</span>
                                    </div>
                                ))}
                                <Button type="button" className="w-full" onClick={() => router.post(`/pos/orders/${activeOrder.id}/submit`, {}, { preserveScroll: true })}><Send />Submit Order</Button>
                                <div className="border-t pt-3">
                                    <h3 className="mb-2 text-sm font-semibold">Payment Cash</h3>
                                    <Input type="number" value={cashForm.data.amount_paid} onChange={(event) => cashForm.setData('amount_paid', Number(event.target.value))} placeholder="Nominal bayar" />
                                    <p className="mt-1 text-xs text-muted-foreground">Kembalian dihitung server-side saat pembayaran disimpan.</p>
                                    <Button type="button" className="mt-2 w-full" variant="outline" onClick={() => cashForm.post(`/pos/orders/${activeOrder.id}/pay`, { preserveScroll: true })}>Bayar Cash</Button>
                                </div>
                                <div className="border-t pt-3">
                                    <h3 className="mb-2 text-sm font-semibold">Payment QRIS</h3>
                                    <Button type="button" className="w-full" variant="outline" onClick={() => router.post(`/pos/orders/${activeOrder.id}/xendit`, {}, { preserveScroll: true })}>Generate QRIS Xendit</Button>
                                    {xenditPayment && (
                                        <div className="mt-3 rounded-md border p-3">
                                            <p className="text-xs font-medium">External ID</p>
                                            <p className="break-all text-xs text-muted-foreground">{xenditPayment.external_id}</p>
                                            <p className="mt-2 text-xs font-medium">Status</p>
                                            <Badge variant="outline">{xenditPayment.status}</Badge>
                                            {typeof xenditPayment.xendit_raw_response?.qr_string === 'string' && (
                                                <>
                                                    <div className="mt-3 rounded-md bg-white p-3">
                                                        <QRCodeSVG value={xenditPayment.xendit_raw_response.qr_string} size={220} className="mx-auto" />
                                                    </div>
                                                    <p className="mt-2 text-xs font-medium">QR String</p>
                                                    <p className="break-all text-xs text-muted-foreground">{xenditPayment.xendit_raw_response.qr_string}</p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </aside>
            </main>
        </AppLayout>
    );
}
