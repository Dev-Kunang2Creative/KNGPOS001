import { useState } from 'react';

type CartItem = { menu_item_id: number; name: string; quantity: number; price: number; notes: string; image_url?: string | null; addons?: number[] };
type Table = { id: number; name: string };

type Props = {
    table: Table;
    cart: CartItem[];
    customerName: string;
    customerEmail: string;
    orderNotes: string;
    onUpdateCustomer: (name: string, email: string, notes: string) => void;
    onUpdateQuantity: (cartIndex: number, delta: number) => void;
    onRemoveItem: (cartIndex: number) => void;
    onBack: () => void;
    onContinue: () => void;
};

export default function CartView({
    table,
    cart,
    customerName,
    customerEmail,
    orderNotes,
    onUpdateCustomer,
    onUpdateQuantity,
    onRemoveItem,
    onBack,
    onContinue,
}: Props) {
    const [name, setName] = useState(customerName);
    const [email, setEmail] = useState(customerEmail);
    const [notes, setNotes] = useState(orderNotes);

    const handleContinue = () => {
        onUpdateCustomer(name, email, notes);
        onContinue();
    };

    return (
        <div className="bg-surface text-on-surface pt-safe flex min-h-screen flex-col antialiased">
            <header className="bg-surface border-outline-variant pt-safe fixed top-0 right-0 left-0 z-40 mx-auto flex h-16 w-full max-w-md items-center border-b px-4 shadow-sm">
                <button
                    onClick={onBack}
                    aria-label="Kembali"
                    className="text-on-surface-variant -ml-2 rounded-full p-2 transition-transform active:scale-95"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-on-surface ml-2 flex-1 pr-8 text-center text-base font-bold">Keranjang</h1>
            </header>

            <main className="md:px-lg mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pt-[80px] pb-[200px]">
                <section className="bg-surface-container-lowest border-outline-variant flex items-center justify-between rounded-xl border p-4 shadow-sm">
                    <h2 className="text-on-surface text-sm font-semibold">Tempat Duduk</h2>
                    <span className="bg-primary rounded-full px-3 py-1 text-sm font-semibold text-white">{table.name}</span>
                </section>

                <section className="bg-secondary-fixed text-on-secondary-fixed rounded-xl border border-[#d4af37] p-4 shadow-sm">
                    <p className="text-on-secondary-fixed text-sm">Pastikan meja kamu sudah sesuai dengan yang tertera di atas.</p>
                </section>

                <section className="bg-surface-container-lowest border-outline-variant flex flex-col gap-4 rounded-xl border p-4 shadow-sm">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="customer-name" className="text-on-surface text-sm font-semibold">
                            Nama
                        </label>
                        <input
                            id="customer-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-surface-container-low border-outline-variant text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary w-full rounded-lg border p-2 text-sm transition-colors focus:ring-1 focus:outline-none"
                            placeholder="Masukkan nama lengkap"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="customer-email" className="text-on-surface text-sm font-semibold">
                            Email
                        </label>
                        <input
                            id="customer-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-surface-container-low border-outline-variant text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary w-full rounded-lg border p-2 text-sm transition-colors focus:ring-1 focus:outline-none"
                            placeholder="nama@email.com (opsional untuk struk)"
                        />
                    </div>
                </section>

                <h2 className="text-on-surface mt-2 mb-1 text-base font-bold">Rincian Pesanan</h2>

                <section className="bg-surface-container-lowest border-outline-variant flex flex-col gap-6 rounded-xl border p-4 shadow-sm">
                    {cart.length === 0 ? (
                        <p className="text-on-surface-variant py-4 text-center">Keranjang kosong</p>
                    ) : (
                        cart.map((item, index) => (
                            <article
                                key={`${item.menu_item_id}-${index}`}
                                className="border-outline-variant flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                            >
                                <div className="min-w-0 flex-1 pr-4">
                                    <h3 className="text-on-surface mb-1 text-sm font-semibold">{item.name}</h3>
                                    {item.addons && item.addons.length > 0 && (
                                        <p className="text-primary mb-1 text-xs font-medium">+{item.addons.length} Add-on</p>
                                    )}
                                    {item.notes && <p className="text-on-surface-variant text-sm">{item.notes}</p>}
                                    <div className="mt-4 flex items-center gap-2">
                                        <p className="text-on-surface text-base font-bold">
                                            Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                                        </p>
                                        <button
                                            onClick={() => onRemoveItem(index)}
                                            className="border-outline-variant text-error hover:bg-surface-container-low flex items-center gap-1 rounded-full border px-3 py-1 transition-transform active:scale-95"
                                        >
                                            <span className="text-xs font-medium">Hapus</span>
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt={item.name}
                                            className="bg-surface-container-low border-outline-variant h-20 w-20 rounded-lg border object-cover shadow-sm"
                                        />
                                    ) : (
                                        <div className="bg-surface-container-low border-outline-variant text-outline flex h-20 w-20 items-center justify-center rounded-lg border shadow-sm">
                                            <span className="material-symbols-outlined text-[32px]">restaurant</span>
                                        </div>
                                    )}
                                    <div className="mt-2 flex items-center gap-2">
                                        <button
                                            onClick={() => onUpdateQuantity(index, -1)}
                                            aria-label="Kurangi jumlah"
                                            className="text-error transition-transform hover:opacity-80 active:scale-90"
                                        >
                                            <span className="material-symbols-outlined text-[24px]">remove_circle_outline</span>
                                        </button>
                                        <span className="text-on-surface w-4 text-center text-sm font-semibold">{item.quantity}</span>
                                        <button
                                            onClick={() => onUpdateQuantity(index, 1)}
                                            aria-label="Tambah jumlah"
                                            className="text-primary transition-transform hover:opacity-80 active:scale-90"
                                        >
                                            <span className="material-symbols-outlined icon-fill text-[24px]">add_circle</span>
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </section>

                <section className="bg-surface-container-lowest border-outline-variant rounded-xl border p-4 shadow-sm">
                    <h3 className="text-on-surface mb-1 text-sm font-semibold">Catatan Tambahan</h3>
                    <p className="text-on-surface-variant mb-2 text-sm">Opsional</p>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="bg-surface-container-low border-outline-variant text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary w-full resize-none rounded-lg border p-2 text-sm transition-colors focus:ring-1 focus:outline-none"
                        placeholder="Ada pesan khusus untuk seluruh pesanan?"
                        rows={3}
                    ></textarea>
                </section>
            </main>

            <div className="bg-surface-container-lowest border-outline-variant fixed right-0 bottom-[68px] left-0 z-40 mx-auto w-full max-w-md border-t shadow-[0px_-4px_12px_rgba(0,0,0,0.05)]">
                <div className="px-4 py-4">
                    <button
                        onClick={handleContinue}
                        disabled={cart.length === 0 || !name.trim()}
                        className={`flex w-full items-center justify-center rounded-full py-4 text-sm font-semibold shadow-[0px_4px_12px_rgba(0,0,0,0.1)] transition-transform duration-150 active:scale-[0.98] ${
                            cart.length > 0 && name.trim()
                                ? 'bg-primary-container text-white'
                                : 'bg-surface-container-highest text-outline cursor-not-allowed'
                        }`}
                    >
                        <span>Lanjut Pembayaran</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
