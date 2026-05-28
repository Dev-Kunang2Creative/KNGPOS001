import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';

type MenuItem = { id: number; category_id: number; name: string; description?: string | null; price: string; print_to: string };
type Category = { id: number; name: string; description?: string | null; active_items: MenuItem[] };
type Table = { id: number; name: string; zone?: { name: string; color_hex: string } };
type CartItem = { menu_item_id: number; name: string; quantity: number; price: number; notes: string };
type Props = { qrToken: string; table: Table; categories: Category[] };

export default function SelfOrderShow({ qrToken, table, categories }: Props) {
    const { flash } = usePage<{ flash?: { error?: string; success?: string } }>().props;
    const form = useForm({ notes: '', items: [] as { menu_item_id: number; quantity: number; notes?: string }[] });
    const [cart, setCart] = useState<CartItem[]>([]);
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    function addItem(menuItem: MenuItem) {
        setCart((current) => {
            const existing = current.find((item) => item.menu_item_id === menuItem.id);

            if (existing) {
                return current.map((item) => item.menu_item_id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item);
            }

            return [...current, { menu_item_id: menuItem.id, name: menuItem.name, price: Number(menuItem.price), quantity: 1, notes: '' }];
        });
    }

    function changeQuantity(menuItemId: number, delta: number) {
        setCart((current) => current.map((item) => item.menu_item_id === menuItemId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
    }

    function checkout() {
        form.transform((data) => ({
            ...data,
            items: cart.map((item) => ({ menu_item_id: item.menu_item_id, quantity: item.quantity, notes: item.notes || undefined })),
        })).post(`/s/${qrToken}/orders`, { preserveScroll: true });
    }

    return (
        <>
            <Head title={`Self Order ${table.name}`} />
            <main className="min-h-screen bg-background">
                <div className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[1fr_360px]">
                    <section className="space-y-4">
                        <div className="border-b pb-4">
                            <p className="text-sm text-muted-foreground">{table.zone?.name}</p>
                            <h1 className="text-2xl font-semibold">{table.name}</h1>
                        </div>
                        {flash?.error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{flash.error}</div>}
                        {categories.map((category) => (
                            <div key={category.id}>
                                <h2 className="mb-2 text-base font-semibold">{category.name}</h2>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {category.active_items.map((item) => (
                                        <button key={item.id} type="button" onClick={() => addItem(item)} className="rounded-md border p-3 text-left hover:bg-muted/50">
                                            <span className="block text-sm font-medium">{item.name}</span>
                                            {item.description && <span className="block text-xs text-muted-foreground">{item.description}</span>}
                                            <span className="mt-2 block text-sm">Rp {Number(item.price).toLocaleString('id-ID')}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>
                    <aside className="h-fit rounded-md border p-4">
                        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><ShoppingCart className="size-4" />Cart</h2>
                        <div className="space-y-3">
                            {cart.map((item) => (
                                <div key={item.menu_item_id} className="rounded-md border p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium">{item.name}</span>
                                        <Button type="button" size="icon" variant="ghost" onClick={() => setCart((current) => current.filter((cartItem) => cartItem.menu_item_id !== item.menu_item_id))}><Trash2 /></Button>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <Button type="button" size="icon" variant="outline" onClick={() => changeQuantity(item.menu_item_id, -1)}><Minus /></Button>
                                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                                        <Button type="button" size="icon" variant="outline" onClick={() => changeQuantity(item.menu_item_id, 1)}><Plus /></Button>
                                        <span className="ml-auto text-sm">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            ))}
                            <Input value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} placeholder="Catatan pesanan" />
                            <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
                                <span>Total</span>
                                <span>Rp {total.toLocaleString('id-ID')}</span>
                            </div>
                            <Button type="button" className="w-full" disabled={cart.length === 0 || form.processing} onClick={checkout}>Checkout QRIS</Button>
                        </div>
                    </aside>
                </div>
            </main>
        </>
    );
}
