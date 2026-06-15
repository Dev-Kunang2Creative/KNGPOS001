import { useState } from 'react';

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

type Props = {
    item: MenuItem;
    restaurant: { name: string };
    onBack: () => void;
    onAddToCart: (item: MenuItem, quantity: number, notes: string, addons: number[]) => void;
};

export default function MenuDetail({ item, restaurant, onBack, onAddToCart }: Props) {
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [selectedAddons, setSelectedAddons] = useState<number[]>([]);

    const updateQuantity = (change: number) => {
        setQuantity((q) => Math.max(1, q + change));
    };

    const toggleAddon = (addonId: number) => {
        setSelectedAddons((prev) => (prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]));
    };

    const price = Number(item.price);
    const addonPrice = item.addons?.filter((a) => selectedAddons.includes(a.id)).reduce((sum, a) => sum + Number(a.price), 0) ?? 0;
    const total = (price + addonPrice) * quantity;

    return (
        <div className="bg-surface text-on-surface pt-safe min-h-screen overflow-x-hidden pb-[160px] antialiased md:pb-[160px]">
            <header className="pt-safe fixed top-0 right-0 left-0 z-50 mx-auto w-full max-w-md transition-all duration-300">
                <div className="bg-surface text-primary hidden h-16 w-full items-center justify-between px-4 shadow-sm md:flex">
                    <button
                        onClick={onBack}
                        className="hover:bg-surface-container-low flex items-center rounded-full p-2 transition-colors active:scale-95"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-primary text-base font-bold">{restaurant.name}</h1>
                    <div className="w-10"></div>
                </div>
                <div className="mt-2 flex h-16 w-full items-center justify-between px-4 md:hidden">
                    <button
                        onClick={onBack}
                        className="bg-surface/80 text-primary elevation-1 rounded-full p-2 backdrop-blur-md transition-transform active:scale-95"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-[800px] md:mt-[80px]">
                <section className="md:mx-md bg-surface-container-high relative flex h-[353px] w-full items-center justify-center md:h-[400px] md:w-[calc(100%-32px)] md:overflow-hidden md:rounded-xl">
                    {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                        <span className="material-symbols-outlined text-outline text-[80px]">restaurant</span>
                    )}
                    <div className="from-surface absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t to-transparent md:hidden"></div>
                </section>

                <section className="md:pt-lg relative z-10 -mt-6 px-4 pt-2 md:mt-0">
                    <div className="mb-2 flex items-start justify-between">
                        <div>
                            <h1 className="text-on-surface mb-1 text-lg font-bold md:text-base">{item.name}</h1>
                            <div className="flex items-center gap-2">
                                <span className="text-primary text-base font-bold">Rp {price.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>

                    {item.description && <p className="text-on-surface-variant mb-6 text-sm leading-relaxed">{item.description}</p>}

                    <hr className="border-outline-variant/30 mb-6" />

                    {item.addons && item.addons.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-on-surface mb-3 text-base font-bold">Tambahan (Opsional)</h2>
                            <div className="space-y-3">
                                {item.addons.map((addon) => (
                                    <label
                                        key={addon.id}
                                        className={`border-outline-variant/50 flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                                            addon.is_active
                                                ? 'bg-surface-container-lowest hover:bg-surface-container-low cursor-pointer'
                                                : 'bg-surface-container cursor-not-allowed opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`flex h-5 w-5 items-center justify-center rounded border ${
                                                    selectedAddons.includes(addon.id)
                                                        ? 'bg-primary border-primary'
                                                        : addon.is_active
                                                          ? 'border-outline'
                                                          : 'border-outline-variant'
                                                }`}
                                            >
                                                {selectedAddons.includes(addon.id) && (
                                                    <span className="material-symbols-outlined text-on-primary text-[14px]">check</span>
                                                )}
                                            </div>
                                            <span className="text-on-surface text-sm font-medium">{addon.name}</span>
                                        </div>
                                        {addon.is_active ? (
                                            <span className="text-on-surface-variant text-sm">
                                                + Rp {Number(addon.price).toLocaleString('id-ID')}
                                            </span>
                                        ) : (
                                            <span className="text-error text-sm font-semibold">Tidak Tersedia/Habis</span>
                                        )}
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={selectedAddons.includes(addon.id)}
                                            disabled={!addon.is_active}
                                            onChange={() => addon.is_active && toggleAddon(addon.id)}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <hr className="border-outline-variant/30 mb-6" />

                    <div className="mb-12">
                        <h2 className="text-on-surface mb-4 text-base font-bold">Catatan Khusus</h2>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="bg-surface-container-lowest border-outline-variant text-on-surface placeholder:text-outline focus:ring-primary focus:border-primary h-24 w-full resize-none rounded-lg border p-4 text-sm transition-all focus:ring-2"
                            placeholder="Contoh: Tanpa saus, saus dipisah, dll."
                        ></textarea>
                    </div>

                    <div className="h-24"></div>
                </section>
            </main>

            <div className="elevation-2 pb-safe md:mb-xl fixed right-0 bottom-0 left-0 z-40 mx-auto w-full max-w-md md:bg-transparent md:p-0 md:shadow-none">
                <div className="bg-surface border-outline-variant/30 flex flex-col gap-4 rounded-t-xl border-t p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-on-surface text-sm font-bold">Mau berapa?</span>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => updateQuantity(-1)}
                                className="border-outline-variant text-on-surface flex h-8 w-8 items-center justify-center rounded-full border transition-transform active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[20px]">remove</span>
                            </button>
                            <span className="text-on-surface w-4 text-center text-base font-bold">{quantity}</span>
                            <button
                                onClick={() => updateQuantity(1)}
                                className="bg-secondary text-on-secondary flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-95"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => onAddToCart(item, quantity, notes, selectedAddons)}
                        className="bg-secondary-container text-on-secondary-container flex h-[56px] w-full items-center justify-center rounded-xl text-sm font-bold font-semibold shadow-sm transition-transform active:scale-[0.98]"
                    >
                        <span>Tambah Pesanan</span>
                        <span className="ml-2">- Rp {total.toLocaleString('id-ID')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
