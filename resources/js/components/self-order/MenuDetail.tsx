import { useState } from 'react';

type MenuItem = {
 id: number;
 category_id: number;
 name: string;
 description?: string | null;
 price: string;
 print_to: string;
 image_url?: string | null;
};

type Props = {
 item: MenuItem;
 restaurant: { name: string };
 onBack: () => void;
 onAddToCart: (item: MenuItem, quantity: number, notes: string) => void;
};

export default function MenuDetail({ item, restaurant, onBack, onAddToCart }: Props) {
 const [quantity, setQuantity] = useState(1);
 const [notes, setNotes] = useState('');

 const updateQuantity = (change: number) => {
 setQuantity((q) => Math.max(1, q + change));
 };

 const price = Number(item.price);
 const total = price * quantity;

 return (
 <div className="bg-surface text-on-surface pt-safe min-h-screen overflow-x-hidden pb-[120px] antialiased md:pb-0">
 <header className="pt-safe fixed top-0 right-0 left-0 z-50 mx-auto w-full max-w-md transition-all duration-300">
 <div className="bg-surface text-primary hidden h-16 w-full items-center justify-between px-4 shadow-sm md:flex">
 <button
 onClick={onBack}
 className="hover:bg-surface-container-low flex items-center rounded-full p-2 transition-colors active:scale-95"
 >
 <span className="material-symbols-outlined">arrow_back</span>
 </button>
 <h1 className="text-base font-bold text-primary font-bold">{restaurant.name}</h1>
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
 <h1 className="text-lg font-bold md:text-base font-bold text-on-surface mb-1">{item.name}</h1>
 <div className="flex items-center gap-2">
 <span className="text-base font-bold text-primary font-bold">Rp {price.toLocaleString('id-ID')}</span>
 </div>
 </div>
 </div>

 {item.description && <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">{item.description}</p>}

 <hr className="border-outline-variant/30 mb-6" />

 <div className="mb-12">
 <h2 className="text-base font-bold text-on-surface mb-4">Catatan Khusus</h2>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="bg-surface-container-lowest border-outline-variant text-sm text-on-surface placeholder:text-outline focus:ring-primary focus:border-primary h-24 w-full resize-none rounded-lg border p-4 transition-all focus:ring-2"
 placeholder="Contoh: Tanpa saus, saus dipisah, dll."
 ></textarea>
 </div>

 <div className="h-16 md:hidden"></div>
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
 <span className="text-base font-bold text-on-surface w-4 text-center">{quantity}</span>
 <button
 onClick={() => updateQuantity(1)}
 className="bg-secondary text-on-secondary flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-95"
 >
 <span className="material-symbols-outlined text-[20px]">add</span>
 </button>
 </div>
 </div>
 <button
 onClick={() => onAddToCart(item, quantity, notes)}
 className="bg-secondary-container text-on-secondary-container text-sm font-semibold flex h-[56px] w-full items-center justify-center rounded-xl font-bold shadow-sm transition-transform active:scale-[0.98]"
 >
 <span>Tambah Pesanan</span>
 <span className="ml-2">- Rp {total.toLocaleString('id-ID')}</span>
 </button>
 </div>
 </div>
 </div>
 );
}
