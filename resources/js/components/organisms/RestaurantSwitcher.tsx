import { usePage, router } from '@inertiajs/react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Restaurant {
    id: number;
    name: string;
    slug: string;
    logo_path: string | null;
}

interface SharedProps {
    restaurant: {
        id: number;
        name: string;
        slug: string;
        logo_url: string | null;
    } | null;
    restaurants: Restaurant[];
}

export default function RestaurantSwitcher() {
    const { restaurant, restaurants } = usePage<{ props: SharedProps }>().props as unknown as SharedProps;
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Don't render if only one restaurant or none
    if (!restaurants || restaurants.length <= 1) {
        if (restaurant) {
            return (
                <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-xs font-bold text-indigo-400">
                        {restaurant.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden text-sm font-medium text-gray-300 sm:inline">
                        {restaurant.name}
                    </span>
                </div>
            );
        }
        return null;
    }

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSwitch = (restaurantId: number) => {
        setIsOpen(false);
        router.post(route('restaurants.switch', { restaurant: restaurantId }));
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 transition-all hover:border-indigo-500/30 hover:bg-white/10"
            >
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-xs font-bold text-indigo-400">
                    {restaurant?.name.charAt(0).toUpperCase() ?? '?'}
                </div>
                <span className="hidden max-w-[120px] truncate text-sm font-medium text-gray-300 sm:inline">
                    {restaurant?.name ?? 'Pilih Restoran'}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-xl shadow-black/50">
                    <div className="border-b border-white/5 px-3 py-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ganti Restoran</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                        {restaurants.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => handleSwitch(r.id)}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                                    r.id === restaurant?.id
                                        ? 'bg-indigo-500/10 text-indigo-400'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                    r.id === restaurant?.id
                                        ? 'bg-indigo-500/20 text-indigo-400'
                                        : 'bg-white/5 text-gray-500'
                                }`}>
                                    {r.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                    {r.name}
                                </span>
                                {r.id === restaurant?.id && (
                                    <Check className="h-4 w-4 shrink-0 text-indigo-400" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
