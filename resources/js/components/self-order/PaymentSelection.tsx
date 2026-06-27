import { useState } from 'react';

type CartItem = { menu_item_id: number; name: string; quantity: number; price: number; notes: string };
type Table = { id: number; name: string };

type Props = {
    table: Table;
    cart: CartItem[];
    billType: 'open' | 'close';
    isProcessing: boolean;
    restaurant: { tax_percentage: number; tax_is_active: boolean; service_charge_percentage: number; service_charge_is_active: boolean; name: string };
    onBack: () => void;
    onPay: (paymentMethod: 'qris' | 'cashier' | 'online') => void;
};

export default function PaymentSelection({ table, cart, billType, isProcessing, restaurant, onBack, onPay }: Props) {
    const [selectedMethod, setSelectedMethod] = useState<'qris' | 'cashier' | 'online'>(billType === 'open' ? 'cashier' : 'qris');

    const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartServiceCharge = restaurant.service_charge_is_active ? cartSubtotal * (Number(restaurant.service_charge_percentage) / 100) : 0;
    const cartTax = restaurant.tax_is_active ? (cartSubtotal + cartServiceCharge) * (Number(restaurant.tax_percentage) / 100) : 0;
    const total = cartSubtotal + cartServiceCharge + cartTax;

    const handlePay = () => {
        onPay(selectedMethod);
    };

    return (
        <div className="bg-surface text-on-surface flex min-h-screen flex-col pt-16 pb-32 antialiased">
            <header className="bg-surface fixed top-0 right-0 left-0 z-50 mx-auto flex h-16 w-full max-w-md items-center justify-between px-4 shadow-[0px_4px_12px_rgba(0,0,0,0.05)] shadow-sm">
                <button
                    onClick={onBack}
                    aria-label="Go back"
                    className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-2 transition-colors transition-transform duration-200 active:scale-95"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-primary text-base font-bold">Pembayaran</h1>
                <div className="w-10"></div>
            </header>

            <main className="mx-auto flex w-full max-w-2xl flex-grow flex-col gap-6 px-4 py-6">
                <section className="bg-surface-container-lowest border-surface-variant rounded-xl border p-4 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
                    <div className="border-surface-variant mb-2 flex items-center justify-between border-b pb-2">
                        <div>
                            <h2 className="text-primary text-sm font-semibold">Ringkasan Pesanan</h2>
                            <p className="text-on-surface-variant mt-1 text-sm">{table.name}</p>
                        </div>
                        <div className="bg-primary-container rounded-full px-2 py-1 text-xs font-medium text-white">Makan di tempat</div>
                    </div>

                    <div className="space-y-sm py-2">
                        {cart.map((item) => (
                            <div key={item.menu_item_id} className="flex flex-col gap-1">
                                <div className="flex justify-between">
                                    <span className="text-on-surface text-sm">
                                        {item.name} x{item.quantity}
                                    </span>
                                    <span className="text-on-surface text-sm font-medium">
                                        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                                    </span>
                                </div>
                                {item.notes && (
                                    <div className="space-y-xs pl-4">
                                        <p className="text-on-surface-variant text-xs font-medium">{item.notes}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="border-surface-variant space-y-xs mt-2 border-t pt-2">
                        {cartServiceCharge > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="text-on-surface text-sm">Subtotal</span>
                                <span className="text-on-surface text-sm">Rp {cartSubtotal.toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        {cartServiceCharge > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="text-on-surface text-sm">Service Charge ({restaurant.service_charge_percentage}%)</span>
                                <span className="text-on-surface text-sm">Rp {cartServiceCharge.toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        {cartTax > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="text-on-surface text-sm">PB1 ({restaurant.tax_percentage}%)</span>
                                <span className="text-on-surface text-sm">Rp {cartTax.toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        <div className="border-surface-variant mt-2 flex items-center justify-between border-t pt-2">
                            <span className="text-primary text-sm font-semibold">Total</span>
                            <span className="text-primary text-base font-bold">Rp {total.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </section>

                <section className="flex flex-col gap-2">
                    {billType === 'close' ? (
                        <>
                            <h3 className="text-on-surface px-1 text-sm font-semibold">Pilih Metode Pembayaran</h3>

                            <label
                                className={`group bg-surface-container-lowest hover:border-primary-container relative flex cursor-pointer items-center justify-between rounded-xl border p-4 shadow-[0px_4px_12px_rgba(0,0,0,0.05)] transition-colors ${selectedMethod === 'qris' ? 'border-primary' : 'border-surface-variant'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-surface-container text-primary flex h-12 w-12 items-center justify-center rounded-lg">
                                        <span className="material-symbols-outlined">qr_code_scanner</span>
                                    </div>
                                    <span className="text-on-surface text-sm font-semibold">QRIS</span>
                                </div>
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="qris"
                                    checked={selectedMethod === 'qris'}
                                    onChange={() => setSelectedMethod('qris')}
                                    className="text-primary border-outline-variant focus:ring-primary focus:ring-offset-surface h-5 w-5 cursor-pointer"
                                />
                            </label>

                            <label
                                className={`group bg-surface-container-lowest hover:border-primary-container relative flex cursor-pointer items-center justify-between rounded-xl border p-4 shadow-[0px_4px_12px_rgba(0,0,0,0.05)] transition-colors ${selectedMethod === 'online' ? 'border-primary' : 'border-surface-variant'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-surface-container text-primary flex h-12 w-12 items-center justify-center rounded-lg">
                                        <span className="material-symbols-outlined">account_balance_wallet</span>
                                    </div>
                                    <div>
                                        <span className="text-on-surface text-sm font-semibold">Bayar Online</span>
                                        <p className="text-on-surface-variant text-xs">E-wallet, Virtual Account, Kartu, Paylater</p>
                                    </div>
                                </div>
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="online"
                                    checked={selectedMethod === 'online'}
                                    onChange={() => setSelectedMethod('online')}
                                    className="text-primary border-outline-variant focus:ring-primary focus:ring-offset-surface h-5 w-5 cursor-pointer"
                                />
                            </label>

                            <label
                                className={`group bg-surface-container-lowest hover:border-primary-container relative flex cursor-pointer items-center justify-between rounded-xl border p-4 shadow-[0px_4px_12px_rgba(0,0,0,0.05)] transition-colors ${selectedMethod === 'cashier' ? 'border-primary' : 'border-surface-variant'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-surface-container text-primary flex h-12 w-12 items-center justify-center rounded-lg">
                                        <span className="material-symbols-outlined">payments</span>
                                    </div>
                                    <span className="text-on-surface text-sm font-semibold">Bayar di Kasir Sekarang</span>
                                </div>
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="cashier"
                                    checked={selectedMethod === 'cashier'}
                                    onChange={() => setSelectedMethod('cashier')}
                                    className="text-primary border-outline-variant focus:ring-primary focus:ring-offset-surface h-5 w-5 cursor-pointer"
                                />
                            </label>
                        </>
                    ) : (
                        <>
                            <h3 className="text-on-surface px-1 text-sm font-semibold">Opsi Pemesanan</h3>
                            <div className="bg-primary-container rounded-xl p-4 text-white shadow-sm">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined">receipt_long</span>
                                    <div>
                                        <p className="font-bold">Open Bill (Bayar Nanti)</p>
                                        <p className="mt-1 text-sm">
                                            Pesanan Anda akan ditambahkan ke tagihan meja ini. Anda dapat membayar sekaligus nanti di kasir.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>

            <div className="bg-surface-container-lowest border-surface-variant fixed right-0 bottom-0 left-0 z-40 mx-auto w-full max-w-md rounded-t-xl border-t px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0px_-8px_24px_rgba(0,0,0,0.08)]">
                <div className="mx-auto flex w-full max-w-2xl items-center gap-4">
                    <div className="hidden min-w-[120px] flex-col sm:flex">
                        <span className="text-on-surface-variant text-xs font-medium">Total Pembayaran</span>
                        <span className="text-primary text-base font-bold">Rp {total.toLocaleString('id-ID')}</span>
                    </div>
                    <button
                        onClick={handlePay}
                        disabled={isProcessing}
                        className="bg-primary hover:bg-primary-container flex h-[56px] flex-grow items-center justify-center gap-2 rounded-full text-sm font-semibold text-white shadow-[0px_4px_12px_rgba(0,0,0,0.1)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isProcessing ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined icon-fill">check_circle</span>
                        )}
                        <span>{selectedMethod === 'cashier' ? 'Kirim Pesanan' : 'Bayar Sekarang'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
