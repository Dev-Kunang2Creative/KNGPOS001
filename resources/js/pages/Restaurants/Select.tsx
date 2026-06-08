import { Head, router, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { Building2, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Restaurant {
    id: number;
    name: string;
    slug: string;
    logo_path: string | null;
    owner_id: number | null;
}

interface Props {
    restaurants: Restaurant[];
}

export default function Select({ restaurants }: Props) {
    const { auth, flash } = usePage<SharedData>().props;
    const isSuperAdmin = (auth as any).isSuperAdmin ?? false;
    const [deleting, setDeleting] = useState<number | null>(null);

    const handleSelect = (restaurantId: number) => {
        router.post(route('restaurants.switch', { restaurant: restaurantId }));
    };

    const handleCreate = () => {
        router.visit(route('restaurants.create'));
    };

    const handleEdit = (restaurantId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        // Switch to the restaurant first, then redirect to edit
        router.post(route('restaurants.switch', { restaurant: restaurantId }), {}, {
            onSuccess: () => router.visit(route('restaurants.edit')),
        });
    };

    const handleDelete = (restaurant: Restaurant, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Hapus restoran "${restaurant.name}"? Tindakan ini akan menonaktifkan restoran.`)) {
            return;
        }
        setDeleting(restaurant.id);
        router.delete(route('restaurants.destroy', { restaurant: restaurant.id }), {
            onFinish: () => setDeleting(null),
        });
    };

    const canManage = (restaurant: Restaurant): boolean => {
        return isSuperAdmin || restaurant.owner_id === (auth.user as any)?.id;
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

                    {/* Flash Messages */}
                    {flash?.success && (
                        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            {flash.error}
                        </div>
                    )}

                    {/* Restaurant List */}
                    <div className="space-y-3">
                        {restaurants.map((restaurant) => (
                            <div
                                key={restaurant.id}
                                className="group relative flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-sm transition-all duration-200 hover:border-indigo-500/50 hover:bg-white/10 hover:shadow-lg hover:shadow-indigo-500/10"
                            >
                                {/* Clickable area to select */}
                                <button
                                    onClick={() => handleSelect(restaurant.id)}
                                    className="flex min-w-0 flex-1 items-center gap-4"
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

                                {/* Action buttons */}
                                {canManage(restaurant) && (
                                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            onClick={(e) => handleEdit(restaurant.id, e)}
                                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-indigo-400"
                                            title="Edit"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(restaurant, e)}
                                            disabled={deleting === restaurant.id}
                                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                                            title="Hapus"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
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
