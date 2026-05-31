import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, ChevronDown, ChevronRight, Minus, Plus, ReceiptText, Send, ShoppingCart, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Table = {
    id: number;
    name: string;
    status: string;
    zone?: { id: number; name: string; color_hex: string; assignment?: unknown | null };
};
type MenuItem = { id: number; category_id: number; name: string; price: string; print_to: string };
type Category = { id: number; name: string; active_items: MenuItem[] };
type ActiveOrderItem = { id: number; quantity: number; unit_price?: string; subtotal: string; status: string; notes?: string | null; menu_item?: MenuItem };
type ActiveOrder = {
    id: number;
    status: string;
    subtotal: string;
    total_amount: string;
    table?: Table;
    items: ActiveOrderItem[];
} | null;
type OpenOrder = {
    id: number;
    table?: { id: number; name: string } | null;
    status: string;
    total_amount: string;
    created_at: string;
};
type XenditPayment = { id: number; transaction_id: number; external_id: string; status: string; xendit_raw_response?: Record<string, unknown> | null } | null;
type CartItem = { menu_item_id: number; name: string; quantity: number; notes: string; price: number };
type BillMode = 'open_bill' | 'close_bill';
type CartTarget = 'close_bill' | 'open_bill' | `bill:${number}`;
type Props = { tables: Table[]; openOrders: OpenOrder[]; categories: Category[]; activeOrder: ActiveOrder; xenditPayment: XenditPayment };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'POS', href: '/pos' }];
const money = (value: number | string) => Number(value || 0).toLocaleString('id-ID');
const printTargetLabels: Record<string, string> = {
    kitchen: 'Kitchen',
    bar: 'Bar',
    kitchen_bar: 'Kitchen & Bar',
    kasir: 'Kasir',
};

type GroupedOpenBillLine = ActiveOrderItem & {
    ids: number[];
};

type GroupedOpenBillSection = {
    label: string;
    items: GroupedOpenBillLine[];
};

function groupOpenBillItems(items: ActiveOrderItem[]): GroupedOpenBillSection[] {
    const sections = new Map<string, GroupedOpenBillLine[]>();

    for (const item of items) {
        const target = item.menu_item?.print_to ?? 'kasir';
        const label = printTargetLabels[target] ?? target;
        const unitPrice = item.unit_price ?? item.menu_item?.price ?? '0';
        const key = [target, item.menu_item?.id ?? item.menu_item?.name ?? 'item', unitPrice, item.notes ?? '', item.status].join('|');
        const sectionItems = sections.get(label) ?? [];
        const existing = sectionItems.find((line) => [target, line.menu_item?.id ?? line.menu_item?.name ?? 'item', line.unit_price ?? line.menu_item?.price ?? '0', line.notes ?? '', line.status].join('|') === key);

        if (existing) {
            existing.ids.push(item.id);
            existing.quantity += item.quantity;
            existing.subtotal = String(Number(existing.subtotal) + Number(item.subtotal));
        } else {
            sectionItems.push({ ...item, unit_price: unitPrice, ids: [item.id] });
        }

        sections.set(label, sectionItems);
    }

    const order = ['Kitchen', 'Bar', 'Kitchen & Bar', 'Kasir'];

    return Array.from(sections.entries())
        .map(([label, groupedItems]) => ({ label, items: groupedItems }))
        .sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
}

export default function PosIndex({ tables, openOrders, categories, activeOrder, xenditPayment }: Props) {
    const { flash } = usePage<SharedData>().props;
    const [selectedTableId, setSelectedTableId] = useState('');
    const [cartTarget, setCartTarget] = useState<CartTarget>('close_bill');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [itemNotice, setItemNotice] = useState('');
    const [showOpenBill, setShowOpenBill] = useState(Boolean(activeOrder));
    const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0] ? String(categories[0].id) : '');
    const orderableTables = useMemo(() => tables.filter((table) => ['available', 'occupied'].includes(table.status)), [tables]);
    const selectedCategory = categories.find((category) => String(category.id) === selectedCategoryId) ?? categories[0];
    const selectedTable = tables.find((table) => String(table.id) === selectedTableId);
    const activeOrderTotal = activeOrder ? Number(activeOrder.total_amount ?? activeOrder.subtotal) : 0;
    const pendingActiveItems = activeOrder?.items.filter((item) => item.status === 'pending') ?? [];
    const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    const activeOrderSections = useMemo(() => groupOpenBillItems(activeOrder?.items ?? []), [activeOrder?.items]);
    const selectedCartOrderId = cartTarget.startsWith('bill:') ? Number(cartTarget.replace('bill:', '')) : null;
    const selectedCartOrder = openOrders.find((order) => order.id === selectedCartOrderId);
    const isXenditPaid = String(xenditPayment?.status ?? '').toLowerCase() === 'paid';

    const form = useForm({
        table_id: '',
        notes: '',
        bill_mode: 'open_bill' as BillMode,
        amount_paid: 0,
        items: [] as { menu_item_id: number; quantity: number; notes?: string }[],
    });
    const cashForm = useForm({ amount_paid: activeOrderTotal, notes: '' });
    const [closeBillAmount, setCloseBillAmount] = useState(0);
    const closeBillChange = Math.max(0, Number(closeBillAmount || 0) - cartTotal);
    const activeCashPaid = Number(cashForm.data.amount_paid || 0);
    const activeCashChange = Math.max(0, activeCashPaid - activeOrderTotal);

    useEffect(() => {
        if (activeOrder) {
            cashForm.setData('amount_paid', activeOrderTotal);
            setShowOpenBill(true);
        }
    }, [activeOrder?.id, activeOrderTotal]);

    useEffect(() => {
        if (cartTarget === 'close_bill' && closeBillAmount < cartTotal) {
            setCloseBillAmount(cartTotal);
        }
    }, [cartTarget, cartTotal]);

    useEffect(() => {
        if (!itemNotice) {
            return;
        }

        const timer = window.setTimeout(() => setItemNotice(''), 1800);

        return () => window.clearTimeout(timer);
    }, [itemNotice]);

    function addItem(menuItem: MenuItem) {
        const price = Number(menuItem.price);
        setCart((current) => {
            const existing = current.find((item) => item.menu_item_id === menuItem.id);
            if (existing) {
                return current.map((item) => (item.menu_item_id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item));
            }

            return [...current, { menu_item_id: menuItem.id, name: menuItem.name, quantity: 1, notes: '', price }];
        });
        setItemNotice(`${menuItem.name} berhasil ditambahkan.`);
    }

    function updateQuantity(menuItemId: number, delta: number) {
        setCart((current) =>
            current
                .map((item) => (item.menu_item_id === menuItemId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
                .filter((item) => item.quantity > 0),
        );
    }

    function removeItem(menuItemId: number) {
        setCart((current) => current.filter((item) => item.menu_item_id !== menuItemId));
    }

    function submitOrder(event: FormEvent) {
        event.preventDefault();
        const items = cart.map((item) => ({ menu_item_id: item.menu_item_id, quantity: item.quantity, notes: item.notes || undefined }));

        if (selectedCartOrderId) {
            form.transform(() => ({ items }));
            form.post(`/pos/orders/${selectedCartOrderId}/items/submit`, {
                preserveScroll: true,
                onSuccess: () => {
                    setCart([]);
                    form.reset();
                },
            });

            return;
        }

        const billMode: BillMode = cartTarget === 'close_bill' ? 'close_bill' : 'open_bill';
        const payload = {
            table_id: Number(selectedTableId),
            notes: form.data.notes,
            bill_mode: billMode,
            amount_paid: billMode === 'close_bill' ? Number(closeBillAmount || 0) : undefined,
            items,
        };
        const endpoint = billMode === 'close_bill' ? '/pos/orders/close-bill' : '/pos/orders';

        form.transform(() => payload);
        form.post(endpoint, {
            preserveScroll: true,
            onSuccess: () => {
                setCart([]);
                setSelectedTableId('');
                setCartTarget('close_bill');
                setCloseBillAmount(0);
                form.reset();
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="POS Kasir" />
            <main className="grid flex-1 gap-4 p-4 xl:grid-cols-[1fr_420px]">
                <section className="space-y-4">
                    <div>
                        <h1 className="text-2xl font-semibold">POS Kasir</h1>
                        <p className="text-sm text-muted-foreground">Pilih meja kosong dari dropdown, pilih kategori menu, lalu simpan open bill atau close bill langsung.</p>
                    </div>
                    {flash.error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{flash.error}</div>}
                    {flash.success && <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700">{flash.success}</div>}
                    {itemNotice && (
                        <div className="fixed right-4 top-4 z-50 rounded-md border border-emerald-500/40 bg-background px-4 py-3 text-sm text-emerald-700 shadow-lg">
                            {itemNotice}
                        </div>
                    )}

                    <Card className="rounded-md">
                        <CardHeader>
                            <CardTitle className="text-base">Menu</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={String(category.id)}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {selectedCategory ? (
                                <div>
                                    <h2 className="mb-2 text-sm font-semibold">{selectedCategory.name}</h2>
                                    {selectedCategory.active_items.length > 0 ? (
                                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {selectedCategory.active_items.map((item) => (
                                                <button key={item.id} type="button" onClick={() => addItem(item)} className="rounded-md border p-3 text-left text-sm hover:bg-muted/60">
                                                    <span className="block font-medium">{item.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Rp {money(item.price)} - {item.print_to}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Belum ada menu tersedia di kategori ini.</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Belum ada kategori menu tersedia.</p>
                            )}
                        </CardContent>
                    </Card>
                </section>

                <aside className="space-y-4">
                    <Card className="rounded-md">
                        <CardHeader>
                            <button type="button" className="flex items-center justify-between text-left" onClick={() => setShowOpenBill((current) => !current)}>
                                <CardTitle className="text-base">Open Bill</CardTitle>
                                {showOpenBill ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </button>
                        </CardHeader>
                        {showOpenBill && (
                            <CardContent>
                                <Select value={activeOrder ? String(activeOrder.id) : ''} onValueChange={(orderId) => router.visit(`/pos?order=${orderId}`)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Buka pesanan yang belum selesai" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {openOrders.map((order) => (
                                            <SelectItem key={order.id} value={String(order.id)}>
                                                #{order.id} - {order.table?.name ?? '-'} - {order.status} - Rp {money(order.total_amount)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {openOrders.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Tidak ada open bill.</p>}

                                {activeOrder && (
                                    <div className="mt-4 space-y-3 rounded-md border p-3 text-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <p>
                                                {activeOrder.table?.name} - Rp {money(activeOrderTotal)}
                                            </p>
                                            <Badge variant={activeOrder.status === 'submitted' ? 'default' : 'secondary'}>{activeOrder.status}</Badge>
                                        </div>
                                        {activeOrderSections.map((section) => (
                                            <div key={section.label} className="space-y-2 rounded-md border bg-background p-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold uppercase text-muted-foreground">{section.label}</span>
                                                    <Badge variant="outline">{section.items.length}</Badge>
                                                </div>
                                                {section.items.map((item) => (
                                                    <div key={item.ids.join('-')} className="border-t pt-2">
                                                        <div className="flex justify-between gap-2">
                                                            <span className="font-medium">{item.menu_item?.name}</span>
                                                            <span className="flex items-center gap-2">
                                                                <Badge variant={item.status === 'pending' ? 'destructive' : 'outline'}>{item.status}</Badge>
                                                                x{item.quantity}
                                                            </span>
                                                        </div>
                                                        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                                                            <span>{money(item.unit_price ?? item.menu_item?.price ?? 0)} / item</span>
                                                            <span>Rp {money(item.subtotal)}</span>
                                                        </div>
                                                        {item.notes && <p className="mt-1 text-xs text-muted-foreground">Catatan: {item.notes}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            className="w-full"
                                            disabled={!['open', 'submitted'].includes(activeOrder.status) || pendingActiveItems.length === 0}
                                            onClick={() => router.post(`/pos/orders/${activeOrder.id}/submit`, {}, { preserveScroll: true })}
                                        >
                                            <Send />
                                            Cetak ke Kitchen/Bar
                                        </Button>
                                        <div className="rounded-md border bg-muted/30 p-3">
                                            <h3 className="mb-3 text-sm font-semibold">Payment Cash</h3>
                                            <div className="grid gap-2">
                                                <div className="flex justify-between">
                                                    <span>Total tagihan</span>
                                                    <strong>Rp {money(activeOrderTotal)}</strong>
                                                </div>
                                                <Input type="number" value={cashForm.data.amount_paid} onChange={(event) => cashForm.setData('amount_paid', Number(event.target.value))} placeholder="Uang pelanggan" />
                                                <div className="flex justify-between">
                                                    <span>Uang pelanggan</span>
                                                    <strong>Rp {money(activeCashPaid)}</strong>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Kembalian</span>
                                                    <strong>Rp {money(activeCashChange)}</strong>
                                                </div>
                                            </div>
                                            {activeOrder.status !== 'submitted' && <p className="mt-2 text-xs text-destructive">Cetak ke Kitchen/Bar dulu sebelum pembayaran.</p>}
                                            {pendingActiveItems.length > 0 && <p className="mt-2 text-xs text-destructive">Masih ada item baru yang belum dicetak ke Kitchen/Bar.</p>}
                                            <Button
                                                type="button"
                                                className="mt-3 w-full"
                                                variant="outline"
                                                disabled={activeOrder.status !== 'submitted' || pendingActiveItems.length > 0 || activeCashPaid < activeOrderTotal || cashForm.processing}
                                                onClick={() => cashForm.post(`/pos/orders/${activeOrder.id}/pay`)}
                                            >
                                                Bayar Cash & Cetak Struk
                                            </Button>
                                        </div>
                                        <div className="border-t pt-3">
                                            <h3 className="mb-2 text-sm font-semibold">Payment QRIS</h3>
                                            <Button
                                                type="button"
                                                className="w-full"
                                                variant="outline"
                                                disabled={activeOrder.status !== 'submitted' || pendingActiveItems.length > 0}
                                                onClick={() => router.post(`/pos/orders/${activeOrder.id}/xendit`, {}, { preserveScroll: true })}
                                            >
                                                Generate QRIS Xendit
                                            </Button>
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
                                                    {isXenditPaid ? (
                                                        <div className="mt-3 overflow-hidden rounded-md border border-emerald-500/40 bg-emerald-50 p-4 text-center">
                                                            <div className="relative mx-auto flex size-14 items-center justify-center">
                                                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-30" />
                                                                <span className="relative flex size-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                                                                    <CheckCircle2 className="size-7" />
                                                                </span>
                                                            </div>
                                                            <p className="mt-3 text-sm font-semibold text-emerald-900">You've just tested Pay using QRIS Xendit</p>
                                                            <p className="mt-1 text-xs text-emerald-700">Pembayaran berhasil dikonfirmasi dan transaksi sudah paid.</p>
                                                            <Button
                                                                type="button"
                                                                className="mt-4 w-full"
                                                                onClick={() => router.visit(`/pos/transactions/${xenditPayment.transaction_id}/receipt`)}
                                                            >
                                                                <ReceiptText />
                                                                Cetak Struk
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            className="mt-3 w-full"
                                                            variant="secondary"
                                                            onClick={() => router.post(`/pos/orders/${activeOrder.id}/xendit/${xenditPayment.id}/simulate`, {}, { preserveScroll: true })}
                                                        >
                                                            Simulasi Bayar QRIS
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>

                    <form onSubmit={submitOrder} className="rounded-md border p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-base font-semibold">
                                <ShoppingCart className="size-4" />
                                Cart
                            </h2>
                            <Badge variant="secondary">Rp {money(cartTotal)}</Badge>
                        </div>
                        <div className="grid gap-3">
                            <Select value={cartTarget} onValueChange={(value) => setCartTarget(value as CartTarget)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="close_bill">Close Bill - bayar sekarang</SelectItem>
                                    <SelectItem value="open_bill">Open Bill Baru - bayar nanti</SelectItem>
                                    {openOrders.map((order) => (
                                        <SelectItem key={order.id} value={`bill:${order.id}`}>
                                            Tambah ke #{order.id} - {order.table?.name ?? '-'} - Rp {money(order.total_amount)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {selectedCartOrder ? (
                                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                                    <p className="font-medium">Tambah ke Open Bill #{selectedCartOrder.id}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedCartOrder.table?.name ?? 'Meja'} - item langsung dicetak ke Kitchen/Bar setelah disimpan.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih meja" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {orderableTables.map((table) => (
                                                <SelectItem key={table.id} value={String(table.id)}>
                                                    {table.name} - {table.zone?.name ?? '-'} - {table.status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {orderableTables.length === 0 && <p className="text-sm text-destructive">Tidak ada meja yang bisa dipesan. Buka open bill yang ada atau pilih meja lain.</p>}
                                    {selectedTable && !selectedTable.zone?.assignment && <p className="text-sm text-destructive">Zona meja belum dikonfigurasi.</p>}
                                </>
                            )}

                            {cart.map((item) => (
                                <div key={item.menu_item_id} className="rounded-md border p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium">{item.name}</span>
                                        <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(item.menu_item_id)}>
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <Button type="button" size="icon" variant="outline" onClick={() => updateQuantity(item.menu_item_id, -1)}>
                                            <Minus className="size-4" />
                                        </Button>
                                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                                        <Button type="button" size="icon" variant="outline" onClick={() => updateQuantity(item.menu_item_id, 1)}>
                                            <Plus className="size-4" />
                                        </Button>
                                        <span className="ml-auto text-sm">Rp {money(item.price * item.quantity)}</span>
                                    </div>
                                </div>
                            ))}
                            <Input value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} placeholder="Catatan order" />

                            {cartTarget === 'close_bill' && (
                                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                                    <div className="grid gap-2">
                                        <div className="flex justify-between">
                                            <span>Total tagihan</span>
                                            <strong>Rp {money(cartTotal)}</strong>
                                        </div>
                                        <Input type="number" value={closeBillAmount} onChange={(event) => setCloseBillAmount(Number(event.target.value))} placeholder="Uang pelanggan" />
                                        <div className="flex justify-between">
                                            <span>Uang pelanggan</span>
                                            <strong>Rp {money(closeBillAmount)}</strong>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Kembalian</span>
                                            <strong>Rp {money(closeBillChange)}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={
                                    (!selectedCartOrder && !selectedTableId) ||
                                    cart.length === 0 ||
                                    form.processing ||
                                    (cartTarget === 'close_bill' && Number(closeBillAmount || 0) < cartTotal)
                                }
                            >
                                <ShoppingCart />
                                {selectedCartOrder ? 'Tambah & Cetak Kitchen/Bar' : cartTarget === 'close_bill' ? 'Close Bill & Cetak Struk' : 'Simpan Open Bill'}
                            </Button>
                        </div>
                    </form>

                </aside>
            </main>
        </AppLayout>
    );
}
