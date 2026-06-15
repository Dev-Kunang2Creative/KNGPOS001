import SelfOrderLayout from '@/layouts/SelfOrderLayout';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

import BillSelection from '@/components/self-order/BillSelection';
import BottomNav from '@/components/self-order/BottomNav';
import CartView from '@/components/self-order/CartView';
import MenuDetail from '@/components/self-order/MenuDetail';
import OrderHistoryView from '@/components/self-order/OrderHistoryView';
import PaymentSelection from '@/components/self-order/PaymentSelection';
import RestaurantMenu from '@/components/self-order/RestaurantMenu';

type MenuItem = {
    id: number;
    category_id: number;
    name: string;
    description?: string | null;
    price: string;
    print_to: string;
    image_url?: string | null;
    addons?: { id: number; name: string; price: string; is_active: boolean }[];
};
type Category = { id: number; name: string; description?: string | null; active_items: MenuItem[] };
type Table = { id: number; name: string; zone?: { name: string; color_hex: string } };
type CartItem = { menu_item_id: number; name: string; quantity: number; price: number; notes: string; image_url?: string | null; addons?: number[] };
type Props = { qrToken: string; table: Table; categories: Category[]; restaurant: { name: string; tax_percentage: number; tax_is_active: boolean; service_charge_percentage: number; service_charge_is_active: boolean } };

type ViewState = 'bill-selection' | 'menu' | 'detail' | 'cart' | 'payment' | 'orders';

export default function SelfOrderShow({ qrToken, table, categories, restaurant }: Props) {
    const { flash } = usePage<{ flash?: { error?: string; success?: string } }>().props;

    const { url } = usePage();
    const searchParams = new URLSearchParams(url.includes('?') ? url.substring(url.indexOf('?')) : '');
    const methodParam = searchParams.get('method') as 'open' | 'close' | null;
    const viewParam = searchParams.get('view') as ViewState | null;

    const currentMethod = methodParam;
    let currentView: ViewState = 'bill-selection';

    if (!currentMethod) {
        currentView = 'bill-selection';
    } else {
        currentView = viewParam && ['menu', 'detail', 'cart', 'payment', 'orders'].includes(viewParam) ? viewParam : 'menu';
    }

    const setView = (newView: ViewState) => {
        router.visit(`/s/${qrToken}?view=${newView}${currentMethod ? `&method=${currentMethod}` : ''}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleMethodChange = (newMethod: 'open' | 'close') => {
        router.visit(`/s/${qrToken}?view=menu&method=${newMethod}`, {
            preserveState: true,
            preserveScroll: true,
        });
    };
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

    // Customer Info
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [orderNotes, setOrderNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleContinueBillSelection = (type: 'open' | 'close') => {
        handleMethodChange(type);
    };

    const handleItemSelect = (item: MenuItem) => {
        setSelectedItem(item);
        setView('detail');
    };

    const handleAddToCart = (item: MenuItem, quantity: number, notes: string, addons: number[]) => {
        const addonPrice = item.addons?.filter((a) => addons.includes(a.id)).reduce((sum, a) => sum + Number(a.price), 0) ?? 0;
        const unitPrice = Number(item.price) + addonPrice;

        setCart((current) => {
            // Kita pisahkan item di keranjang jika addons-nya berbeda (meskipun menu_item_id sama)
            const addonsHash = [...addons].sort().join(',');
            const existingIndex = current.findIndex(
                (c) => c.menu_item_id === item.id && (c.addons ? [...c.addons].sort().join(',') : '') === addonsHash,
            );

            if (existingIndex !== -1) {
                const newCart = [...current];
                newCart[existingIndex] = {
                    ...newCart[existingIndex],
                    quantity: newCart[existingIndex].quantity + quantity,
                    notes: notes || newCart[existingIndex].notes,
                };
                return newCart;
            }
            return [...current, { menu_item_id: item.id, name: item.name, price: unitPrice, quantity, notes, image_url: item.image_url, addons }];
        });
        setSelectedItem(null);
        setView('menu');
    };

    const handleUpdateQuantity = (cartIndex: number, delta: number) => {
        setCart((current) => current.map((item, index) => (index === cartIndex ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)));
    };

    const handleRemoveItem = (cartIndex: number) => {
        setCart((current) => current.filter((_, index) => index !== cartIndex));
    };

    const handleUpdateCustomer = (name: string, email: string, notes: string) => {
        setCustomerName(name);
        setCustomerEmail(email);
        setOrderNotes(notes);
    };

    const handlePay = (paymentMethod: 'qris' | 'cashier' | 'online') => {
        setIsProcessing(true);
        router.post(
            `/s/${qrToken}/orders`,
            {
                customer_name: customerName,
                customer_email: customerEmail,
                payment_preference: paymentMethod,
                bill_type: currentMethod,
                notes: orderNotes,
                items: cart.map((item) => ({
                    menu_item_id: item.menu_item_id,
                    quantity: item.quantity,
                    notes: item.notes || undefined,
                    addons: item.addons && item.addons.length > 0 ? item.addons : undefined,
                })),
            },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setIsProcessing(false),
                onError: (errors) => {
                    const firstError = Object.values(errors)[0];
                    if (firstError) {
                        alert(firstError);
                    }
                    if (errors.customer_name || errors.customer_email) {
                        setView('cart');
                    }
                },
            },
        );
    };

    return (
        <SelfOrderLayout title={`Self Order - ${restaurant.name} - ${table.name}`}>
            {flash?.error && (
                <div className="border-error/40 bg-error-container text-on-error-container fixed top-20 right-0 left-0 z-[100] mx-auto w-[90%] max-w-[calc(28rem-2rem)] rounded-md border p-3 text-sm shadow-md">
                    {flash.error}
                </div>
            )}

            {currentView === 'bill-selection' && <BillSelection onContinue={handleContinueBillSelection} />}

            {(currentView === 'menu' || (currentView === 'detail' && !selectedItem)) && (
                <RestaurantMenu
                    table={table}
                    restaurant={restaurant}
                    categories={categories}
                    onItemSelect={handleItemSelect}
                    onViewCart={() => setView('cart')}
                    cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
                    currentMethod={currentMethod}
                    onMethodChange={handleMethodChange}
                />
            )}

            {currentView === 'detail' && selectedItem && (
                <MenuDetail item={selectedItem} restaurant={restaurant} onAddToCart={handleAddToCart} onBack={() => setView('menu')} />
            )}

            {currentView === 'cart' && (
                <CartView
                    table={table}
                    cart={cart}
                    customerName={customerName}
                    customerEmail={customerEmail}
                    orderNotes={orderNotes}
                    onUpdateCustomer={handleUpdateCustomer}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onBack={() => setView('menu')}
                    onContinue={() => setView('payment')}
                />
            )}

            {currentView === 'payment' && currentMethod && (
                <PaymentSelection
                    isProcessing={isProcessing}
                    table={table}
                    cart={cart}
                    billType={currentMethod}
                    restaurant={restaurant}
                    onBack={() => setView('cart')}
                    onPay={handlePay}
                />
            )}

            {currentView === 'orders' && <OrderHistoryView qrToken={qrToken} onBack={() => setView('menu')} />}

            {(currentView === 'menu' || currentView === 'cart' || currentView === 'orders') && (
                <BottomNav
                    activeTab={currentView === 'menu' ? 'menu' : currentView === 'cart' ? 'cart' : 'status'}
                    cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
                    onMenuClick={() => setView('menu')}
                    onCartClick={() => setView('cart')}
                    onStatusClick={() => setView('orders')}
                />
            )}
        </SelfOrderLayout>
    );
}
