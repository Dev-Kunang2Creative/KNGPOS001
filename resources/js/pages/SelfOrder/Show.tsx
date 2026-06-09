import SelfOrderLayout from '@/layouts/SelfOrderLayout';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

import BillSelection from '@/components/self-order/BillSelection';
import CartView from '@/components/self-order/CartView';
import MenuDetail from '@/components/self-order/MenuDetail';
import PaymentSelection from '@/components/self-order/PaymentSelection';
import RestaurantMenu from '@/components/self-order/RestaurantMenu';
import BottomNav from '@/components/self-order/BottomNav';

type MenuItem = {
    id: number;
    category_id: number;
    name: string;
    description?: string | null;
    price: string;
    print_to: string;
    image_url?: string | null;
};
type Category = { id: number; name: string; description?: string | null; active_items: MenuItem[] };
type Table = { id: number; name: string; zone?: { name: string; color_hex: string } };
type CartItem = { menu_item_id: number; name: string; quantity: number; price: number; notes: string; image_url?: string | null };
type Props = { qrToken: string; table: Table; categories: Category[] };

type ViewState = 'bill-selection' | 'menu' | 'detail' | 'cart' | 'payment';

export default function SelfOrderShow({ qrToken, table, categories }: Props) {
    const { flash } = usePage<{ flash?: { error?: string; success?: string } }>().props;

    const [view, setView] = useState<ViewState>('bill-selection');
    const [billType, setBillType] = useState<'open' | 'close' | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

    // Customer Info
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [orderNotes, setOrderNotes] = useState('');

    const handleContinueBillSelection = (type: 'open' | 'close') => {
        setBillType(type);
        setView('menu');
    };

    const handleItemSelect = (item: MenuItem) => {
        setSelectedItem(item);
        setView('detail');
    };

    const handleAddToCart = (item: MenuItem, quantity: number, notes: string) => {
        setCart((current) => {
            const existing = current.find((c) => c.menu_item_id === item.id);
            if (existing) {
                return current.map((c) => (c.menu_item_id === item.id ? { ...c, quantity: c.quantity + quantity, notes: notes || c.notes } : c));
            }
            return [...current, { menu_item_id: item.id, name: item.name, price: Number(item.price), quantity, notes, image_url: item.image_url }];
        });
        setSelectedItem(null);
        setView('menu');
    };

    const handleUpdateQuantity = (menuItemId: number, delta: number) => {
        setCart((current) =>
            current.map((item) => (item.menu_item_id === menuItemId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)),
        );
    };

    const handleRemoveItem = (menuItemId: number) => {
        setCart((current) => current.filter((item) => item.menu_item_id !== menuItemId));
    };

    const handleUpdateCustomer = (name: string, email: string, notes: string) => {
        setCustomerName(name);
        setCustomerEmail(email);
        setOrderNotes(notes);
    };

    const handlePay = (paymentMethod: 'qris' | 'cashier') => {
        router.post(
            `/s/${qrToken}/orders`,
            {
                customer_name: customerName,
                customer_email: customerEmail,
                payment_preference: paymentMethod,
                notes: orderNotes,
                items: cart.map((item) => ({ menu_item_id: item.menu_item_id, quantity: item.quantity, notes: item.notes || undefined })),
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    return (
        <SelfOrderLayout title={`Self Order - ${table.name}`}>
            {flash?.error && (
                <div className="border-error/40 bg-error-container text-on-error-container fixed top-20 left-0 right-0 mx-auto z-[100] w-[90%] max-w-[calc(28rem-2rem)] rounded-md border p-3 text-sm shadow-md">
                    {flash.error}
                </div>
            )}

            {view === 'bill-selection' && <BillSelection onContinue={handleContinueBillSelection} />}

            {view === 'menu' && (
                <RestaurantMenu
                    table={table}
                    categories={categories}
                    onItemSelect={handleItemSelect}
                    onViewCart={() => setView('cart')}
                    cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
                />
            )}

            {view === 'detail' && selectedItem && <MenuDetail item={selectedItem} onBack={() => setView('menu')} onAddToCart={handleAddToCart} />}

            {view === 'cart' && (
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

            {view === 'payment' && billType && (
                <PaymentSelection table={table} cart={cart} billType={billType} onBack={() => setView('cart')} onPay={handlePay} />
            )}

            {(view === 'menu' || view === 'cart') && (
                <BottomNav
                    activeTab={view === 'menu' ? 'menu' : 'cart'}
                    cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
                    onMenuClick={() => setView('menu')}
                    onCartClick={() => setView('cart')}
                    onStatusClick={() => {
                        alert('Silahkan selesaikan pesanan Anda terlebih dahulu untuk melihat status.');
                    }}
                />
            )}
        </SelfOrderLayout>
    );
}
