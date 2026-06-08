import { Head, router } from '@inertiajs/react';
import { Building2, ChevronRight, Plus } from 'lucide-react';

interface Restaurant {
    id: number;
    name: string;
    slug: string;
    logo_path: string | null;
}

interface Props {
    restaurants: Restaurant[];
}

export default function Select({ restaurants }: Props) {
    const handleSelect = (restaurantId: number) => {
        router.post(route('restaurants.switch', { restaurant: restaurantId }));
    };

    const handleCreate = () => {
        router.visit(route('restaurants.create'));
    };

    return (
        <>
            <Head title="Pilih Restoran" />
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
                <div className="w-full max-w-lg">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
                            <Building2 className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Pilih Restoran</h1>
                        <p className="mt-2 text-sm text-gray-400">
                            Pilih restoran yang ingin Anda kelola
                        </p>
                    </div>

                    {/* Restaurant List */}
                    <div className="space-y-3">
                        {restaurants.map((restaurant) => (
                            <button
                                key={restaurant.id}
                                onClick={() => handleSelect(restaurant.id)}
                                className="group flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-sm transition-all duration-200 hover:border-indigo-500/50 hover:bg-white/10 hover:shadow-lg hover:shadow-indigo-500/10"
                            >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-lg font-bold text-indigo-400">
                                    {restaurant.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-white">
                                        {restaurant.name}
                                    </p>
                                    <p className="truncate text-xs text-gray-500">
                                        {restaurant.slug}
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 shrink-0 text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-indigo-400" />
                            </button>
                        ))}

                        {/* Create New Restaurant Button */}
                        <button
                            onClick={handleCreate}
                            className="flex w-full items-center gap-4 rounded-xl border border-dashed border-white/20 p-4 text-left transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-emerald-500/30 text-emerald-500">
                                <Plus className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-emerald-400">
                                    Buat Restoran Baru
                                </p>
                                <p className="text-xs text-gray-500">
                                    Tambahkan restoran ke akun Anda
                                </p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
