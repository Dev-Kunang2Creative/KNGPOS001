import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Banknote,
    Bell,
    CheckCircle2,
    ChefHat,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    CreditCard,
    GlassWater,
    Minus,
    Package,
    Plus,
    Printer,
    QrCode,
    ReceiptText,
    Send,
    ShoppingCart,
    Trash2,
    X,
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
type MenuItemAddon = { id: number; name: string; price: string; is_active: boolean };
type MenuItem = {
    id: number;
    category_id: number;
    name: string;
    price: string;
    print_to: string;
    image_url?: string | null;
    addons?: MenuItemAddon[];
};
type Category = { id: number; name: string; active_items: MenuItem[] };
type ActiveOrderItem = {
    id: number;
    quantity: number;
    unit_price?: string;
    subtotal: string;
    status: string;
    notes?: string | null;
    menu_item?: MenuItem;
};
type ActiveOrder = {
    id: number;
    status: string;
    subtotal: string;
    total_amount: string;
    table?: Table;
    items: ActiveOrderItem[];
} | null;
type OpenOrder = { id: number; table?: { id: number; name: string } | null; status: string; total_amount: string; created_at: string };
type XenditPayment = {
    id: number;
    transaction_id: number;
    external_id: string;
    status: string;
    xendit_raw_response?: Record<string, unknown> | null;
} | null;
type CartItem = { menu_item_id: number; name: string; quantity: number; notes: string; price: number; addons?: number[]; addonNames?: string[] };
type PendingSelfOrderItem = {
    id: number;
    menu_item_id: number;
    quantity: number;
    subtotal: string;
    notes?: string | null;
    menu_item?: { id: number; name: string; price?: string; print_to?: string };
    name?: string | null;
    addons?: { id: number; name: string; price: number }[];
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
    order?: {
        id: number;
        transaction?: { id: number; payment_method: string; amount_paid: string; status: string; paid_at?: string | null } | null;
    } | null;
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

function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
    const pages = Math.ceil(total / pageSize);
    if (pages <= 1) return null;
    return (
        <div className="text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
            <span>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total}
            </span>
            <div className="flex gap-1">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPage(page - 1)}
                    className="hover:bg-muted rounded px-2 py-1 disabled:opacity-40"
                >
                    ‹ Prev
                </button>
                <button
                    type="button"
                    disabled={page >= pages}
                    onClick={() => onPage(page + 1)}
                    className="hover:bg-muted rounded px-2 py-1 disabled:opacity-40"
                >
                    Next ›
                </button>
            </div>
        </div>
    );
}
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
            (l) =>
                [target, l.menu_item?.id ?? l.menu_item?.name ?? 'item', l.unit_price ?? l.menu_item?.price ?? '0', l.notes ?? '', l.status].join(
                    '|',
                ) === key,
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

export default function PosIndex({
    tables,
    openOrders,
    categories,
    activeOrder,
    xenditPayment,
    pendingSelfOrders,
    paidSelfOrderReceipts,
    pendingStationTickets,
    stationTicketHistory,
}: Props) {
    const { flash, restaurant } = usePage<SharedData & { restaurant?: { tax_percentage: number; tax_is_active: boolean; service_charge_percentage: number; service_charge_is_active: boolean } }>().props;
    const menuRef = useRef<HTMLElement>(null);
    const [selectedTableId, setSelectedTableId] = useState('');
    const [cartTarget, setCartTarget] = useState<CartTarget>('close_bill');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [itemNotice, setItemNotice] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0] ? String(categories[0].id) : '');
    const [selfOrders, setSelfOrders] = useState<PendingSelfOrder[]>(pendingSelfOrders);
    const [approvingAll, setApprovingAll] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState<'new_order' | 'pay_bill'>('new_order');
    const [billItemsExpanded, setBillItemsExpanded] = useState(false);
    const [expandedCards, setExpandedCards] = useState<Set<string>>(
        () => new Set(['bills', 'bills_detail', 'paid_receipts', 'self_order', 'station_print', 'station_history']),
    );
    function toggleCard(key: string) {
        setExpandedCards((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }
    const [selfOrderForCheckout, setSelfOrderForCheckout] = useState<PendingSelfOrder | null>(null);

    // Pagination states
    const PAGE_SIZE = 5;
    const [billsPage, setBillsPage] = useState(1);
    const [selfOrderPage, setSelfOrderPage] = useState(1);
    const [receiptPage, setReceiptPage] = useState(1);
    const [stationPage, setStationPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const [activePanel, setActivePanel] = useState<CashierPanel>(
        activeOrder ? 'bills' : pendingSelfOrders.length > 0 ? 'self_order' : pendingStationTickets.length > 0 ? 'station_print' : 'bills',
    );
    const orderableTables = useMemo(() => tables.filter((t) => ['available', 'occupied'].includes(t.status)), [tables]);
    const selectedCategory = categories.find((c) => String(c.id) === selectedCategoryId) ?? categories[0];
    const selectedTable = tables.find((t) => String(t.id) === selectedTableId);
    const activeOrderTotal = activeOrder ? Number(activeOrder.total_amount ?? activeOrder.subtotal) : 0;
    const pendingActiveItems = activeOrder?.items.filter((i) => i.status === 'pending') ?? [];
    const cartSubtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const cartServiceCharge = restaurant && restaurant.service_charge_is_active ? cartSubtotal * (Number(restaurant.service_charge_percentage) / 100) : 0;
    const cartTax = restaurant && restaurant.tax_is_active ? (cartSubtotal + cartServiceCharge) * (Number(restaurant.tax_percentage) / 100) : 0;
    const cartTotal = cartSubtotal + cartServiceCharge + cartTax;
    const activeOrderSections = useMemo(() => groupOpenBillItems(activeOrder?.items ?? []), [activeOrder?.items]);
    const selectedCartOrderId = cartTarget.startsWith('bill:') ? Number(cartTarget.replace('bill:', '')) : null;
    const selectedCartOrder = openOrders.find((o) => o.id === selectedCartOrderId);
    const isXenditPaid = String(xenditPayment?.status ?? '').toLowerCase() === 'paid';
    const canPay = activeOrder?.status === 'submitted' && pendingActiveItems.length === 0;

    const form = useForm({
        table_id: '',
        notes: '',
        bill_mode: 'open_bill' as BillMode,
        items: [] as { menu_item_id: number; quantity: number; notes?: string; addons?: number[] }[],
    });
    const [menuItemForAddon, setMenuItemForAddon] = useState<MenuItem | null>(null);
    const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
    const cashForm = useForm({ amount_paid: activeOrderTotal, notes: '' });
    const [closeBillPaymentMethod, setCloseBillPaymentMethod] = useState<CloseBillPaymentMethod>('cash');
    const [openBillPaymentMethod, setOpenBillPaymentMethod] = useState<CloseBillPaymentMethod>('cash');
    const [closeBillAmount, setCloseBillAmount] = useState(0);
    const closeBillChange = Math.max(0, Number(closeBillAmount || 0) - cartTotal);
    const activeCashPaid = Number(cashForm.data.amount_paid || 0);
    const activeCashChange = Math.max(0, activeCashPaid - activeOrderTotal);

    const cashierPanels: { key: CashierPanel; label: string; icon: typeof ShoppingCart; count?: number }[] = [
        { key: 'cart', label: 'Pesanan', icon: ShoppingCart, count: cart.length || undefined },
        { key: 'bills', label: 'Tagihan', icon: ReceiptText, count: openOrders.length || undefined },
        { key: 'self_order', label: 'Self Order', icon: Bell, count: selfOrders.length + paidSelfOrderReceipts.length || undefined },
        { key: 'station_print', label: 'Dapur/Bar', icon: Printer, count: pendingStationTickets.length || undefined },
        { key: 'station_history', label: 'Riwayat', icon: ReceiptText },
    ];

    useEffect(() => {
        setSelfOrders(pendingSelfOrders);
    }, [pendingSelfOrders]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            if (document.hidden || form.processing || cashForm.processing) return;
            router.reload({
                only: [
                    'activeOrder',
                    'xenditPayment',
                    'pendingSelfOrders',
                    'paidSelfOrderReceipts',
                    'pendingStationTickets',
                    'stationTicketHistory',
                    'openOrders',
                ],
            });
        }, 7000);
        return () => window.clearInterval(interval);
    }, [form.processing, cashForm.processing]);

    useEffect(() => {
        if (activeOrder) cashForm.setData('amount_paid', activeOrderTotal);
    }, [activeOrder?.id, activeOrderTotal]);

    useEffect(() => {
        setOpenBillPaymentMethod(xenditPayment && !isXenditPaid ? 'qris' : 'cash');
    }, [activeOrder?.id, xenditPayment?.id, isXenditPaid]);

    useEffect(() => {
        if (cartTarget === 'close_bill' && closeBillAmount < cartTotal) setCloseBillAmount(cartTotal);
    }, [cartTarget, cartTotal]);

    useEffect(() => {
        if (!itemNotice) return;
        const t = window.setTimeout(() => setItemNotice(''), 1800);
        return () => window.clearTimeout(t);
    }, [itemNotice]);

    function handleMenuClick(menuItem: MenuItem) {
        if (menuItem.addons && menuItem.addons.length > 0) {
            setMenuItemForAddon(menuItem);
            setSelectedAddonIds([]);
        } else {
            addItem(menuItem, []);
        }
    }

    function confirmAddWithAddons() {
        if (menuItemForAddon) {
            addItem(menuItemForAddon, selectedAddonIds);
            setMenuItemForAddon(null);
            setSelectedAddonIds([]);
        }
    }

    function addItem(menuItem: MenuItem, addons: number[] = []) {
        const sortedAddons = [...addons].sort((a, b) => a - b);
        const addonsHash = sortedAddons.join(',');

        let addonPrice = 0;
        let addonNames: string[] = [];
        if (addons.length > 0 && menuItem.addons) {
            const selectedAddonObjects = menuItem.addons.filter((a) => addons.includes(a.id));
            addonPrice = selectedAddonObjects.reduce((sum, a) => sum + Number(a.price), 0);
            addonNames = selectedAddonObjects.map((a) => a.name);
        }

        setCart((cur) => {
            const exIndex = cur.findIndex((i) => i.menu_item_id === menuItem.id && (i.addons || []).sort((a, b) => a - b).join(',') === addonsHash);
            if (exIndex >= 0) {
                const newCart = [...cur];
                newCart[exIndex] = { ...newCart[exIndex], quantity: newCart[exIndex].quantity + 1 };
                return newCart;
            }
            return [
                ...cur,
                {
                    menu_item_id: menuItem.id,
                    name: menuItem.name,
                    quantity: 1,
                    notes: '',
                    price: Number(menuItem.price) + addonPrice,
                    addons: addons.length > 0 ? addons : undefined,
                    addonNames: addonNames.length > 0 ? addonNames : undefined,
                },
            ];
        });
        setItemNotice(`${menuItem.name} ditambahkan.`);
    }

    function updateQuantity(cartIndex: number, delta: number) {
        setCart((cur) => cur.map((i, idx) => (idx === cartIndex ? { ...i, quantity: i.quantity + delta } : i)).filter((i) => i.quantity > 0));
    }

    function removeItem(cartIndex: number) {
        setCart((cur) => cur.filter((i, idx) => idx !== cartIndex));
    }

    function submitOrder(e: FormEvent) {
        e.preventDefault();
        const items = cart.map((i) => ({ menu_item_id: i.menu_item_id, quantity: i.quantity, notes: i.notes || undefined, addons: i.addons }));
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
        const paymentMethod = closeBillPaymentMethod;
        form.transform(() => ({
            table_id: Number(selectedTableId),
            notes: form.data.notes,
            bill_mode: billMode,
            payment_method: billMode === 'close_bill' ? closeBillPaymentMethod : undefined,
            amount_paid: billMode === 'close_bill' && closeBillPaymentMethod === 'cash' ? Number(closeBillAmount || 0) : undefined,
            items,
            self_order_id: selfOrderForCheckout?.id ?? undefined,
        }));
        form.post(billMode === 'close_bill' ? '/pos/orders/close-bill' : '/pos/orders', {
            preserveScroll: true,
            onSuccess: () => {
                setCart([]);
                setSelectedTableId('');
                setCartTarget('close_bill');
                setCloseBillPaymentMethod('cash');
                setCloseBillAmount(0);
                setSelfOrderForCheckout(null);
                if (selfOrderForCheckout) {
                    setSelfOrders((cur) => cur.filter((o) => o.id !== selfOrderForCheckout.id));
                }
                form.reset();
                if (billMode === 'close_bill' && paymentMethod === 'qris') {
                    setDrawerMode('pay_bill');
                    setDrawerOpen(true);
                }
            },
        });
    }

    // Paginated slices
    const paginatedOpenOrders = openOrders.slice((billsPage - 1) * PAGE_SIZE, billsPage * PAGE_SIZE);
    const paginatedSelfOrders = selfOrders.slice((selfOrderPage - 1) * PAGE_SIZE, selfOrderPage * PAGE_SIZE);
    const paginatedPaidReceipts = paidSelfOrderReceipts.slice((receiptPage - 1) * PAGE_SIZE, receiptPage * PAGE_SIZE);
    const paginatedPendingTickets = pendingStationTickets.slice((stationPage - 1) * PAGE_SIZE, stationPage * PAGE_SIZE);
    const paginatedHistory = stationTicketHistory.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);

    const quickAmounts = [2000, 5000, 10000, 50000, 100000];

    function openDrawerForPayBill() {
        setDrawerMode('pay_bill');
        setDrawerOpen(true);
    }

    function closeDrawer() {
        setDrawerOpen(false);
        setDrawerMode('new_order');
        setSelfOrderForCheckout(null);
    }

    function openDrawerForCashierSelfOrder(so: PendingSelfOrder) {
        const items: CartItem[] = so.items
            .filter((item) => item.menu_item)
            .map((item) => ({
                menu_item_id: item.menu_item_id,
                name: item.menu_item?.name ?? '',
                quantity: item.quantity,
                notes: item.notes ?? '',
                price: Number(item.subtotal) / item.quantity,
                addons: item.addons?.map((a) => a.id) || undefined,
                addonNames: item.addons?.map((a) => a.name) || undefined,
            }));
        setCart(items);
        setSelectedTableId(String(so.table_id));
        setCartTarget('close_bill');
        setSelfOrderForCheckout(so);
        setDrawerOpen(true);
    }

    function parseCashInput(value: string): number {
        return Number(value.replace(/\./g, '').replace(/\D/g, '')) || 0;
    }

    function approveSelfOrder(selfOrderId: number) {
        router.post(`/pos/self-orders/${selfOrderId}/approve`, {}, { preserveScroll: true });
    }

    function rejectSelfOrder(selfOrderId: number) {
        router.post(
            `/pos/self-orders/${selfOrderId}/reject`,
            {},
            { preserveScroll: true, onSuccess: () => setSelfOrders((cur) => cur.filter((o) => o.id !== selfOrderId)) },
        );
    }

    async function approveAllSelfOrders() {
        setApprovingAll(true);
        const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        await Promise.all(
            selfOrders.map((o) =>
                fetch(`/pos/self-orders/${o.id}/approve`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': token, 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                }),
            ),
        );
        setApprovingAll(false);
        router.reload({ only: ['pendingSelfOrders', 'paidSelfOrderReceipts'] });
    }

    function printAllTickets() {
        pendingStationTickets.forEach((ticket, i) => setTimeout(() => window.open(stationTicketUrl(ticket), '_blank'), i * 400));
        setTimeout(() => router.reload({ only: ['pendingStationTickets', 'stationTicketHistory'] }), pendingStationTickets.length * 400 + 2500);
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
                <div className="bg-background fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-emerald-500/40 px-4 py-3 text-sm text-emerald-700 shadow-lg">
                    <CheckCircle2 className="size-4" />
                    {itemNotice}
                </div>
            )}

            {/* ── MOBILE FLOATING BAR ── */}
            <div
                className={`fixed right-0 bottom-0 left-0 z-40 p-4 transition-transform duration-300 xl:hidden ${cart.length > 0 ? 'translate-y-0' : 'translate-y-full'}`}
            >
                <button
                    type="button"
                    className="bg-primary text-primary-foreground flex min-h-[56px] w-full items-center justify-between rounded-2xl px-5 py-3 shadow-lg"
                    onClick={() => setDrawerOpen(true)}
                >
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="size-5" />
                        <span className="font-semibold">{cart.length} item</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-bold">Rp {money(cartTotal)}</span>
                        <span className="bg-primary-foreground/20 rounded-lg px-3 py-1 text-sm font-semibold">Proses</span>
                    </div>
                </button>
            </div>

            {/* ── MOBILE CART DRAWER ── */}
            <div
                className={`fixed inset-0 z-50 transition-opacity duration-300 xl:hidden ${drawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/50" onClick={closeDrawer} />
                {/* Panel */}
                <div
                    className={`bg-background absolute right-0 bottom-0 left-0 max-h-[92vh] overflow-y-auto rounded-t-2xl transition-transform duration-300 ${drawerOpen ? 'translate-y-0' : 'translate-y-full'}`}
                >
                    {/* Handle + header */}
                    <div className="bg-background sticky top-0 z-10 px-4 pt-3 pb-3">
                        <div className="bg-muted-foreground/30 mx-auto mb-3 h-1 w-12 rounded-full" />
                        <div className="flex items-center justify-between">
                            <h2 className="flex items-center gap-2 font-semibold">
                                {drawerMode === 'pay_bill' ? (
                                    <>
                                        <Banknote className="size-4" /> Bayar Tagihan
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart className="size-4" /> Pesanan Baru
                                    </>
                                )}
                            </h2>
                            <button type="button" className="bg-muted flex h-8 w-8 items-center justify-center rounded-full" onClick={closeDrawer}>
                                <X className="size-4" />
                            </button>
                        </div>
                        {selfOrderForCheckout && (
                            <div className="mt-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                <Bell className="size-3 shrink-0" />
                                Self Order dari <strong className="mx-1">{selfOrderForCheckout.customer_name ?? 'Customer'}</strong> —{' '}
                                {selfOrderForCheckout.table_name ?? `Meja ${selfOrderForCheckout.table_id}`}
                            </div>
                        )}
                        {selectedCartOrder && !selfOrderForCheckout && (
                            <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                <ReceiptText className="size-3 shrink-0" />
                                Tambah item ke <strong className="mx-1">Open Bill #{selectedCartOrder.id}</strong> —{' '}
                                {selectedCartOrder.table?.name ?? '-'} · Rp {money(selectedCartOrder.total_amount)}
                            </div>
                        )}
                    </div>
                    {/* Form */}
                    {/* ── PAY BILL MODE ── */}
                    {drawerMode === 'pay_bill' && activeOrder && (
                        <div className="space-y-5 px-4 pb-10">
                            {/* Order summary */}
                            <div className="bg-muted/50 rounded-xl px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">{activeOrder.table?.name}</p>
                                        <p className="text-muted-foreground text-xs">
                                            Order #{activeOrder.id} · {activeOrder.items.length} item
                                        </p>
                                    </div>
                                    <p className="text-lg font-bold">Rp {money(activeOrderTotal)}</p>
                                </div>
                            </div>

                            {/* Warning if not ready */}
                            {!canPay && (
                                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                                    <AlertCircle className="size-4 shrink-0" />
                                    <div>
                                        <p className="font-medium">Belum bisa bayar</p>
                                        <p className="text-xs">
                                            {activeOrder.status !== 'submitted'
                                                ? 'Kirim item ke Dapur/Bar dulu.'
                                                : 'Ada item baru yang belum dikirim.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Kirim ke dapur if needed */}
                            {pendingActiveItems.length > 0 && (
                                <Button
                                    type="button"
                                    className="min-h-[48px] w-full"
                                    onClick={() =>
                                        router.post(`/pos/orders/${activeOrder.id}/submit`, {}, { preserveScroll: true, onSuccess: () => {} })
                                    }
                                >
                                    <Send className="size-4" />
                                    Kirim {pendingActiveItems.length} Item ke Dapur/Bar Dulu
                                </Button>
                            )}

                            <div className="space-y-2">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Metode Pembayaran</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 text-sm font-medium transition-all ${openBillPaymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
                                        onClick={() => setOpenBillPaymentMethod('cash')}
                                    >
                                        <Banknote className="size-4" /> Cash
                                    </button>
                                    <button
                                        type="button"
                                        className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 text-sm font-medium transition-all ${openBillPaymentMethod === 'qris' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
                                        onClick={() => setOpenBillPaymentMethod('qris')}
                                    >
                                        <QrCode className="size-4" /> QRIS
                                    </button>
                                </div>
                            </div>

                            {openBillPaymentMethod === 'cash' && (
                                <div className="space-y-3 rounded-xl border p-4">
                                    <div className="flex items-center gap-2 font-medium">
                                        <Banknote className="size-4" /> Cash
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total tagihan</span>
                                        <strong>Rp {money(activeOrderTotal)}</strong>
                                    </div>
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        value={cashForm.data.amount_paid > 0 ? money(cashForm.data.amount_paid) : ''}
                                        onChange={(e) => cashForm.setData('amount_paid', parseCashInput(e.target.value))}
                                        placeholder="0"
                                        className="min-h-[48px] [appearance:textfield] text-lg font-semibold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {quickAmounts.map((amt) => (
                                            <button
                                                key={amt}
                                                type="button"
                                                className="bg-muted hover:bg-muted/80 rounded-lg border py-2 text-xs font-semibold"
                                                onClick={() => cashForm.setData('amount_paid', cashForm.data.amount_paid + amt)}
                                            >
                                                {amt >= 1000 ? `${amt / 1000}rb` : amt}
                                            </button>
                                        ))}
                                    </div>
                                    {activeCashPaid >= activeOrderTotal && activeCashPaid > 0 && (
                                        <div className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2">
                                            <span className="text-emerald-700">Kembalian</span>
                                            <strong className="text-emerald-700">Rp {money(activeCashChange)}</strong>
                                        </div>
                                    )}
                                    <Button
                                        type="button"
                                        className="min-h-[52px] w-full text-base font-semibold"
                                        disabled={!canPay || activeCashPaid < activeOrderTotal || cashForm.processing}
                                        onClick={() => {
                                            cashForm.post(`/pos/orders/${activeOrder.id}/pay`);
                                            closeDrawer();
                                        }}
                                    >
                                        Bayar Cash & Cetak Struk
                                    </Button>
                                </div>
                            )}

                            {openBillPaymentMethod === 'qris' && (
                                <div className="space-y-3 rounded-xl border p-4">
                                    <div className="flex items-center gap-2 font-medium">
                                        <QrCode className="size-4" /> QRIS
                                    </div>
                                    <Button
                                        type="button"
                                        className="min-h-[48px] w-full"
                                        variant="outline"
                                        disabled={!canPay || (xenditPayment !== null && !isXenditPaid)}
                                        onClick={() => {
                                            router.post(`/pos/orders/${activeOrder.id}/xendit`, {}, { preserveScroll: true });
                                        }}
                                    >
                                        {xenditPayment && !isXenditPaid ? 'QRIS Sudah Dibuat' : 'Generate QRIS'}
                                    </Button>
                                    {xenditPayment && (
                                        <div className="space-y-2 rounded-xl border p-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium">Status QRIS</p>
                                                <Badge variant={isXenditPaid ? 'default' : 'secondary'}>
                                                    {isXenditPaid ? 'Lunas' : xenditPayment.status}
                                                </Badge>
                                            </div>
                                            {typeof xenditPayment.xendit_raw_response?.qr_string === 'string' && !isXenditPaid && (
                                                <div className="rounded-lg bg-white p-3">
                                                    <QRCodeSVG
                                                        value={xenditPayment.xendit_raw_response.qr_string as string}
                                                        size={220}
                                                        className="mx-auto"
                                                    />
                                                </div>
                                            )}
                                            {isXenditPaid && (
                                                <Button
                                                    type="button"
                                                    className="min-h-[48px] w-full"
                                                    onClick={() => {
                                                        router.visit(`/pos/xendit/${xenditPayment.id}/success`);
                                                        closeDrawer();
                                                    }}
                                                >
                                                    <ReceiptText className="size-4" /> Buka & Cetak Struk
                                                </Button>
                                            )}
                                            {!isXenditPaid && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="min-h-[44px] w-full"
                                                    variant="secondary"
                                                    onClick={() =>
                                                        router.post(
                                                            `/pos/orders/${activeOrder.id}/xendit/${xenditPayment.id}/simulate`,
                                                            {},
                                                            { preserveScroll: true },
                                                        )
                                                    }
                                                >
                                                    Simulasi Pembayaran
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── NEW ORDER MODE ── */}
                    {drawerMode === 'new_order' && (
                        <form
                            onSubmit={(e) => {
                                submitOrder(e);
                                if (!(cartTarget === 'close_bill' && closeBillPaymentMethod === 'qris')) {
                                    closeDrawer();
                                }
                            }}
                            className="space-y-5 px-4 pb-10"
                        >
                            {/* Tipe pesanan */}
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">1. Tipe Pesanan</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        className={`min-h-[64px] rounded-xl border-2 p-3 text-left text-sm transition-all ${cartTarget === 'close_bill' ? 'border-primary bg-primary/5' : 'border-border'}`}
                                        onClick={() => setCartTarget('close_bill')}
                                    >
                                        <div className="flex items-center gap-2 font-semibold">
                                            <CreditCard className="text-primary size-4" />
                                            Bayar Langsung
                                        </div>
                                        <p className="text-muted-foreground mt-1 text-xs">Bayar sekarang di kasir</p>
                                    </button>
                                    <button
                                        type="button"
                                        className={`min-h-[64px] rounded-xl border-2 p-3 text-left text-sm transition-all ${cartTarget === 'open_bill' ? 'border-primary bg-primary/5' : 'border-border'}`}
                                        onClick={() => setCartTarget('open_bill')}
                                    >
                                        <div className="flex items-center gap-2 font-semibold">
                                            <ReceiptText className="text-primary size-4" />
                                            Open Bill
                                        </div>
                                        <p className="text-muted-foreground mt-1 text-xs">Bayar nanti / tambah item lagi</p>
                                    </button>
                                </div>
                                {openOrders.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground text-xs">Tambah ke tagihan aktif:</p>
                                        {openOrders.map((order) => (
                                            <button
                                                key={order.id}
                                                type="button"
                                                className={`flex min-h-[44px] w-full items-center justify-between rounded-xl border-2 px-3 py-2 text-sm transition-all ${cartTarget === `bill:${order.id}` ? 'border-primary bg-primary/5' : 'border-border'}`}
                                                onClick={() => setCartTarget(`bill:${order.id}` as CartTarget)}
                                            >
                                                <span className="font-medium">
                                                    #{order.id} – {order.table?.name ?? '-'}
                                                </span>
                                                <span className="text-muted-foreground text-xs">Rp {money(order.total_amount)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Pilih Meja */}
                            {!selectedCartOrder && (
                                <div className="space-y-2">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">2. Pilih Meja</p>
                                    <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                                        <SelectTrigger className="min-h-[48px]">
                                            <SelectValue placeholder="Pilih meja..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {orderableTables.map((t) => (
                                                <SelectItem key={t.id} value={String(t.id)}>
                                                    {t.name}
                                                    {t.zone && ` – ${t.zone.name}`}
                                                    {t.status === 'occupied' && ' (terisi)'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {orderableTables.length === 0 && (
                                        <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">Tidak ada meja tersedia.</p>
                                    )}
                                </div>
                            )}
                            {selectedCartOrder && (
                                <div className="bg-muted/50 rounded-xl px-4 py-3 text-sm">
                                    <p className="font-medium">Tambah ke Tagihan #{selectedCartOrder.id}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {selectedCartOrder.table?.name ?? '-'} – item langsung dicetak ke Dapur/Bar
                                    </p>
                                </div>
                            )}

                            {/* Item pesanan */}
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">3. Item Pesanan</p>
                                <div className="space-y-2">
                                    {cart.map((item, index) => (
                                        <div key={`${item.menu_item_id}-${index}`} className="space-y-2 rounded-xl border px-3 py-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{item.name}</p>
                                                    {item.addonNames && item.addonNames.length > 0 && (
                                                        <p className="text-muted-foreground mt-0.5 text-xs">+ {item.addonNames.join(', ')}</p>
                                                    )}
                                                    <p className="text-muted-foreground mt-0.5 text-xs">Rp {money(item.price)} / item</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="bg-muted text-muted-foreground hover:text-destructive flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                                                    onClick={() => removeItem(index)}
                                                >
                                                    <Trash2 className="size-3" />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-9 w-9"
                                                        onClick={() => updateQuantity(index, -1)}
                                                    >
                                                        <Minus className="size-3" />
                                                    </Button>
                                                    <span className="w-9 text-center text-sm font-semibold">{item.quantity}</span>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-9 w-9"
                                                        onClick={() => updateQuantity(index, 1)}
                                                    >
                                                        <Plus className="size-3" />
                                                    </Button>
                                                </div>
                                                <span className="text-sm font-bold">Rp {money(item.price * item.quantity)}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {cartServiceCharge > 0 && (
                                        <div className="flex justify-between border-t pt-3 text-sm text-muted-foreground">
                                            <span>Subtotal</span>
                                            <span>Rp {money(cartSubtotal)}</span>
                                        </div>
                                    )}
                                    {cartServiceCharge > 0 && (
                                        <div className="flex justify-between pt-1 text-sm text-muted-foreground">
                                            <span>Service Charge ({restaurant?.service_charge_percentage}%)</span>
                                            <span>Rp {money(cartServiceCharge)}</span>
                                        </div>
                                    )}
                                    {cartTax > 0 && (
                                        <div className="flex justify-between pt-1 text-sm text-muted-foreground">
                                            <span>PB1 ({restaurant?.tax_percentage}%)</span>
                                            <span>Rp {money(cartTax)}</span>
                                        </div>
                                    )}
                                    <div className={`flex justify-between ${cartServiceCharge > 0 || cartTax > 0 ? 'pt-2' : 'border-t pt-3'} text-base font-bold`}>
                                        <span>Total</span>
                                        <span>Rp {money(cartTotal)}</span>
                                    </div>
                                </div>
                                <Input
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    placeholder="Catatan order (opsional)"
                                    className="min-h-[44px]"
                                />
                            </div>

                            {/* Metode pembayaran */}
                            {cartTarget === 'close_bill' && (
                                <div className="space-y-2">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">4. Metode Pembayaran</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 text-sm font-medium transition-all ${closeBillPaymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
                                            onClick={() => setCloseBillPaymentMethod('cash')}
                                        >
                                            <Banknote className="size-4" /> Cash
                                        </button>
                                        <button
                                            type="button"
                                            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 text-sm font-medium transition-all ${closeBillPaymentMethod === 'qris' ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
                                            onClick={() => setCloseBillPaymentMethod('qris')}
                                        >
                                            <QrCode className="size-4" /> QRIS
                                        </button>
                                    </div>
                                    {closeBillPaymentMethod === 'cash' && (
                                        <div className="bg-muted/50 space-y-2 rounded-xl p-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Total tagihan</span>
                                                <strong>Rp {money(cartTotal)}</strong>
                                            </div>
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                value={closeBillAmount > 0 ? money(closeBillAmount) : ''}
                                                onChange={(e) => setCloseBillAmount(parseCashInput(e.target.value))}
                                                placeholder="0"
                                                className="min-h-[48px] [appearance:textfield] text-lg font-semibold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            />
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {quickAmounts.map((amt) => (
                                                    <button
                                                        key={amt}
                                                        type="button"
                                                        className={`rounded-lg border py-2 text-xs font-semibold transition-colors ${closeBillAmount === amt ? 'border-primary bg-primary/10 text-primary' : 'bg-muted hover:bg-muted/80'}`}
                                                        onClick={() => setCloseBillAmount((prev) => prev + amt)}
                                                    >
                                                        {amt >= 1000 ? `${amt / 1000}rb` : amt}
                                                    </button>
                                                ))}
                                            </div>
                                            {closeBillAmount > 0 && (
                                                <div className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2">
                                                    <span className="text-emerald-700">Kembalian</span>
                                                    <strong className="text-emerald-700">Rp {money(closeBillChange)}</strong>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {closeBillPaymentMethod === 'qris' && (
                                        <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                                            QRIS Xendit dibuat otomatis setelah pesanan disimpan.
                                        </p>
                                    )}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="min-h-[52px] w-full text-base font-semibold"
                                disabled={
                                    (!selectedCartOrder && !selectedTableId) ||
                                    cart.length === 0 ||
                                    form.processing ||
                                    (cartTarget === 'close_bill' && closeBillPaymentMethod === 'cash' && Number(closeBillAmount || 0) < cartTotal)
                                }
                            >
                                <ShoppingCart className="size-4" />
                                {selectedCartOrder
                                    ? 'Tambah & Cetak ke Dapur/Bar'
                                    : cartTarget === 'close_bill'
                                      ? closeBillPaymentMethod === 'qris'
                                          ? 'Bayar via QRIS'
                                          : 'Bayar Cash & Cetak Struk'
                                      : 'Simpan Open Bill'}
                            </Button>
                        </form>
                    )}
                </div>
            </div>

            <main className="flex flex-col gap-4 p-4 pb-28 xl:grid xl:grid-cols-[1fr_460px] xl:pb-4">
                {/* ── RIGHT: Cashier Panel ── */}
                <aside id="cashier-panel" className="order-1 flex flex-col gap-3 xl:order-2">
                    {/* Flash messages */}
                    {flash.error && (
                        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">{flash.error}</div>
                    )}
                    {flash.success && (
                        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700">{flash.success}</div>
                    )}

                    {/* Urgent alerts */}
                    {(selfOrders.length > 0 || paidSelfOrderReceipts.length > 0 || pendingStationTickets.length > 0) && (
                        <div className="flex flex-col gap-2">
                            {selfOrders.length > 0 && (
                                <button
                                    type="button"
                                    className="flex min-h-[44px] items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
                                    onClick={() => setActivePanel('self_order')}
                                >
                                    <Bell className="size-4 shrink-0 animate-pulse" />
                                    <span className="flex-1 text-left">{selfOrders.length} self order menunggu persetujuan</span>
                                    <ChevronRight className="size-4 shrink-0" />
                                </button>
                            )}
                            {paidSelfOrderReceipts.length > 0 && (
                                <button
                                    type="button"
                                    className="flex min-h-[44px] items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
                                    onClick={() => setActivePanel('self_order')}
                                >
                                    <CheckCircle2 className="size-4 shrink-0" />
                                    <span className="flex-1 text-left">{paidSelfOrderReceipts.length} QRIS lunas, cetak struk</span>
                                    <ChevronRight className="size-4 shrink-0" />
                                </button>
                            )}
                            {pendingStationTickets.length > 0 && (
                                <button
                                    type="button"
                                    className="flex min-h-[44px] items-center gap-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-100"
                                    onClick={() => setActivePanel('station_print')}
                                >
                                    <Printer className="size-4 shrink-0" />
                                    <span className="flex-1 text-left">{pendingStationTickets.length} tiket dapur/bar belum dicetak</span>
                                    <ChevronRight className="size-4 shrink-0" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Sticky tab navigation */}
                    <div className="bg-background sticky top-0 z-10 pt-0 pb-1">
                        {/* Mobile: 4 tabs (no Pesanan – accessible via floating bar) */}
                        <div className="bg-muted grid grid-cols-4 gap-1 rounded-xl p-1 xl:hidden">
                            {cashierPanels
                                .filter((p) => p.key !== 'cart')
                                .map((panel) => {
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
                                                <span className="bg-destructive text-destructive-foreground absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold">
                                                    {panel.count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                        </div>
                        {/* Desktop: 5 tabs (includes Pesanan) */}
                        <div className="bg-muted hidden grid-cols-5 gap-1 rounded-xl p-1 xl:grid">
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
                                            <span className="bg-destructive text-destructive-foreground absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold">
                                                {panel.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── PANEL: PESANAN BARU (desktop only — mobile uses drawer) ── */}
                    {activePanel === 'cart' && (
                        <form onSubmit={submitOrder} className="bg-card hidden space-y-4 rounded-xl border p-4 xl:block">
                            <div className="flex items-center justify-between">
                                <h2 className="flex items-center gap-2 font-semibold">
                                    <ShoppingCart className="size-4" />
                                    Pesanan Baru
                                </h2>
                                {cart.length > 0 && <Badge variant="secondary">Rp {money(cartTotal)}</Badge>}
                            </div>

                            {/* Step 1: Tipe pesanan */}
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">1. Tipe Pesanan</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        className={`min-h-[64px] rounded-lg border-2 p-3 text-left text-sm transition-all ${cartTarget === 'close_bill' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                                        onClick={() => setCartTarget('close_bill')}
                                    >
                                        <div className="flex items-center gap-2 font-semibold">
                                            <CreditCard className="text-primary size-4" />
                                            Bayar Langsung
                                        </div>
                                        <p className="text-muted-foreground mt-1 text-xs">Bayar sekarang di kasir</p>
                                    </button>
                                    <button
                                        type="button"
                                        className={`min-h-[64px] rounded-lg border-2 p-3 text-left text-sm transition-all ${cartTarget === 'open_bill' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                                        onClick={() => setCartTarget('open_bill')}
                                    >
                                        <div className="flex items-center gap-2 font-semibold">
                                            <ReceiptText className="text-primary size-4" />
                                            Open Bill
                                        </div>
                                        <p className="text-muted-foreground mt-1 text-xs">Bayar nanti / tambah item lagi</p>
                                    </button>
                                </div>
                                {openOrders.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground text-xs">Tambah ke tagihan aktif:</p>
                                        {openOrders.map((order) => (
                                            <button
                                                key={order.id}
                                                type="button"
                                                className={`flex min-h-[44px] w-full items-center justify-between rounded-lg border-2 px-3 py-2 text-sm transition-all ${cartTarget === `bill:${order.id}` ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                                                onClick={() => setCartTarget(`bill:${order.id}` as CartTarget)}
                                            >
                                                <span className="font-medium">
                                                    #{order.id} – {order.table?.name ?? '-'}
                                                </span>
                                                <span className="text-muted-foreground text-xs">Rp {money(order.total_amount)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Pilih Meja */}
                            {!selectedCartOrder && (
                                <div className="space-y-2">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">2. Pilih Meja</p>
                                    <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                                        <SelectTrigger className="min-h-[44px]">
                                            <SelectValue placeholder="Pilih meja..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {orderableTables.map((t) => (
                                                <SelectItem key={t.id} value={String(t.id)}>
                                                    {t.name}
                                                    {t.zone && ` – ${t.zone.name}`}
                                                    {t.status === 'occupied' && ' (terisi)'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {orderableTables.length === 0 && (
                                        <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">Tidak ada meja tersedia.</p>
                                    )}
                                    {selectedTable && !selectedTable.zone?.assignment && (
                                        <p className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
                                            Zona meja belum dikonfigurasi.
                                        </p>
                                    )}
                                </div>
                            )}
                            {selectedCartOrder && (
                                <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
                                    <p className="font-medium">Tambah ke Tagihan #{selectedCartOrder.id}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {selectedCartOrder.table?.name ?? '-'} – item langsung dicetak ke Dapur/Bar
                                    </p>
                                </div>
                            )}

                            {/* Step 3: Item */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">3. Item Pesanan</p>
                                    {/* Mobile: scroll to menu */}
                                    <button
                                        type="button"
                                        className="text-primary flex items-center gap-1 text-xs xl:hidden"
                                        onClick={() => menuRef.current?.scrollIntoView({ behavior: 'smooth' })}
                                    >
                                        <Plus className="size-3" />
                                        Lihat Menu
                                    </button>
                                </div>
                                {cart.length === 0 ? (
                                    <div className="rounded-xl border-2 border-dashed p-6 text-center">
                                        <ShoppingCart className="text-muted-foreground/40 mx-auto size-8" />
                                        <p className="text-muted-foreground mt-2 text-sm">Pilih menu di bawah untuk menambah item.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {cart.map((item, index) => (
                                            <div key={`${item.menu_item_id}-${index}`} className="space-y-2 rounded-lg border px-3 py-2.5">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium">{item.name}</p>
                                                        {item.addonNames && item.addonNames.length > 0 && (
                                                            <p className="text-muted-foreground mt-0.5 text-xs">+ {item.addonNames.join(', ')}</p>
                                                        )}
                                                        <p className="text-muted-foreground mt-0.5 text-xs">Rp {money(item.price)} / item</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="bg-muted text-muted-foreground hover:text-destructive flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                                                        onClick={() => removeItem(index)}
                                                    >
                                                        <Trash2 className="size-3" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="outline"
                                                            className="h-9 w-9"
                                                            onClick={() => updateQuantity(index, -1)}
                                                        >
                                                            <Minus className="size-3" />
                                                        </Button>
                                                        <span className="w-9 text-center text-sm font-semibold">{item.quantity}</span>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="outline"
                                                            className="h-9 w-9"
                                                            onClick={() => updateQuantity(index, 1)}
                                                        >
                                                            <Plus className="size-3" />
                                                        </Button>
                                                    </div>
                                                    <span className="text-sm font-bold">Rp {money(item.price * item.quantity)}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {cartServiceCharge > 0 && (
                                            <div className="flex justify-between border-t pt-2 text-xs text-muted-foreground">
                                                <span>Subtotal</span>
                                                <span>Rp {money(cartSubtotal)}</span>
                                            </div>
                                        )}
                                        {cartServiceCharge > 0 && (
                                            <div className="flex justify-between pt-1 text-xs text-muted-foreground">
                                                <span>Service Charge ({restaurant?.service_charge_percentage}%)</span>
                                                <span>Rp {money(cartServiceCharge)}</span>
                                            </div>
                                        )}
                                        {cartTax > 0 && (
                                            <div className="flex justify-between pt-1 text-xs text-muted-foreground">
                                                <span>PB1 ({restaurant?.tax_percentage}%)</span>
                                                <span>Rp {money(cartTax)}</span>
                                            </div>
                                        )}
                                        <div className={`flex justify-between ${cartServiceCharge > 0 || cartTax > 0 ? 'pt-2' : 'border-t pt-2'} text-sm font-bold`}>
                                            <span>Total</span>
                                            <span>Rp {money(cartTotal)}</span>
                                        </div>
                                    </div>
                                )}
                                <Input
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    placeholder="Catatan order (opsional)"
                                    className="min-h-[44px]"
                                />
                            </div>

                            {/* Step 4: Pembayaran */}
                            {cartTarget === 'close_bill' && cart.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">4. Metode Pembayaran</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg border-2 text-sm font-medium transition-all ${closeBillPaymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'}`}
                                            onClick={() => setCloseBillPaymentMethod('cash')}
                                        >
                                            <Banknote className="size-4" /> Cash
                                        </button>
                                        <button
                                            type="button"
                                            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg border-2 text-sm font-medium transition-all ${closeBillPaymentMethod === 'qris' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'}`}
                                            onClick={() => setCloseBillPaymentMethod('qris')}
                                        >
                                            <QrCode className="size-4" /> QRIS
                                        </button>
                                    </div>
                                    {closeBillPaymentMethod === 'cash' && (
                                        <div className="bg-muted/50 space-y-2 rounded-lg p-3 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Total tagihan</span>
                                                <strong>Rp {money(cartTotal)}</strong>
                                            </div>
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                value={closeBillAmount > 0 ? money(closeBillAmount) : ''}
                                                onChange={(e) => setCloseBillAmount(parseCashInput(e.target.value))}
                                                placeholder="0"
                                                className="min-h-[44px] [appearance:textfield] text-base font-semibold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            />
                                            <div className="grid grid-cols-5 gap-1">
                                                {quickAmounts.map((amt) => (
                                                    <button
                                                        key={amt}
                                                        type="button"
                                                        className={`rounded-lg border py-1.5 text-xs font-semibold transition-colors ${closeBillAmount === amt ? 'border-primary bg-primary/10 text-primary' : 'bg-muted hover:bg-muted/80'}`}
                                                        onClick={() => setCloseBillAmount((prev) => prev + amt)}
                                                    >
                                                        {amt >= 1000 ? `${amt / 1000}rb` : amt}
                                                    </button>
                                                ))}
                                            </div>
                                            {closeBillAmount > 0 && (
                                                <div className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2">
                                                    <span className="text-emerald-700">Kembalian</span>
                                                    <strong className="text-emerald-700">Rp {money(closeBillChange)}</strong>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {closeBillPaymentMethod === 'qris' && (
                                        <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                                            QRIS Xendit dibuat otomatis setelah pesanan disimpan.
                                        </p>
                                    )}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="min-h-[48px] w-full text-base"
                                disabled={
                                    (!selectedCartOrder && !selectedTableId) ||
                                    cart.length === 0 ||
                                    form.processing ||
                                    (cartTarget === 'close_bill' && closeBillPaymentMethod === 'cash' && Number(closeBillAmount || 0) < cartTotal)
                                }
                            >
                                <ShoppingCart className="size-4" />
                                {selectedCartOrder
                                    ? 'Tambah & Cetak ke Dapur/Bar'
                                    : cartTarget === 'close_bill'
                                      ? closeBillPaymentMethod === 'qris'
                                          ? 'Bayar via QRIS'
                                          : 'Bayar Cash & Cetak Struk'
                                      : 'Simpan Open Bill'}
                            </Button>
                        </form>
                    )}

                    {/* ── PANEL: TAGIHAN AKTIF ── */}

                    {activePanel === 'bills' && (
                        <div className="space-y-3">
                            {/* Open bills dropdown */}
                            <div className="bg-card rounded-xl border">
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-4 py-3 font-semibold"
                                    onClick={() => toggleCard('bills')}
                                >
                                    <ReceiptText className="size-4" />
                                    <span className="flex-1 text-left">Open Bill</span>
                                    {openOrders.length > 0 && <Badge variant="secondary">{openOrders.length}</Badge>}
                                    {expandedCards.has('bills') ? (
                                        <ChevronUp className="text-muted-foreground size-4" />
                                    ) : (
                                        <ChevronDown className="text-muted-foreground size-4" />
                                    )}
                                </button>
                                {expandedCards.has('bills') && (
                                    <div className="border-t px-4 py-4">
                                        {openOrders.length === 0 ? (
                                            <p className="text-muted-foreground text-sm">Tidak ada open bill aktif.</p>
                                        ) : (
                                            <Select
                                                value={activeOrder ? String(activeOrder.id) : ''}
                                                onValueChange={(id) => router.visit(`/pos?order=${id}`)}
                                            >
                                                <SelectTrigger className="min-h-[44px]">
                                                    <SelectValue placeholder="Pilih open bill..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {openOrders.map((o) => (
                                                        <SelectItem key={o.id} value={String(o.id)}>
                                                            #{o.id} – {o.table?.name ?? '-'} – Rp {money(o.total_amount)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Active order detail */}
                            {activeOrder && expandedCards.has('bills') && (
                                <div className="bg-card rounded-xl border">
                                    {/* Header */}
                                    <div className="flex w-full items-center gap-2 px-4 py-3">
                                        <div className="flex-1 text-left">
                                            <p className="font-semibold">
                                                {activeOrder.table?.name} · Rp {money(activeOrderTotal)}
                                            </p>
                                            <p className="text-muted-foreground text-xs">Order #{activeOrder.id}</p>
                                        </div>
                                        <Badge variant={activeOrder.status === 'submitted' ? 'default' : 'secondary'}>{activeOrder.status}</Badge>
                                    </div>

                                    <div className="space-y-3 border-t px-4 py-4">
                                        {/* Primary actions */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                type="button"
                                                className="min-h-[48px]"
                                                onClick={() => {
                                                    setCartTarget(`bill:${activeOrder.id}` as CartTarget);
                                                    setDrawerMode('new_order');
                                                    setDrawerOpen(true);
                                                }}
                                            >
                                                <Plus className="size-4" /> Tambah Item
                                            </Button>
                                            <Button type="button" className="min-h-[48px]" variant="outline" onClick={openDrawerForPayBill}>
                                                <Banknote className="size-4" /> Bayar
                                            </Button>
                                        </div>

                                        {/* Items collapsible */}
                                        <button
                                            type="button"
                                            className="text-muted-foreground flex w-full items-center justify-between text-xs font-semibold tracking-wide uppercase"
                                            onClick={() => setBillItemsExpanded((v) => !v)}
                                        >
                                            <span>Item ({activeOrder.items.length})</span>
                                            {billItemsExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                        </button>

                                        {billItemsExpanded && (
                                            <div className="space-y-2">
                                                {activeOrderSections.map((section) => (
                                                    <div key={section.label}>
                                                        <p className="text-muted-foreground mb-1 text-xs font-semibold">{section.label}</p>
                                                        <div className="bg-background rounded-lg border">
                                                            {section.items.map((item) => (
                                                                <div
                                                                    key={item.ids.join('-')}
                                                                    className="flex items-center gap-2 border-b px-3 py-2 last:border-0"
                                                                >
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="truncate text-sm font-medium">{item.menu_item?.name}</p>
                                                                        {item.notes && <p className="text-muted-foreground text-xs">{item.notes}</p>}
                                                                    </div>
                                                                    <Badge
                                                                        variant={item.status === 'pending' ? 'destructive' : 'outline'}
                                                                        className="shrink-0 text-xs"
                                                                    >
                                                                        {item.status}
                                                                    </Badge>
                                                                    <span className="shrink-0 text-sm">×{item.quantity}</span>
                                                                    <span className="text-muted-foreground w-18 shrink-0 text-right text-xs">
                                                                        Rp {money(item.subtotal)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Step 1: Kirim ke dapur */}
                                        <Button
                                            type="button"
                                            className="min-h-[44px] w-full"
                                            variant={pendingActiveItems.length > 0 ? 'default' : 'outline'}
                                            disabled={!['open', 'submitted'].includes(activeOrder.status) || pendingActiveItems.length === 0}
                                            onClick={() => router.post(`/pos/orders/${activeOrder.id}/submit`, {}, { preserveScroll: true })}
                                        >
                                            <Send className="size-4" />
                                            {pendingActiveItems.length > 0
                                                ? `Kirim ${pendingActiveItems.length} Item ke Dapur/Bar`
                                                : 'Semua Item Sudah Dikirim'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PANEL: SELF ORDER ── */}
                    {activePanel === 'self_order' && (
                        <div className="space-y-4">
                            {paidSelfOrderReceipts.length > 0 && (
                                <div className="bg-card space-y-3 rounded-xl border p-4">
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
                                    {paginatedPaidReceipts.map((so) => {
                                        const tx = so.order?.transaction;
                                        return (
                                            <div key={`paid-${so.id}`} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-emerald-900">{so.table_name ?? so.table?.name ?? '-'}</p>
                                                        <p className="text-xs text-emerald-700">
                                                            {so.customer_name} · Rp {money(so.total_amount)}
                                                        </p>
                                                        {tx?.paid_at && (
                                                            <p className="text-xs text-emerald-600">{new Date(tx.paid_at).toLocaleString('id-ID')}</p>
                                                        )}
                                                    </div>
                                                    <Badge className="bg-emerald-600">Lunas</Badge>
                                                </div>
                                                <div className="mt-3 flex gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="min-h-[44px] flex-1"
                                                        variant="outline"
                                                        disabled={!tx}
                                                        onClick={() => tx && router.visit(`/pos/transactions/${tx.id}/receipt`)}
                                                    >
                                                        <ReceiptText className="size-4" /> Cetak Struk
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="min-h-[44px]"
                                                        title="Tandai sudah dicetak"
                                                        onClick={() =>
                                                            router.post(
                                                                `/pos/self-orders/${so.id}/receipt-printed`,
                                                                {},
                                                                { preserveScroll: true, preserveState: true },
                                                            )
                                                        }
                                                    >
                                                        <CheckCircle2 className="size-4" /> Selesai
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <Pagination
                                        page={receiptPage}
                                        total={paidSelfOrderReceipts.length}
                                        pageSize={PAGE_SIZE}
                                        onPage={setReceiptPage}
                                    />
                                </div>
                            )}

                            <div className="bg-card rounded-xl border">
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-2 px-4 py-3 font-semibold"
                                    onClick={() => toggleCard('self_order')}
                                >
                                    <Bell className="size-4" />
                                    <span className="flex-1 text-left">Menunggu Persetujuan</span>
                                    {selfOrders.length > 0 && <Badge variant="destructive">{selfOrders.length}</Badge>}
                                    {expandedCards.has('self_order') ? (
                                        <ChevronUp className="text-muted-foreground size-4" />
                                    ) : (
                                        <ChevronDown className="text-muted-foreground size-4" />
                                    )}
                                </button>
                                {expandedCards.has('self_order') && (
                                    <div className="space-y-3 border-t px-4 py-4">
                                        {selfOrders.length === 0 && (
                                            <p className="text-muted-foreground text-sm">
                                                {paidSelfOrderReceipts.length === 0
                                                    ? 'Tidak ada self order saat ini.'
                                                    : 'Tidak ada yang menunggu persetujuan.'}
                                            </p>
                                        )}

                                        {selfOrders.length > 1 && (
                                            <Button
                                                type="button"
                                                className="min-h-[44px] w-full"
                                                disabled={approvingAll}
                                                onClick={approveAllSelfOrders}
                                            >
                                                <CheckCircle2 className="size-4" />
                                                {approvingAll
                                                    ? 'Memproses...'
                                                    : `Terima Semua QRIS (${selfOrders.filter((s) => s.payment_preference === 'qris').length})`}
                                            </Button>
                                        )}

                                        {paginatedSelfOrders.map((so) => {
                                            const tableName = so.table_name ?? so.table?.name ?? '-';
                                            const isQris = so.payment_preference === 'qris';
                                            return (
                                                <div key={so.id} className="space-y-2 rounded-lg border p-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="font-semibold">{tableName}</p>
                                                            <p className="text-muted-foreground text-xs">
                                                                {so.customer_name ?? 'Customer'} · Rp {money(so.total_amount)}
                                                            </p>
                                                            {so.customer_email && (
                                                                <p className="text-muted-foreground text-xs">{so.customer_email}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <Badge variant={isQris ? 'default' : 'secondary'}>
                                                                {isQris ? (
                                                                    <>
                                                                        <QrCode className="mr-1 size-3" />
                                                                        QRIS
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Banknote className="mr-1 size-3" />
                                                                        Kasir
                                                                    </>
                                                                )}
                                                            </Badge>
                                                            <span className="text-muted-foreground text-xs">{so.items.length} item</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-muted/50 space-y-1 rounded-lg p-2">
                                                        {so.items.map((item) => (
                                                            <div key={item.id} className="flex justify-between text-xs">
                                                                <span>
                                                                    {item.menu_item?.name ?? item.name}
                                                                    {item.notes && <span className="text-muted-foreground"> ({item.notes})</span>}
                                                                </span>
                                                                <span className="font-medium">×{item.quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {so.notes && (
                                                        <p className="bg-muted/40 text-muted-foreground rounded px-2 py-1 text-xs">{so.notes}</p>
                                                    )}
                                                    <p
                                                        className={`rounded px-2 py-1 text-xs ${isQris ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}
                                                    >
                                                        {isQris
                                                            ? 'Customer bayar via QRIS – setelah diterima, diarahkan ke halaman pembayaran.'
                                                            : 'Customer bayar di kasir – setelah diterima, proses di tab Tagihan.'}
                                                    </p>
                                                    {isQris ? (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="min-h-[44px]"
                                                                onClick={() => approveSelfOrder(so.id)}
                                                            >
                                                                <CheckCircle2 className="size-4" /> Terima
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground min-h-[44px]"
                                                                variant="outline"
                                                                onClick={() => rejectSelfOrder(so.id)}
                                                            >
                                                                <XCircle className="size-4" /> Tolak
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="min-h-[44px] xl:hidden"
                                                                onClick={() => openDrawerForCashierSelfOrder(so)}
                                                            >
                                                                <Banknote className="size-4" /> Terima & Bayar
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="hidden min-h-[44px] xl:flex"
                                                                onClick={() => {
                                                                    openDrawerForCashierSelfOrder(so);
                                                                    setActivePanel('cart');
                                                                }}
                                                            >
                                                                <Banknote className="size-4" /> Terima & Bayar
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground min-h-[44px]"
                                                                variant="outline"
                                                                onClick={() => rejectSelfOrder(so.id)}
                                                            >
                                                                <XCircle className="size-4" /> Tolak
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        <Pagination page={selfOrderPage} total={selfOrders.length} pageSize={PAGE_SIZE} onPage={setSelfOrderPage} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── PANEL: CETAK DAPUR/BAR ── */}
                    {activePanel === 'station_print' && (
                        <div className="bg-card rounded-xl border">
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 px-4 py-3 font-semibold"
                                onClick={() => toggleCard('station_print')}
                            >
                                <Printer className="size-4" />
                                <span className="flex-1 text-left">Cetak Dapur/Bar</span>
                                {pendingStationTickets.length > 0 && <Badge variant="destructive">{pendingStationTickets.length}</Badge>}
                                {expandedCards.has('station_print') ? (
                                    <ChevronUp className="text-muted-foreground size-4" />
                                ) : (
                                    <ChevronDown className="text-muted-foreground size-4" />
                                )}
                            </button>
                            {expandedCards.has('station_print') && (
                                <div className="space-y-3 border-t px-4 py-4">
                                    {pendingStationTickets.length === 0 ? (
                                        <div className="rounded-xl border-2 border-dashed p-8 text-center">
                                            <Printer className="text-muted-foreground/40 mx-auto size-8" />
                                            <p className="text-muted-foreground mt-2 text-sm">Tidak ada tiket yang menunggu cetak.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Button type="button" className="min-h-[48px] w-full" onClick={printAllTickets}>
                                                <Printer className="size-4" />
                                                Cetak Semua ({pendingStationTickets.length} tiket)
                                            </Button>
                                            <p className="text-muted-foreground text-center text-xs">Atau cetak satu per satu di bawah</p>
                                            {paginatedPendingTickets.map((ticket) => (
                                                <div key={`${ticket.type}-${ticket.id}`} className="rounded-lg border p-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="flex items-center gap-1.5 font-semibold">
                                                                {ticket.type === 'kitchen' ? (
                                                                    <ChefHat className="size-4 text-orange-500" />
                                                                ) : (
                                                                    <GlassWater className="size-4 text-blue-500" />
                                                                )}
                                                                {ticket.type === 'kitchen' ? 'Kitchen' : 'Bar'} – {ticket.station_name ?? '-'}
                                                            </p>
                                                            <p className="text-muted-foreground mt-0.5 text-xs">
                                                                Order #{ticket.order_id} · {ticket.table_name ?? '-'} · {ticket.zone_name ?? '-'}
                                                            </p>
                                                            {ticket.sent_at && (
                                                                <p className="text-muted-foreground text-xs">
                                                                    {new Date(ticket.sent_at).toLocaleString('id-ID')}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <Badge variant="outline" className="border-amber-400 text-amber-600">
                                                            Belum Cetak
                                                        </Badge>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="mt-3 min-h-[44px] w-full"
                                                        variant="outline"
                                                        onClick={() => router.visit(stationTicketUrl(ticket))}
                                                    >
                                                        <Printer className="size-4" /> Cetak Tiket
                                                    </Button>
                                                </div>
                                            ))}
                                            <Pagination
                                                page={stationPage}
                                                total={pendingStationTickets.length}
                                                pageSize={PAGE_SIZE}
                                                onPage={setStationPage}
                                            />
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PANEL: RIWAYAT CETAK ── */}
                    {activePanel === 'station_history' && (
                        <div className="bg-card rounded-xl border">
                            <button
                                type="button"
                                className="flex w-full items-center gap-2 px-4 py-3 font-semibold"
                                onClick={() => toggleCard('station_history')}
                            >
                                <ReceiptText className="size-4" />
                                <span className="flex-1 text-left">Riwayat Cetak</span>
                                {expandedCards.has('station_history') ? (
                                    <ChevronUp className="text-muted-foreground size-4" />
                                ) : (
                                    <ChevronDown className="text-muted-foreground size-4" />
                                )}
                            </button>
                            {expandedCards.has('station_history') && (
                                <div className="space-y-3 border-t px-4 py-4">
                                    {stationTicketHistory.length === 0 ? (
                                        <p className="text-muted-foreground text-sm">Belum ada riwayat cetak.</p>
                                    ) : (
                                        paginatedHistory.map((ticket) => (
                                            <div key={`history-${ticket.type}-${ticket.id}`} className="rounded-lg border p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="flex items-center gap-1.5 font-semibold">
                                                            {ticket.type === 'kitchen' ? (
                                                                <ChefHat className="size-4 text-orange-500" />
                                                            ) : (
                                                                <GlassWater className="size-4 text-blue-500" />
                                                            )}
                                                            {ticket.type === 'kitchen' ? 'Kitchen' : 'Bar'} – {ticket.station_name ?? '-'}
                                                        </p>
                                                        <p className="text-muted-foreground mt-0.5 text-xs">
                                                            Order #{ticket.order_id} · {ticket.table_name ?? '-'}
                                                        </p>
                                                        {ticket.printed_at && (
                                                            <p className="text-muted-foreground text-xs">
                                                                Dicetak: {new Date(ticket.printed_at).toLocaleString('id-ID')}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <Badge variant="secondary" className="flex items-center gap-1">
                                                        <CheckCircle2 className="size-3" /> Tercetak
                                                    </Badge>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="mt-3 min-h-[44px] w-full"
                                                    onClick={() => router.visit(stationTicketUrl(ticket, true))}
                                                >
                                                    <Printer className="size-4" /> Cetak Ulang
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                    {stationTicketHistory.length > PAGE_SIZE && (
                                        <Pagination
                                            page={historyPage}
                                            total={stationTicketHistory.length}
                                            pageSize={PAGE_SIZE}
                                            onPage={setHistoryPage}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </aside>

                {/* ── LEFT: Menu Browser ── */}
                <section ref={menuRef} className="order-2 space-y-4 xl:order-1">
                    <div className="hidden xl:block">
                        <h1 className="text-2xl font-semibold">POS Kasir</h1>
                        <p className="text-muted-foreground text-sm">Pilih menu lalu atur di panel kanan.</p>
                    </div>
                    <div className="xl:hidden">
                        <p className="text-muted-foreground text-sm font-semibold">Pilih Menu</p>
                    </div>

                    {/* Category tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                className={`min-h-[36px] shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${selectedCategoryId === String(cat.id) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
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
                                            onClick={() => handleMenuClick(item)}
                                            className={`border-border relative overflow-hidden rounded-xl border text-left transition-all active:scale-95 ${cartItem ? 'bg-primary/5 ring-primary/60 ring-2' : 'hover:ring-primary/30 hover:ring-1'}`}
                                        >
                                            <div className="bg-muted aspect-[4/3]">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                                                ) : (
                                                    <div className="text-muted-foreground flex h-full items-center justify-center">
                                                        <Package className="size-8" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <span className="block text-sm leading-tight font-semibold">{item.name}</span>
                                                <span className="text-primary mt-1.5 block text-sm font-bold">Rp {money(item.price)}</span>
                                                <span className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                                                    <Printer className="size-3" />
                                                    {printTargetLabels[item.print_to] ?? item.print_to}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">Belum ada menu di kategori ini.</p>
                        )
                    ) : (
                        <p className="text-muted-foreground text-sm">Belum ada kategori menu.</p>
                    )}
                </section>
            </main>

            <Dialog open={!!menuItemForAddon} onOpenChange={(open) => !open && setMenuItemForAddon(null)}>
                <DialogContent className="bg-surface overflow-hidden p-0 sm:max-w-md">
                    <DialogHeader className="p-4 pb-2 md:p-6">
                        <DialogTitle className="text-xl font-bold md:text-2xl">{menuItemForAddon?.name}</DialogTitle>
                        <p className="text-muted-foreground text-sm">Rp {money(menuItemForAddon?.price || 0)}</p>
                    </DialogHeader>
                    <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4 md:p-6">
                        <h4 className="text-on-surface text-sm font-bold">Pilih Add-on (Opsional)</h4>
                        {menuItemForAddon?.addons?.map((addon) => (
                            <label
                                key={addon.id}
                                className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition-all select-none ${
                                    selectedAddonIds.includes(addon.id)
                                        ? 'border-primary bg-primary/5'
                                        : 'border-outline-variant hover:border-primary/50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        checked={selectedAddonIds.includes(addon.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedAddonIds([...selectedAddonIds, addon.id]);
                                            } else {
                                                setSelectedAddonIds(selectedAddonIds.filter((id) => id !== addon.id));
                                            }
                                        }}
                                        className="h-5 w-5 rounded-md"
                                    />
                                    <span className="text-on-surface text-base font-medium">{addon.name}</span>
                                </div>
                                <span className="text-primary text-sm font-bold">+Rp {money(addon.price)}</span>
                            </label>
                        ))}
                    </div>
                    <DialogFooter className="border-outline-variant bg-surface-container-lowest border-t p-4 md:p-6">
                        <div className="flex w-full gap-3">
                            <Button variant="outline" className="min-h-[48px] flex-1 rounded-xl font-bold" onClick={() => setMenuItemForAddon(null)}>
                                Batal
                            </Button>
                            <Button className="min-h-[48px] flex-1 rounded-xl font-bold shadow-md" onClick={confirmAddWithAddons}>
                                Tambahkan
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
