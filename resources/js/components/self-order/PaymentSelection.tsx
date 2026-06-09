import { useState } from 'react';

type CartItem = { menu_item_id: number; name: string; quantity: number; price: number; notes: string };
type Table = { id: number; name: string };

type Props = {
    table: Table;
    cart: CartItem[];
    billType: 'open' | 'close';
    onBack: () => void;
    onPay: (paymentMethod: 'qris' | 'cashier') => void;
};

export default function PaymentSelection({ table, cart, billType, onBack, onPay }: Props) {
    const [selectedMethod, setSelectedMethod] = useState<'qris' | 'cashier'>('qris');
    const [isProcessing, setIsProcessing] = useState(false);

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // As per previous generic implementation, assuming no tax added by frontend logic unless backend returns it.
    // Wait, the mockup shows Tax & Service charge.
    // In Show.tsx previously, total was just the sum of items. I will stick to just the items sum, or add a visual tax if needed.
    // Let's just use the sum for now to match backend expectations.
    const total = subtotal;

    const handlePay = () => {
        setIsProcessing(true);
        onPay(selectedMethod);
    };

    return (
        <div className="bg-surface text-on-surface flex min-h-screen flex-col pt-16 pb-32 antialiased">
            <header className="bg-surface px-4 fixed top-0 left-0 right-0 mx-auto max-w-md z-50 flex h-16 w-full items-center justify-between shadow-[0px_4px_12px_rgba(0,0,0,0.05)] shadow-sm">
                <button
                    onClick={onBack}
                    aria-label="Go back"
                    className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-2 transition-colors transition-transform duration-200 active:scale-95"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-headline-md text-primary font-bold">Pembayaran</h1>
                <div className="w-10"></div>
            </header>

            <main className="px-4 py-6 gap-6 mx-auto flex w-full max-w-2xl flex-grow flex-col">
                <section className="bg-surface-container-lowest p-4 border-surface-variant rounded-xl border shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
                    <div className="mb-2 border-surface-variant pb-2 flex items-center justify-between border-b">
                        <div>
                            <h2 className="text-label-lg text-primary">Ringkasan Pesanan</h2>
                            <p className="text-body-md text-on-surface-variant mt-1">{table.name}</p>
                        </div>
                        <div className="bg-primary-container text-on-primary-container px-2 py-1 text-label-md rounded-full">Makan di tempat</div>
                    </div>

                    <div className="space-y-sm py-2">
                        {cart.map((item) => (
                            <div key={item.menu_item_id} className="gap-1 flex flex-col">
                                <div className="flex justify-between">
                                    <span className="text-body-md text-on-surface">
                                        {item.name} x{item.quantity}
                                    </span>
                                    <span className="text-body-md text-on-surface font-medium">
                                        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                                    </span>
                                </div>
                                {item.notes && (
                                    <div className="pl-4 space-y-xs">
                                        <p className="text-label-md text-on-surface-variant">{item.notes}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="border-surface-variant pt-2 mt-2 space-y-xs border-t">
                        <div className="mt-2 pt-2 border-surface-variant flex items-center justify-between border-t">
                            <span className="text-label-lg text-primary">Total</span>
                            <span className="text-headline-md text-primary font-bold">Rp {total.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </section>

                <section className="gap-2 flex flex-col">
                    <h3 className="text-label-lg text-on-surface px-1">Pilih Metode Pembayaran</h3>

                    <label
                        className={`group bg-surface-container-lowest p-4 hover:border-primary-container relative flex cursor-pointer items-center justify-between rounded-xl border shadow-[0px_4px_12px_rgba(0,0,0,0.05)] transition-colors ${selectedMethod === 'qris' ? 'border-primary' : 'border-surface-variant'}`}
                    >
                        <div className="gap-4 flex items-center">
                            <div className="bg-surface-container text-primary flex h-12 w-12 items-center justify-center rounded-lg">
                                <span className="material-symbols-outlined">qr_code_scanner</span>
                            </div>
                            <span className="text-label-lg text-on-surface">QRIS</span>
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

                    {billType === 'open' && (
                        <label
                            className={`group bg-surface-container-lowest p-4 hover:border-primary-container relative flex cursor-pointer items-center justify-between rounded-xl border shadow-[0px_4px_12px_rgba(0,0,0,0.05)] transition-colors ${selectedMethod === 'cashier' ? 'border-primary' : 'border-surface-variant'}`}
                        >
                            <div className="gap-4 flex items-center">
                                <div className="bg-surface-container text-primary flex h-12 w-12 items-center justify-center rounded-lg">
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                                <span className="text-label-lg text-on-surface">Bayar di Kasir Nanti</span>
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
                    )}

                    {billType === 'close' && (
                        <label
                            className={`group bg-surface-container-lowest p-4 hover:border-primary-container relative flex cursor-pointer items-center justify-between rounded-xl border shadow-[0px_4px_12px_rgba(0,0,0,0.05)] transition-colors ${selectedMethod === 'cashier' ? 'border-primary' : 'border-surface-variant'}`}
                        >
                            <div className="gap-4 flex items-center">
                                <div className="bg-surface-container text-primary flex h-12 w-12 items-center justify-center rounded-lg">
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                                <span className="text-label-lg text-on-surface">Bayar di Kasir Sekarang</span>
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
                    )}
                </section>
            </main>

            <div className="bg-surface-container-lowest px-4 py-4 border-surface-variant fixed bottom-0 left-0 right-0 mx-auto max-w-md z-40 w-full rounded-t-xl border-t pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0px_-8px_24px_rgba(0,0,0,0.08)]">
                <div className="gap-4 mx-auto flex w-full max-w-2xl items-center">
                    <div className="hidden min-w-[120px] flex-col sm:flex">
                        <span className="text-label-md text-on-surface-variant">Total Pembayaran</span>
                        <span className="text-headline-md text-primary font-bold">Rp {total.toLocaleString('id-ID')}</span>
                    </div>
                    <button
                        onClick={handlePay}
                        disabled={isProcessing}
                        className="bg-primary text-on-primary text-label-lg gap-2 hover:bg-primary-container flex h-[56px] flex-grow items-center justify-center rounded-full shadow-[0px_4px_12px_rgba(0,0,0,0.1)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isProcessing ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined icon-fill">check_circle</span>
                        )}
                        <span>{selectedMethod === 'qris' ? 'Bayar Sekarang' : 'Kirim Pesanan'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
