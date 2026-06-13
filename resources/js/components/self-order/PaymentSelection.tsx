import { useState } from 'react';

type CartItem = { menu_item_id: number; name: string; quantity: number; price: number; notes: string };
type Table = { id: number; name: string };

type Props = {
 table: Table;
 cart: CartItem[];
 billType: 'open' | 'close';
 isProcessing: boolean;
 onBack: () => void;
 onPay: (paymentMethod: 'qris' | 'cashier') => void;
};

export default function PaymentSelection({ table, cart, billType, isProcessing, onBack, onPay }: Props) {
 const [selectedMethod, setSelectedMethod] = useState<'qris' | 'cashier'>(billType === 'open' ? 'cashier' : 'qris');

 const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
 // As per previous generic implementation, assuming no tax added by frontend logic unless backend returns it.
 // Wait, the mockup shows Tax & Service charge.
 // In Show.tsx previously, total was just the sum of items. I will stick to just the items sum, or add a visual tax if needed.
 // Let's just use the sum for now to match backend expectations.
 const total = subtotal;

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
 <h1 className="text-base font-bold text-primary font-bold">Pembayaran</h1>
 <div className="w-10"></div>
 </header>

 <main className="mx-auto flex w-full max-w-2xl flex-grow flex-col gap-6 px-4 py-6">
 <section className="bg-surface-container-lowest border-surface-variant rounded-xl border p-4 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
 <div className="border-surface-variant mb-2 flex items-center justify-between border-b pb-2">
 <div>
 <h2 className="text-sm font-semibold text-primary">Ringkasan Pesanan</h2>
 <p className="text-sm text-on-surface-variant mt-1">{table.name}</p>
 </div>
 <div className="bg-primary-container text-white text-xs font-medium rounded-full px-2 py-1">Makan di tempat</div>
 </div>

 <div className="space-y-sm py-2">
 {cart.map((item) => (
 <div key={item.menu_item_id} className="flex flex-col gap-1">
 <div className="flex justify-between">
 <span className="text-sm text-on-surface">
 {item.name} x{item.quantity}
 </span>
 <span className="text-sm text-on-surface font-medium">
 Rp {(item.price * item.quantity).toLocaleString('id-ID')}
 </span>
 </div>
 {item.notes && (
 <div className="space-y-xs pl-4">
 <p className="text-xs font-medium text-on-surface-variant">{item.notes}</p>
 </div>
 )}
 </div>
 ))}
 </div>

 <div className="border-surface-variant space-y-xs mt-2 border-t pt-2">
 <div className="border-surface-variant mt-2 flex items-center justify-between border-t pt-2">
 <span className="text-sm font-semibold text-primary">Total</span>
 <span className="text-base font-bold text-primary font-bold">Rp {total.toLocaleString('id-ID')}</span>
 </div>
 </div>
 </section>

 <section className="flex flex-col gap-2">
 {billType === 'close' ? (
 <>
 <h3 className="text-sm font-semibold text-on-surface px-1">Pilih Metode Pembayaran</h3>

 <label
 className={`group bg-surface-container-lowest hover:border-primary-container relative flex cursor-pointer items-center justify-between rounded-xl border p-4 shadow-[0px_4px_12px_rgba(0,0,0,0.05)] transition-colors ${selectedMethod === 'qris' ? 'border-primary' : 'border-surface-variant'}`}
 >
 <div className="flex items-center gap-4">
 <div className="bg-surface-container text-primary flex h-12 w-12 items-center justify-center rounded-lg">
 <span className="material-symbols-outlined">qr_code_scanner</span>
 </div>
 <span className="text-sm font-semibold text-on-surface">QRIS</span>
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
 className={`group bg-surface-container-lowest hover:border-primary-container relative flex cursor-pointer items-center justify-between rounded-xl border p-4 shadow-[0px_4px_12px_rgba(0,0,0,0.05)] transition-colors ${selectedMethod === 'cashier' ? 'border-primary' : 'border-surface-variant'}`}
 >
 <div className="flex items-center gap-4">
 <div className="bg-surface-container text-primary flex h-12 w-12 items-center justify-center rounded-lg">
 <span className="material-symbols-outlined">payments</span>
 </div>
 <span className="text-sm font-semibold text-on-surface">Bayar di Kasir Sekarang</span>
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
 <h3 className="text-sm font-semibold text-on-surface px-1">Opsi Pemesanan</h3>
 <div className="bg-primary-container text-white rounded-xl p-4 shadow-sm">
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
 <span className="text-xs font-medium text-on-surface-variant">Total Pembayaran</span>
 <span className="text-base font-bold text-primary font-bold">Rp {total.toLocaleString('id-ID')}</span>
 </div>
 <button
 onClick={handlePay}
 disabled={isProcessing}
 className="bg-primary text-white text-sm font-semibold hover:bg-primary-container flex h-[56px] flex-grow items-center justify-center gap-2 rounded-full shadow-[0px_4px_12px_rgba(0,0,0,0.1)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
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
