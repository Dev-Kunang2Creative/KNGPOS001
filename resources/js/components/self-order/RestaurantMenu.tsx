import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';

type MenuItem = {
 id: number;
 category_id: number;
 name: string;
 description?: string | null;
 price: string;
 print_to: string;
 image_url?: string | null;
};
type Category = { id: number; name: string; active_items: MenuItem[] };
type Table = { id: number; name: string };

type Props = {
 table: Table;
 restaurant: { name: string };
 categories: Category[];
 onItemSelect: (item: MenuItem) => void;
 onViewCart: () => void;
 cartItemCount: number;
 currentMethod?: 'open' | 'close' | null;
 onMethodChange?: (newMethod: 'open' | 'close') => void;
};

export default function RestaurantMenu({
 table,
 restaurant,
 categories,
 onItemSelect,
 onViewCart,
 cartItemCount,
 currentMethod,
 onMethodChange,
}: Props) {
 const [timeString, setTimeString] = useState('');
 const [activeCategory, setActiveCategory] = useState<number | null>(null);
 const [searchQuery, setSearchQuery] = useState('');

 useEffect(() => {
 const updateClock = () => {
 const now = new Date();
 setTimeString(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
 };
 updateClock();
 const interval = setInterval(updateClock, 1000);
 return () => clearInterval(interval);
 }, []);

 const [isScrolled, setIsScrolled] = useState(false);
 useEffect(() => {
 const handleScroll = () => {
 setIsScrolled(window.scrollY > 10);
 };
 window.addEventListener('scroll', handleScroll);
 return () => window.removeEventListener('scroll', handleScroll);
 }, []);

 const filteredCategories = categories
 .map((category) => ({
 ...category,
 active_items: category.active_items.filter(
 (item) =>
 item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())),
 ),
 }))
 .filter((c) => c.active_items.length > 0);

 const categoriesToRender = activeCategory ? filteredCategories.filter((c) => c.id === activeCategory) : filteredCategories;

 return (
 <div className="font-sans">
 <header
 className={`bg-surface text-primary fixed top-0 right-0 left-0 z-50 mx-auto flex h-16 w-full max-w-md items-center justify-between px-4 transition-all duration-200 ${isScrolled ? 'border-outline-variant border-b' : 'border-b border-transparent'}`}
 >
 <button
 aria-label="Menu"
 className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-2 transition-colors duration-200 active:scale-95"
 >
 <span className="material-symbols-outlined">restaurant</span>
 </button>
 <div className="text-primary flex-1 text-center text-lg font-bold">{restaurant.name}</div>
 <button
 aria-label="Search"
 className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-2 transition-colors duration-200 active:scale-95"
 >
 <span className="material-symbols-outlined">search</span>
 </button>
 </header>

 <main className="md:px-lg max-w-7xl px-4 pt-20 pb-24">
 <section className="mb-6 flex items-center justify-between">
 <div>
 <h1 className="text-on-surface text-xl font-semibold md:text-2xl">Selamat datang, {table.name}</h1>
 <div className="mt-1 flex flex-col gap-2">
 <div className="flex items-center gap-1">
 <span className="material-symbols-outlined text-on-surface-variant text-[14px]">schedule</span>
 <span className="text-sm text-on-surface-variant">Pukul {timeString.replace(/:/g, '.')}</span>
 </div>
 {onMethodChange && (
 <div className="mt-3">
 <Select value={currentMethod || 'close'} onValueChange={(val) => onMethodChange(val as 'open' | 'close')}>
 <SelectTrigger className="bg-background border-input w-[240px] text-sm">
 <SelectValue placeholder="Pilih Tipe Bill" />
 </SelectTrigger>
 <SelectContent>
 <SelectGroup>
 <SelectItem value="close">Close Bill (Bayar Sekarang)</SelectItem>
 <SelectItem value="open">Open Bill (Bayar Nanti)</SelectItem>
 </SelectGroup>
 </SelectContent>
 </Select>
 </div>
 )}
 </div>
 </div>
 </section>

 <section className="mb-6">
 <div className="relative w-full">
 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
 <span className="material-symbols-outlined text-outline">search</span>
 </div>
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="border-outline-variant text-sm text-on-surface focus:border-primary focus:ring-primary w-full rounded-xl border bg-[#F8F9FA] py-3 pr-4 pl-10 transition-colors focus:ring-1 focus:outline-none"
 placeholder="Cari makanan atau minuman"
 />
 </div>
 </section>

 <section className="mb-8">
 <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
 <button
 onClick={() => setActiveCategory(null)}
 className={`text-xs font-medium rounded-full border px-4 py-2 whitespace-nowrap transition-colors ${
 activeCategory === null
 ? 'bg-primary text-white border-primary'
 : 'bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high'
 }`}
 >
 Semua
 </button>
 {categories.map((category) => (
 <button
 key={category.id}
 onClick={() => setActiveCategory(category.id)}
 className={`text-xs font-medium rounded-full border px-4 py-2 whitespace-nowrap transition-colors ${
 activeCategory === category.id
 ? 'bg-primary text-white border-primary'
 : 'bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high'
 }`}
 >
 {category.name}
 </button>
 ))}
 </div>
 </section>

 {categoriesToRender.map((category) => (
 <section key={category.id} className="border-surface-variant mb-8 border-t pt-4">
 <h2 className="text-base font-bold text-on-surface mb-4">{category.name}</h2>
 <div className="flex flex-col">
 {category.active_items.map((item) => (
 <div key={item.id} className="border-surface-variant flex flex-col border-b py-4">
 <div className="flex cursor-pointer items-start justify-between gap-3" onClick={() => onItemSelect(item)}>
 <div className="min-w-0 flex-1">
 <h3 className="text-sm font-semibold text-on-surface truncate font-bold">{item.name}</h3>
 {item.description && (
 <p className="text-sm text-on-surface-variant mt-1 line-clamp-2 text-[13px] leading-snug">
 {item.description}
 </p>
 )}
 <div className="mt-2 flex items-center gap-2">
 <span className="text-sm font-semibold text-on-surface font-bold">
 {Number(item.price).toLocaleString('id-ID')}
 </span>
 </div>
 </div>
 <div className="bg-surface-container-high relative flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl">
 {item.image_url ? (
 <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
 ) : (
 <span className="material-symbols-outlined text-outline text-[40px]">restaurant</span>
 )}
 </div>
 </div>
 <div className="mt-3 flex items-center justify-between">
 <div className="text-on-surface-variant flex flex-1 items-center justify-start gap-1">
 <span className="material-symbols-outlined text-[16px]">restaurant</span>
 <span className="text-xs font-medium text-[12px]">Bisa dikustomisasi</span>
 </div>
 <button
 onClick={(e) => {
 e.stopPropagation();
 onItemSelect(item);
 }}
 className="border-primary text-primary text-sm font-semibold hover:bg-primary-container hover:text-white rounded-full border-2 px-6 py-1 font-bold transition-colors"
 >
 Tambah
 </button>
 </div>
 </div>
 ))}
 </div>
 </section>
 ))}
 </main>
 </div>
 );
}
