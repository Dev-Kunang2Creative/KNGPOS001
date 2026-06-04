import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Banknote,
    Bell,
    ChefHat,
    CheckCircle2,
    ChevronRight,
    CreditCard,
    GlassWater,
    Minus,
    Plus,
    Printer,
    QrCode,
    ReceiptText,
    Send,
    ShoppingCart,
    Trash2,
    XCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

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
type OpenOrder = { id: number; table?: { id: number; name: string } | null; status: string; total_amount: string; created_at: string };
type XenditPayment = { id: number; transaction_id: number; external_id: string; status: string; xendit_raw_response?: Record<string, unknown> | null } | null;
type CartItem = { menu_item_id: number; name: string; quantity: number; notes: string; price: number };
type PendingSelfOrderItem = {
    id: number;
    menu_item_id: number;
    quantity: number;
    subtotal: string;
    notes?: string | null;
    menu_item?: { id: number; name: string; price?: string; print_to?: string };
    name?: string | null;
};
type PendingSelfOrder = {
    id: number;
    self_order_id?: number;
    table_id: number;
    table_name?: string | null;
    zone_name?: string | null;
    customer_name?: string | null;
    customer_email?: string | null;
    payment_preference?: 'qris' | 'cashier';
    notes?: string | null;
    total_amount: string;
    created_at: string;
    table?: { id: number; name: string; zone?: { id: number; name: string } | null };
    items: PendingSelfOrderItem[];
};
type PaidSelfOrderReceipt = PendingSelfOrder & {
    order_id: number;
    order?: { id: number; transaction?: { id: number; payment_method: string; amount_paid: string; status: string; paid_at?: string | null } | null } | null;
};
type StationTicketSummary = {
    id: number;
    type: 'kitchen' | 'bar';
    order_id: number;
    station_name?: string | null;
    table_name?: string | null;
    zone_name?: string | null;
    sent_at?: string | null;
    printed_at?: string | null;
};
type BillMode = 'open_bill' | 'close_bill';
type CartTarget = 'close_bill' | 'open_bill' | `bill:${number}`;
type CashierPanel = 'cart' | 'bills' | 'self_order' | 'station_print' | 'station_history';
type CloseBillPaymentMethod = 'cash' | 'qris';
type Props = {
    tables: Table[];
    openOrders: OpenOrder[];
    categories: Category[];
    activeOrder: ActiveOrder;
    xenditPayment: XenditPayment;
    pendingSelfOrders: PendingSelfOrder[];
    paidSelfOrderReceipts: PaidSelfOrderReceipt[];
    pendingStationTickets: StationTicketSummary[];
    stationTicketHistory: StationTicketSummary[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'POS', href: '/pos' }];
const money = (v: number | string) => Number(v || 0).toLocaleString('id-ID');
const printTargetLabels: Record<string, string> = { kitchen: 'Kitchen', bar: 'Bar', kitchen_bar: 'Kitchen & Bar', kasir: 'Kasir' };

type GroupedOpenBillLine = ActiveOrderItem & { ids: number[] };
type GroupedOpenBillSection = { label: string; items: GroupedOpenBillLine[] };

function groupOpenBillItems(items: ActiveOrderItem[]): GroupedOpenBillSection[] {
    const sections = new Map<string, GroupedOpenBillLine[]>();
    for (const item of items) {
        const target = item.menu_item?.print_to ?? 'kasir';
        const label = printTargetLabels[target] ?? target;
        const unitPrice = item.unit_price ?? item.menu_item?.price ?? '0';
        const key = [target, item.menu_item?.id ?? item.menu_item?.name ?? 'item', unitPrice, item.notes ?? '', item.status].join('|');
        const sectionItems = sections.get(label) ?? [];
        const existing = sectionItems.find(
            (l) => [target, l.menu_item?.id ?? l.menu_item?.name ?? 'item', l.unit_price ?? l.menu_item?.price ?? '0', l.notes ?? '', l.status].join('|') === key,
        );
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

export default function PosIndex({ tables, openOrders, categories, activeOrder, xenditPayment, pendingSelfOrders, paidSelfOrderReceipts, pendingStationTickets, stationTicketHistory }: Props) {
    const { flash } = usePage<SharedData>().props;
    const menuRef = useRef<HTMLElement>(null);
    const [selectedTableId, setSelectedTableId] = useState('');
    const [cartTarget, setCartTarget] = useState<CartTarget>('close_bill');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [itemNotice, setItemNotice] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0] ? String(categories[0].id) : '');
    const [selfOrders, setSelfOrders] = useState<PendingSelfOrder[]>(pendingSelfOrders);
    const [approvingAll, setApprovingAll] = useState(false);
    const [activePanel, setActivePanel] = useState<CashierPanel>(
        activeOrder ? 'bills' : pendingSelfOrders.length > 0 ? 'self_order' : pendingStationTickets.length > 0 ? 'station_print' : 'cart',
    );
    const orderableTables = useMemo(() => tables.filter((t) => ['available', 'occupied'].includes(t.status)), [tables]);
    const selectedCategory = categories.find((c) => String(c.id) === selectedCategoryId) ?? categories[0];
    const selectedTable = tables.find((t) => String(t.id) === selectedTableId);
    const activeOrderTotal = activeOrder ? Number(activeOrder.total_amount ?? activeOrder.subtotal) : 0;
    const pendingActiveItems = activeOrder?.items.filter((i) => i.status === 'pending') ?? [];
    const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const activeOrderSections = useMemo(() => groupOpenBillItems(activeOrder?.items ?? []), [activeOrder?.items]);
    const selectedCartOrderId = cartTarget.startsWith('bill:') ? Number(cartTarget.replace('bill:', '')) : null;
    const selectedCartOrder = openOrders.find((o) => o.id === selectedCartOrderId);
    const isXenditPaid = String(xenditPayment?.status ?? '').toLowerCase() === 'paid';
    const canPay = activeOrder?.status === 'submitted' && pendingActiveItems.length === 0;

    const form = useForm({ table_id: '', notes: '', bill_mode: 'open_bill' as BillMode, amount_paid: 0, items: [] as { menu_item_id: number; quantity: number; notes?: string }[] });
    const cashForm = useForm({ amount_paid: activeOrderTotal, notes: '' });
    const [closeBillPaymentMethod, setCloseBillPaymentMethod] = useState<CloseBillPaymentMethod>('cash');
    const [closeBillAmount, setCloseBillAmount] = useState(0);
    const closeBillChange = Math.max(0, Number(closeBillAmount || 0) - cartTotal);
    const activeCashPaid = Number(cashForm.data.amount_paid || 0);
    const activeCashChange = Math.max(0, activeCashPaid - activeOrderTotal);

    const cashierPanels: { key: CashierPanel; label: string; icon: typeof ShoppingCart; count?: number }[] = [
        { key: 'cart', label: 'Pesanan', icon: ShoppingCart, count: cart.length || undefined },
        { key: 'bills', label: 'Tagihan', icon: ReceiptText, count: openOrders.length || undefined },
        { key: 'self_order', label: 'Self Order', icon: Bell, count: (selfOrders.length + paidSelfOrderReceipts.length) || undefined },
        { key: 'station_print', label: 'Dapur/Bar', icon: Printer, count: pendingStationTickets.length || undefined },
        { key: 'station_history', label: 'Riwayat', icon: ReceiptText },
    ];

    useEffect(() => { setSelfOrders(pendingSelfOrders); }, [pendingSelfOrders]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            if (document.hidden || form.processing || cashForm.processing) return;
            router.reload({ only: ['pendingSelfOrders', 'paidSelfOrderReceipts', 'pendingStationTickets', 'stationTicketHistory', 'openOrders'], preserveScroll: true, preserveState: true });
        }, 7000);
        return () => window.clearInterval(interval);
    }, [form.processing, cashForm.processing]);

    useEffect(() => { if (activeOrder) cashForm.setData('amount_paid', activeOrderTotal); }, [activeOrder?.id, activeOrderTotal]);

    useEffect(() => { if (cartTarget === 'close_bill' && closeBillAmount < cartTotal) setCloseBillAmount(cartTotal); }, [cartTarget, cartTotal]);

    useEffect(() => {
        if (!itemNotice) return;
        const t = window.setTimeout(() => setItemNotice(''), 1800);
        return () => window.clearTimeout(t);
    }, [itemNotice]);

    function addItem(menuItem: MenuItem) {
        setCart((cur) => {
            const ex = cur.find((i) => i.menu_item_id === menuItem.id);
            if (ex) return cur.map((i) => (i.menu_item_id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i));
            return [...cur, { menu_item_id: menuItem.id, name: menuItem.name, quantity: 1, notes: '', price: Number(menuItem.price) }];
        });
        setItemNotice(`${menuItem.name} ditambahkan.`);
    }

    function updateQuantity(menuItemId: number, delta: number) {
        setCart((cur) => cur.map((i) => (i.menu_item_id === menuItemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)).filter((i) => i.quantity > 0));
    }

    function removeItem(menuItemId: number) {
        setCart((cur) => cur.filter((i) => i.menu_item_id !== menuItemId));
    }

    function submitOrder(e: FormEvent) {
        e.preventDefault();
        const items = cart.map((i) => ({ menu_item_id: i.menu_item_id, quantity: i.quantity, notes: i.notes || undefined }));
        if (selectedCartOrderId) {
            form.transform(() => ({ items }));
            form.post(`/pos/orders/${selectedCartOrderId}/items/submit`, { preserveScroll: true, onSuccess: () => { setCart([]); form.reset(); } });
            return;
        }
        const billMode: BillMode = cartTarget === 'close_bill' ? 'close_bill' : 'open_bill';
        form.transform(() => ({
            table_id: Number(selectedTableId),
            notes: form.data.notes,
            bill_mode: billMode,
            payment_method: billMode === 'close_bill' ? closeBillPaymentMethod : undefined,
            amount_paid: billMode === 'close_bill' && closeBillPaymentMethod === 'cash' ? Number(closeBillAmount || 0) : undefined,
            items,
        }));
        form.post(billMode === 'close_bill' ? '/pos/orders/close-bill' : '/pos/orders', {
            preserveScroll: true,
            onSuccess: () => { setCart([]); setSelectedTableId(''); setCartTarget('close_bill'); setCloseBillPaymentMethod('cash'); setCloseBillAmount(0); form.reset(); },
        });
    }

    function approveSelfOrder(selfOrderId: number) {
        router.post(`/pos/self-orders/${selfOrderId}/approve`, {}, { preserveScroll: true });
    }

    function rejectSelfOrder(selfOrderId: number) {
        router.post(`/pos/self-orders/${selfOrderId}/reject`, {}, { preserveScroll: true, onSuccess: () => setSelfOrders((cur) => cur.filter((o) => o.id !== selfOrderId)) });
    }

    async function approveAllSelfOrders() {
        setApprovingAll(true);
        const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        await Promise.all(
            selfOrders.map((o) =>
                fetch(`/pos/self-orders/${o.id}/approve`, { method: 'POST', headers: { 'X-CSRF-TOKEN': token, 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } }),
            ),
        );
        setApprovingAll(false);
        router.reload({ only: ['pendingSelfOrders', 'paidSelfOrderReceipts'], preserveScroll: true, preserveState: true });
    }

    function printAllTickets() {
        pendingStationTickets.forEach((ticket, i) => setTimeout(() => window.open(stationTicketUrl(ticket), '_blank'), i * 400));
        setTimeout(
            () => router.reload({ only: ['pendingStationTickets', 'stationTicketHistory'], preserveScroll: true, preserveState: true }),
            pendingStationTickets.length * 400 + 2500,
        );
    }

    function printAllReceipts() {
        paidSelfOrderReceipts.forEach((so, i) => {
            const tx = so.order?.transaction;
            if (tx) setTimeout(() => window.open(`/pos/transactions/${tx.id}/receipt`, '_blank'), i * 400);
        });
    }

    function stationTicketUrl(ticket: StationTicketSummary, reprint = false) {
        const key = ticket.type === 'kitchen' ? 'kitchen_order' : 'bar_order';
        const params = new URLSearchParams({ [key]: String(ticket.id) });
        if (reprint) params.set('reprint', '1');
        return `/pos/orders/${ticket.order_id}/station-ticket?${params.toString()}`;
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="POS Kasir" />

            {itemNotice && (
                <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-background px-4 py-3 text-sm text-emerald-700 shadow-lg">
                    <CheckCircle2 className="size-4" />
                    {itemNotice}
                </div>
            )}

            {/* Floating cart bar on mobile */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-3 shadow-lg xl:hidden">
                    <button
                        type="button"
                        className="flex min-h-[52px] w-full items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground"
                        onClick={() => { setActivePanel('cart'); document.getElementById('cashier-panel')?.scrollIntoView({ behavior: 'smooth' }); }}
                    >
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="size-5" />
                            <span className="font-semibold">{cart.length} item ditambahkan</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold">Rp {money(cartTotal)}</span>
                            <ChevronRight className="size-4" />
                        </div>
                    </button>
                </div>
            )}

            <main className="flex flex-col gap-4 p-3 pb-24 xl:grid xl:grid-cols-[1fr_460px] xl:p-4 xl:pb-4">

                {/* ── RIGHT: Cashier Panel ── */}
                <aside id="cashier-panel" className="order-1 flex flex-col gap-3 xl:order-2">

                    {/* Flash messages */}
                    {flash.error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{flash.error}</div>}
                    {flash.success && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700">{flash.success}</div>}

                    {/* Urgent alerts */}
                    {(selfOrders.length > 0 || paidSelfOrderReceipts.length > 0 || pendingStationTickets.length > 0) && (
                        <div className="flex flex-col gap-2">
                            {selfOrders.length > 0 && (
                                <button type="button" className="flex min-h-[44px] items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100" onClick={() => setActivePanel('self_order')}>
                                    <Bell className="size-4 shrink-0 animate-pulse" />
                                    <span className="flex-1 text-left">{selfOrders.length} self order menunggu persetujuan</span>
                                    <ChevronRight className="size-4 shrink-0" />
                                </button>
                            )}
                            {paidSelfOrderReceipts.length > 0 && (
                                <button type="button" className="flex min-h-[44px] items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100" onClick={() => setActivePanel('self_order')}>
                                    <CheckCircle2 className="size-4 shrink-0" />
                                    <span className="flex-1 text-left">{paidSelfOrderReceipts.length} QRIS lunas, cetak struk</span>
                                    <ChevronRight className="size-4 shrink-0" />
                                </button>
                            )}
                            {pendingStationTickets.length > 0 && (
                                <button type="button" className="flex min-h-[44px] items-center gap-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-100" onClick={() => setActivePanel('station_print')}>
                                    <Printer className="size-4 shrink-0" />
                                    <span className="flex-1 text-left">{pendingStationTickets.length} tiket dapur/bar belum dicetak</span>
                                    <ChevronRight className="size-4 shrink-0" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Sticky tab navigation */}
                    <div className="sticky top-0 z-10 bg-background pb-1 pt-0">
                        <div className="grid grid-cols-5 gap-1 rounded-xl bg-muted p-1">
                            {cashierPanels.map((panel) => {
                                const Icon = panel.icon;
                                return (
                                    <button
                                        key={panel.key}
                                        type="button"
                                        className={`relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors ${activePanel === panel.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}`}
                                        onClick={() => setActivePanel(panel.key)}
                                    >
                                        <Icon className="size-4 shrink-0" />
                                        <span className="w-full truncate text-center leading-tight">{panel.label}</span>
                                        {Boolean(panel.count) && (
                                            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                                                {panel.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── PANEL: PESANAN BARU ── */}
                    {activePanel === 'cart' && (
                        <form onSubmit={submitOrder} className="space-y-4 rounded-xl border bg-card p-4">
                            <div className="flex items-center justify-between">
                                <h2 className="flex items-center gap-2 font-semibold">
                                    <ShoppingCart className="size-4" />
                                    Pesanan Baru
                                </h2>
                                {cart.length > 0 && <Badge variant="secondary">Rp {money(cartTotal)}</Badge>}
                            </div>

                            {/* Step 1: Tipe pesanan */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">1. Tipe Pesanan</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" className={`min-h-[64px] rounded-lg border-2 p-3 text-left text-sm transition-all ${cartTarget === 'close_bill' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`} onClick={() => setCartTarget('close_bill')}>
                                        <div className="flex items-center gap-2 font-semibold">
                                            <CreditCard className="size-4 text-primary" />
                                            Bayar Langsung
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">Bayar sekarang di kasir</p>
                                    </button>
                                    <button type="button" className={`min-h-[64px] rounded-lg border-2 p-3 text-left text-sm transition-all ${cartTarget === 'open_bill' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`} onClick={() => setCartTarget('open_bill')}>
                                        <div className="flex items-center gap-2 font-semibold">
                                            <ReceiptText className="size-4 text-primary" />
                                            Open Bill
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">Bayar nanti / tambah item lagi</p>
                                    </button>
                                </div>
                                {openOrders.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Tambah ke tagihan aktif:</p>
                                        {openOrders.map((order) => (
                                            <button
                                                key={order.id}
                                                type="button"
                                                className={`flex min-h-[44px] w-full items-center justify-between rounded-lg border-2 px-3 py-2 text-sm transition-all ${cartTarget === `bill:${order.id}` ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                                                onClick={() => setCartTarget(`bill:${order.id}` as CartTarget)}
                                            >
                                                <span className="font-medium">#{order.id} – {order.table?.name ?? '-'}</span>
                                                <span className="text-xs text-muted-foreground">Rp {money(order.total_amount)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Pilih Meja */}
                            {!selectedCartOrder && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2. Pilih Meja</p>
                                    <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                                        <SelectTrigger className="min-h-[44px]">
                                            <SelectValue placeholder="Pilih meja..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {orderableTables.map((t) => (
                                                <SelectItem key={t.id} value={String(t.id)}>
                                                    {t.name}{t.zone && ` – ${t.zone.name}`}{t.status === 'occupied' && ' (terisi)'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {orderableTables.length === 0 && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">Tidak ada meja tersedia.</p>}
                                    {selectedTable && !selectedTable.zone?.assignment && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">Zona meja belum dikonfigurasi.</p>}
                                </div>
                            )}
                            {selectedCartOrder && (
                                <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                                    <p className="font-medium">Tambah ke Tagihan #{selectedCartOrder.id}</p>
                                    <p className="text-xs text-muted-foreground">{selectedCartOrder.table?.name ?? '-'} – item langsung dicetak ke Dapur/Bar</p>
                                </div>
                            )}

                            {/* Step 3: Item */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">3. Item Pesanan</p>
                                    {/* Mobile: scroll to menu */}
                                    <button type="button" className="flex items-center gap-1 text-xs text-primary xl:hidden" onClick={() => menuRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                                        <Plus className="size-3" />
                                        Lihat Menu
                                    </button>
                                </div>
                                {cart.length === 0 ? (
                                    <div className="rounded-xl border-2 border-dashed p-6 text-center">
                                        <ShoppingCart className="mx-auto size-8 text-muted-foreground/40" />
                                        <p className="mt-2 text-sm text-muted-foreground">Pilih menu di bawah untuk menambah item.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {cart.map((item) => (
                                            <div key={item.menu_item_id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">{item.name}</p>
                                                    <p className="text-xs text-muted-foreground">Rp {money(item.price)} / item</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.menu_item_id, -1)}>
                                                        <Minus className="size-3" />
                                                    </Button>
                                                    <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                                                    <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.menu_item_id, 1)}>
                                                        <Plus className="size-3" />
                                                    </Button>
                                                </div>
                                                <span className="w-16 text-right text-sm font-semibold">Rp {money(item.price * item.quantity)}</span>
                                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.menu_item_id)}>
                                                    <Trash2 className="size-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        <div className="flex justify-between border-t pt-2 text-sm font-bold">
                                            <span>Total</span>
                                            <span>Rp {money(cartTotal)}</span>
                                        </div>
                                    </div>
                                )}
                                <Input value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} placeholder="Catatan order (opsional)" className="min-h-[44px]" />
                            </div>

                            {/* Step 4: Pembayaran */}
                            {cartTarget === 'close_bill' && cart.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">4. Metode Pembayaran</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg border-2 text-sm font-medium transition-all ${closeBillPaymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'}`} onClick={() => setCloseBillPaymentMethod('cash')}>
                                            <Banknote className="size-4" /> Cash
                                        </button>
                                        <button type="button" className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg border-2 text-sm font-medium transition-all ${closeBillPaymentMethod === 'qris' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'}`} onClick={() => setCloseBillPaymentMethod('qris')}>
                                            <QrCode className="size-4" /> QRIS
                                        </button>
                                    </div>
                                    {closeBillPaymentMethod === 'cash' && (
                                        <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Total tagihan</span>
                                                <strong>Rp {money(cartTotal)}</strong>
                                            </div>
                                            <Input type="number" value={closeBillAmount || ''} onChange={(e) => setCloseBillAmount(Number(e.target.value))} placeholder="Nominal uang pelanggan" className="min-h-[44px]" />
                                            {closeBillAmount > 0 && (
                                                <div className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2">
                                                    <span className="text-emerald-700">Kembalian</span>
                                                    <strong className="text-emerald-700">Rp {money(closeBillChange)}</strong>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {closeBillPaymentMethod === 'qris' && (
                                        <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">QRIS Xendit dibuat otomatis setelah pesanan disimpan.</p>
                                    )}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="min-h-[48px] w-full text-base"
                                disabled={(!selectedCartOrder && !selectedTableId) || cart.length === 0 || form.processing || (cartTarget === 'close_bill' && closeBillPaymentMethod === 'cash' && Number(closeBillAmount || 0) < cartTotal)}
                            >
                                <ShoppingCart className="size-4" />
                                {selectedCartOrder ? 'Tambah & Cetak ke Dapur/Bar' : cartTarget === 'close_bill' ? (closeBillPaymentMethod === 'qris' ? 'Bayar via QRIS' : 'Bayar Cash & Cetak Struk') : 'Simpan Open Bill'}
                            </Button>
                        </form>
                    )}

                    {/* ── PANEL: TAGIHAN AKTIF ── */}
                    {activePanel === 'bills' && (
                        <div className="space-y-4 rounded-xl border bg-card p-4">
                            <h2 className="flex items-center gap-2 font-semibold">
                                <ReceiptText className="size-4" />
                                Tagihan Aktif
                            </h2>
                            {openOrders.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Tidak ada tagihan aktif.</p>
                            ) : (
                                <Select value={activeOrder ? String(activeOrder.id) : ''} onValueChange={(id) => router.visit(`/pos?order=${id}`)}>
                                    <SelectTrigger className="min-h-[44px]">
                                        <SelectValue placeholder="Pilih tagihan..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {openOrders.map((o) => (
                                            <SelectItem key={o.id} value={String(o.id)}>#{o.id} – {o.table?.name ?? '-'} – Rp {money(o.total_amount)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {activeOrder && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                                        <div>
                                            <p className="font-semibold">{activeOrder.table?.name} · Rp {money(activeOrderTotal)}</p>
                                            <p className="text-xs text-muted-foreground">Order #{activeOrder.id}</p>
                                        </div>
                                        <Badge variant={activeOrder.status === 'submitted' ? 'default' : 'secondary'}>{activeOrder.status}</Badge>
                                    </div>

                                    {/* Flow steps */}
                                    <div className="space-y-2 rounded-lg border p-3">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alur Pembayaran</p>
                                        <div className={`flex items-start gap-2 ${pendingActiveItems.length > 0 ? '' : 'opacity-40'}`}>
                                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${pendingActiveItems.length > 0 ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>1</span>
                                            <div>
                                                <p className="text-sm font-medium">Kirim ke Dapur/Bar</p>
                                                <p className="text-xs text-muted-foreground">{pendingActiveItems.length > 0 ? `${pendingActiveItems.length} item belum dikirim` : 'Semua item sudah dikirim'}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-start gap-2 ${canPay ? '' : 'opacity-40'}`}>
                                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${canPay ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</span>
                                            <div>
                                                <p className="text-sm font-medium">Proses Pembayaran</p>
                                                <p className="text-xs text-muted-foreground">Cash atau QRIS</p>
                                            </div>
                                        </div>
                                    </div>

                                    {activeOrderSections.map((section) => (
                                        <div key={section.label}>
                                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</p>
                                            <div className="rounded-lg border bg-background">
                                                {section.items.map((item) => (
                                                    <div key={item.ids.join('-')} className="flex items-center gap-2 border-b px-3 py-2.5 last:border-0">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium">{item.menu_item?.name}</p>
                                                            {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                                                        </div>
                                                        <Badge variant={item.status === 'pending' ? 'destructive' : 'outline'} className="text-xs">{item.status}</Badge>
                                                        <span className="text-sm">×{item.quantity}</span>
                                                        <span className="w-20 text-right text-xs text-muted-foreground">Rp {money(item.subtotal)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <Button type="button" className="min-h-[44px] w-full" variant={pendingActiveItems.length > 0 ? 'default' : 'outline'} disabled={!['open', 'submitted'].includes(activeOrder.status) || pendingActiveItems.length === 0} onClick={() => router.post(`/pos/orders/${activeOrder.id}/submit`, {}, { preserveScroll: true })}>
                                        <Send className="size-4" />
                                        {pendingActiveItems.length > 0 ? `Kirim ${pendingActiveItems.length} Item ke Dapur/Bar` : 'Semua Item Sudah Dikirim'}
                                    </Button>

                                    <div className="space-y-3 rounded-lg border p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proses Pembayaran</p>
                                        {!canPay && (
                                            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700">
                                                <AlertCircle className="size-3 shrink-0" />
                                                {activeOrder.status !== 'submitted' ? 'Kirim ke Dapur/Bar dulu sebelum bayar.' : 'Ada item belum dikirim ke Dapur/Bar.'}
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                <Banknote className="size-3.5" /> Cash
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Total tagihan</span>
                                                <strong>Rp {money(activeOrderTotal)}</strong>
                                            </div>
                                            <Input type="number" value={cashForm.data.amount_paid} onChange={(e) => cashForm.setData('amount_paid', Number(e.target.value))} placeholder="Nominal uang pelanggan" className="min-h-[44px]" />
                                            {activeCashPaid >= activeOrderTotal && activeCashPaid > 0 && (
                                                <div className="flex justify-between rounded-lg bg-emerald-50 px-3 py-1.5 text-sm">
                                                    <span className="text-emerald-700">Kembalian</span>
                                                    <strong className="text-emerald-700">Rp {money(activeCashChange)}</strong>
                                                </div>
                                            )}
                                            <Button type="button" className="min-h-[44px] w-full" variant="outline" disabled={!canPay || activeCashPaid < activeOrderTotal || cashForm.processing} onClick={() => cashForm.post(`/pos/orders/${activeOrder.id}/pay`)}>
                                                Bayar Cash & Cetak Struk
                                            </Button>
                                        </div>
                                        <div className="space-y-2 border-t pt-3">
                                            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                <QrCode className="size-3.5" /> QRIS Xendit
                                            </div>
                                            <Button type="button" className="min-h-[44px] w-full" variant="outline" disabled={!canPay} onClick={() => router.post(`/pos/orders/${activeOrder.id}/xendit`, {}, { preserveScroll: true })}>
                                                Generate QRIS
                                            </Button>
                                            {xenditPayment && (
                                                <div className="space-y-2 rounded-lg border p-3">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs font-medium">Status QRIS</p>
                                                        <Badge variant={isXenditPaid ? 'default' : 'secondary'}>{isXenditPaid ? 'Lunas' : xenditPayment.status}</Badge>
                                                    </div>
                                                    {typeof xenditPayment.xendit_raw_response?.qr_string === 'string' && !isXenditPaid && (
                                                        <div className="rounded-lg bg-white p-3">
                                                            <QRCodeSVG value={xenditPayment.xendit_raw_response.qr_string as string} size={200} className="mx-auto" />
                                                        </div>
                                                    )}
                                                    {isXenditPaid ? (
                                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                                                            <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
                                                            <p className="mt-2 text-sm font-semibold text-emerald-800">Pembayaran QRIS berhasil!</p>
                                                            <Button type="button" className="mt-3 min-h-[44px] w-full" onClick={() => router.visit(`/pos/xendit/${xenditPayment.id}/success`)}>
                                                                <ReceiptText className="size-4" /> Buka & Cetak Struk
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button type="button" size="sm" className="min-h-[44px] w-full" variant="secondary" onClick={() => router.post(`/pos/orders/${activeOrder.id}/xendit/${xenditPayment.id}/simulate`, {}, { preserveScroll: true })}>
                                                            Simulasi Pembayaran
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PANEL: SELF ORDER ── */}
                    {activePanel === 'self_order' && (
                        <div className="space-y-4">
                            {paidSelfOrderReceipts.length > 0 && (
                                <div className="space-y-3 rounded-xl border bg-card p-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="flex items-center gap-2 font-semibold text-emerald-700">
                                            <CheckCircle2 className="size-4" /> QRIS Lunas – Cetak Struk
                                        </h2>
                                        <Badge>{paidSelfOrderReceipts.length}</Badge>
                                    </div>
                                    {paidSelfOrderReceipts.length > 1 && (
                                        <Button type="button" className="min-h-[44px] w-full" variant="outline" onClick={printAllReceipts}>
                                            <Printer className="size-4" /> Cetak Semua Struk ({paidSelfOrderReceipts.length})
                                        </Button>
                                    )}
                                    {paidSelfOrderReceipts.map((so) => {
                                        const tx = so.order?.transaction;
                                        return (
                                            <div key={`paid-${so.id}`} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-emerald-900">{so.table_name ?? so.table?.name ?? '-'}</p>
                                                        <p className="text-xs text-emerald-700">{so.customer_name} · Rp {money(so.total_amount)}</p>
                                                        {tx?.paid_at && <p className="text-xs text-emerald-600">{new Date(tx.paid_at).toLocaleString('id-ID')}</p>}
                                                    </div>
                                                    <Badge className="bg-emerald-600">Lunas</Badge>
                                                </div>
                                                <Button type="button" size="sm" className="mt-3 min-h-[44px] w-full" variant="outline" disabled={!tx} onClick={() => tx && router.visit(`/pos/transactions/${tx.id}/receipt`)}>
                                                    <ReceiptText className="size-4" /> Cetak Struk
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="space-y-3 rounded-xl border bg-card p-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="flex items-center gap-2 font-semibold">
                                        <Bell className="size-4" /> Menunggu Persetujuan
                                    </h2>
                                    {selfOrders.length > 0 && <Badge variant="destructive">{selfOrders.length}</Badge>}
                                </div>

                                {selfOrders.length === 0 && (
                                    <p className="text-sm text-muted-foreground">{paidSelfOrderReceipts.length === 0 ? 'Tidak ada self order saat ini.' : 'Tidak ada yang menunggu persetujuan.'}</p>
                                )}

                                {selfOrders.length > 1 && (
                                    <Button type="button" className="min-h-[44px] w-full" disabled={approvingAll} onClick={approveAllSelfOrders}>
                                        <CheckCircle2 className="size-4" />
                                        {approvingAll ? 'Memproses...' : `Terima Semua (${selfOrders.length})`}
                                    </Button>
                                )}

                                {selfOrders.map((so) => {
                                    const tableName = so.table_name ?? so.table?.name ?? '-';
                                    const isQris = so.payment_preference === 'qris';
                                    return (
                                        <div key={so.id} className="space-y-2 rounded-lg border p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold">{tableName}</p>
                                                    <p className="text-xs text-muted-foreground">{so.customer_name ?? 'Customer'} · Rp {money(so.total_amount)}</p>
                                                    {so.customer_email && <p className="text-xs text-muted-foreground">{so.customer_email}</p>}
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <Badge variant={isQris ? 'default' : 'secondary'}>
                                                        {isQris ? <><QrCode className="mr-1 size-3" />QRIS</> : <><Banknote className="mr-1 size-3" />Kasir</>}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">{so.items.length} item</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1 rounded-lg bg-muted/50 p-2">
                                                {so.items.map((item) => (
                                                    <div key={item.id} className="flex justify-between text-xs">
                                                        <span>{item.menu_item?.name ?? item.name}{item.notes && <span className="text-muted-foreground"> ({item.notes})</span>}</span>
                                                        <span className="font-medium">×{item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {so.notes && <p className="rounded bg-muted/40 px-2 py-1 text-xs text-muted-foreground">{so.notes}</p>}
                                            <p className={`rounded px-2 py-1 text-xs ${isQris ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {isQris ? 'Customer bayar via QRIS – setelah diterima, diarahkan ke halaman pembayaran.' : 'Customer bayar di kasir – setelah diterima, proses di tab Tagihan.'}
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button type="button" size="sm" className="min-h-[44px]" onClick={() => approveSelfOrder(so.id)}>
                                                    <CheckCircle2 className="size-4" /> Terima
                                                </Button>
                                                <Button type="button" size="sm" className="min-h-[44px] border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" variant="outline" onClick={() => rejectSelfOrder(so.id)}>
                                                    <XCircle className="size-4" /> Tolak
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── PANEL: CETAK DAPUR/BAR ── */}
                    {activePanel === 'station_print' && (
                        <div className="space-y-3 rounded-xl border bg-card p-4">
                            <div className="flex items-center justify-between">
                                <h2 className="flex items-center gap-2 font-semibold">
                                    <Printer className="size-4" /> Cetak Dapur/Bar
                                </h2>
                                {pendingStationTickets.length > 0 && <Badge variant="destructive">{pendingStationTickets.length}</Badge>}
                            </div>

                            {pendingStationTickets.length === 0 ? (
                                <div className="rounded-xl border-2 border-dashed p-8 text-center">
                                    <Printer className="mx-auto size-8 text-muted-foreground/40" />
                                    <p className="mt-2 text-sm text-muted-foreground">Tidak ada tiket yang menunggu cetak.</p>
                                </div>
                            ) : (
                                <>
                                    <Button type="button" className="min-h-[48px] w-full" onClick={printAllTickets}>
                                        <Printer className="size-4" />
                                        Cetak Semua ({pendingStationTickets.length} tiket)
                                    </Button>
                                    <p className="text-center text-xs text-muted-foreground">Atau cetak satu per satu di bawah</p>
                                    {pendingStationTickets.map((ticket) => (
                                        <div key={`${ticket.type}-${ticket.id}`} className="rounded-lg border p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="flex items-center gap-1.5 font-semibold">
                                                        {ticket.type === 'kitchen' ? <ChefHat className="size-4 text-orange-500" /> : <GlassWater className="size-4 text-blue-500" />}
                                                        {ticket.type === 'kitchen' ? 'Kitchen' : 'Bar'} – {ticket.station_name ?? '-'}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">Order #{ticket.order_id} · {ticket.table_name ?? '-'} · {ticket.zone_name ?? '-'}</p>
                                                    {ticket.sent_at && <p className="text-xs text-muted-foreground">{new Date(ticket.sent_at).toLocaleString('id-ID')}</p>}
                                                </div>
                                                <Badge variant="outline" className="border-amber-400 text-amber-600">Belum Cetak</Badge>
                                            </div>
                                            <Button type="button" size="sm" className="mt-3 min-h-[44px] w-full" variant="outline" onClick={() => router.visit(stationTicketUrl(ticket))}>
                                                <Printer className="size-4" /> Cetak Tiket
                                            </Button>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}

                    {/* ── PANEL: RIWAYAT CETAK ── */}
                    {activePanel === 'station_history' && (
                        <div className="space-y-3 rounded-xl border bg-card p-4">
                            <h2 className="flex items-center gap-2 font-semibold">
                                <ReceiptText className="size-4" /> Riwayat Cetak
                            </h2>
                            {stationTicketHistory.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Belum ada riwayat cetak.</p>
                            ) : (
                                stationTicketHistory.map((ticket) => (
                                    <div key={`history-${ticket.type}-${ticket.id}`} className="rounded-lg border p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="flex items-center gap-1.5 font-semibold">
                                                    {ticket.type === 'kitchen' ? <ChefHat className="size-4 text-orange-500" /> : <GlassWater className="size-4 text-blue-500" />}
                                                    {ticket.type === 'kitchen' ? 'Kitchen' : 'Bar'} – {ticket.station_name ?? '-'}
                                                </p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">Order #{ticket.order_id} · {ticket.table_name ?? '-'}</p>
                                                {ticket.printed_at && <p className="text-xs text-muted-foreground">Dicetak: {new Date(ticket.printed_at).toLocaleString('id-ID')}</p>}
                                            </div>
                                            <Badge variant="secondary" className="flex items-center gap-1">
                                                <CheckCircle2 className="size-3" /> Tercetak
                                            </Badge>
                                        </div>
                                        <Button type="button" size="sm" variant="outline" className="mt-3 min-h-[44px] w-full" onClick={() => router.visit(stationTicketUrl(ticket, true))}>
                                            <Printer className="size-4" /> Cetak Ulang
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </aside>

                {/* ── LEFT: Menu Browser ── */}
                <section ref={menuRef} className="order-2 space-y-4 xl:order-1">
                    <div className="hidden xl:block">
                        <h1 className="text-2xl font-semibold">POS Kasir</h1>
                        <p className="text-sm text-muted-foreground">Pilih menu lalu atur di panel kanan.</p>
                    </div>
                    <div className="xl:hidden">
                        <p className="text-sm font-semibold text-muted-foreground">Pilih Menu</p>
                    </div>

                    {/* Category tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${selectedCategoryId === String(cat.id) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                                onClick={() => setSelectedCategoryId(String(cat.id))}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Menu items */}
                    {selectedCategory ? (
                        selectedCategory.active_items.length > 0 ? (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                                {selectedCategory.active_items.map((item) => {
                                    const cartItem = cart.find((c) => c.menu_item_id === item.id);
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => addItem(item)}
                                            className={`relative min-h-[80px] rounded-xl border border-border p-3 text-left transition-all active:scale-95 ${cartItem ? 'bg-primary/5 ring-2 ring-primary/60' : 'hover:ring-1 hover:ring-primary/30'}`}
                                        >
                                            {cartItem && (
                                                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow">
                                                    {cartItem.quantity}
                                                </span>
                                            )}
                                            <span className="block text-sm font-semibold leading-tight">{item.name}</span>
                                            <span className="mt-1.5 block text-sm font-bold text-primary">Rp {money(item.price)}</span>
                                            <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                                <Printer className="size-3" />
                                                {printTargetLabels[item.print_to] ?? item.print_to}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Belum ada menu di kategori ini.</p>
                        )
                    ) : (
                        <p className="text-sm text-muted-foreground">Belum ada kategori menu.</p>
                    )}
                </section>
            </main>
        </AppLayout>
    );
}
