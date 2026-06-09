import { useState } from 'react';

type CartItem = { menu_item_id: number; name: string; quantity: number; price: number; notes: string; image_url?: string | null };
type Table = { id: number; name: string };

type Props = {
    table: Table;
    cart: CartItem[];
    customerName: string;
    customerEmail: string;
    orderNotes: string;
    onUpdateCustomer: (name: string, email: string, notes: string) => void;
    onUpdateQuantity: (menuItemId: number, delta: number) => void;
    onRemoveItem: (menuItemId: number) => void;
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
        <div className="bg-surface text-on-surface font-body-md pt-safe flex min-h-screen flex-col antialiased">
            <header className="bg-surface border-outline-variant pt-safe px-4 fixed top-0 left-0 right-0 mx-auto max-w-md z-40 flex h-16 w-full items-center border-b shadow-sm">
                <button
                    onClick={onBack}
                    aria-label="Kembali"
                    className="text-on-surface-variant -ml-2 rounded-full p-2 transition-transform active:scale-95"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-headline-md text-on-surface ml-2 flex-1 pr-8 text-center">Keranjang</h1>
            </header>

            <main className="px-4 md:px-lg gap-4 mx-auto flex w-full max-w-3xl flex-1 flex-col pt-[80px] pb-[200px]">
                <section className="bg-surface-container-lowest border-outline-variant p-4 flex items-center justify-between rounded-xl border shadow-sm">
                    <h2 className="text-label-lg text-on-surface">Tempat Duduk</h2>
                    <span className="bg-primary text-on-primary text-label-lg rounded-full px-3 py-1">{table.name}</span>
                </section>

                <section className="bg-secondary-fixed text-on-secondary-fixed p-4 rounded-xl border border-[#d4af37] shadow-sm">
                    <p className="text-body-md text-on-secondary-fixed">Pastikan meja kamu sudah sesuai dengan yang tertera di atas.</p>
                </section>

                <section className="bg-surface-container-lowest border-outline-variant p-4 gap-4 flex flex-col rounded-xl border shadow-sm">
                    <div className="gap-1 flex flex-col">
                        <label htmlFor="customer-name" className="text-label-lg text-on-surface">
                            Nama
                        </label>
                        <input
                            id="customer-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-surface-container-low border-outline-variant p-2 text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary w-full rounded-lg border transition-colors focus:ring-1 focus:outline-none"
                            placeholder="Masukkan nama lengkap"
                        />
                    </div>
                    <div className="gap-1 flex flex-col">
                        <label htmlFor="customer-email" className="text-label-lg text-on-surface">
                            Email
                        </label>
                        <input
                            id="customer-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-surface-container-low border-outline-variant p-2 text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary w-full rounded-lg border transition-colors focus:ring-1 focus:outline-none"
                            placeholder="nama@email.com (opsional untuk struk)"
                        />
                    </div>
                </section>

                <h2 className="text-headline-md text-on-surface mt-2 mb-1">Rincian Pesanan</h2>

                <section className="bg-surface-container-lowest border-outline-variant p-4 gap-6 flex flex-col rounded-xl border shadow-sm">
                    {cart.length === 0 ? (
                        <p className="text-on-surface-variant py-4 text-center">Keranjang kosong</p>
                    ) : (
                        cart.map((item) => (
                            <article
                                key={item.menu_item_id}
                                className="border-outline-variant pb-4 flex items-start justify-between border-b last:border-0 last:pb-0"
                            >
                                <div className="pr-4 min-w-0 flex-1">
                                    <h3 className="text-label-lg text-on-surface mb-1">{item.name}</h3>
                                    {item.notes && <p className="text-body-md text-on-surface-variant">{item.notes}</p>}
                                    <div className="gap-2 mt-4 flex items-center">
                                        <p className="text-headline-md text-on-surface">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p>
                                        <button
                                            onClick={() => onRemoveItem(item.menu_item_id)}
                                            className="border-outline-variant text-error hover:bg-surface-container-low flex items-center gap-1 rounded-full border px-3 py-1 transition-transform active:scale-95"
                                        >
                                            <span className="text-label-md">Hapus</span>
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="gap-2 flex flex-col items-center">
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
                                            onClick={() => onUpdateQuantity(item.menu_item_id, -1)}
                                            aria-label="Kurangi jumlah"
                                            className="text-error transition-transform hover:opacity-80 active:scale-90"
                                        >
                                            <span className="material-symbols-outlined text-[24px]">remove_circle_outline</span>
                                        </button>
                                        <span className="text-label-lg text-on-surface w-4 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => onUpdateQuantity(item.menu_item_id, 1)}
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

                <section className="bg-surface-container-lowest border-outline-variant p-4 rounded-xl border shadow-sm">
                    <h3 className="text-label-lg text-on-surface mb-1">Catatan Tambahan</h3>
                    <p className="text-body-md text-on-surface-variant mb-2">Opsional</p>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="bg-surface-container-low border-outline-variant p-2 text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-primary w-full resize-none rounded-lg border transition-colors focus:ring-1 focus:outline-none"
                        placeholder="Ada pesan khusus untuk seluruh pesanan?"
                        rows={3}
                    ></textarea>
                </section>
            </main>

            <div className="bg-surface-container-lowest border-outline-variant fixed bottom-[96px] left-0 right-0 mx-auto max-w-md z-40 w-full border-t shadow-[0px_-4px_12px_rgba(0,0,0,0.05)]">
                <div className="px-4 py-4">
                    <button
                        onClick={handleContinue}
                        disabled={cart.length === 0}
                        className={`text-label-lg flex w-full items-center justify-center rounded-full py-4 shadow-[0px_4px_12px_rgba(0,0,0,0.1)] transition-transform duration-150 active:scale-[0.98] ${
                            cart.length > 0 ? 'bg-primary-container text-on-primary' : 'bg-surface-container-highest text-outline cursor-not-allowed'
                        }`}
                    >
                        <span>Lanjut Pembayaran</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
