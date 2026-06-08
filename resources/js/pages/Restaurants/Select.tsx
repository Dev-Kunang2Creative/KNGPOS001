import { Button } from '@/components/ui/button';
import { type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
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

    const handleEdit = (restaurantId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        router.post(route('restaurants.switch', { restaurant: restaurantId }), {}, {
            onSuccess: () => router.visit('/restaurant/edit'),
        });
    };

    const handleDelete = (restaurant: Restaurant, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Hapus restoran "${restaurant.name}"? Tindakan ini akan menonaktifkan restoran.`)) return;
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
            <Head title="Kelola Restoran" />

            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
                <div className="w-full max-w-2xl">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">Kelola Restoran</h1>
                            <p className="text-sm text-muted-foreground">Pilih atau kelola restoran Anda</p>
                        </div>
                        <Button onClick={() => router.visit('/restaurants/create')}>
                            <Plus className="mr-1 h-4 w-4" />
                            Tambah Restoran
                        </Button>
                    </div>

                    {/* Flash Messages */}
                    {flash?.success && (
                        <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-4 rounded-md border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
                            {flash.error}
                        </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                        {restaurants.map((restaurant) => (
                            <div
                                key={restaurant.id}
                                className="group rounded-md border p-4 transition-colors hover:bg-muted/30"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                                        {restaurant.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">{restaurant.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">{restaurant.slug}</p>
                                    </div>
                                </div>

                                <div className="mt-3 flex gap-2">
                                    <Button
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleSelect(restaurant.id)}
                                    >
                                        <ChevronRight className="mr-1 h-3.5 w-3.5" />
                                        Masuk
                                    </Button>
                                    {canManage(restaurant) && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => handleEdit(restaurant.id, e)}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => handleDelete(restaurant, e)}
                                                disabled={deleting === restaurant.id}
                                                className="text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {restaurants.length === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16">
                            <Building2 className="mb-3 h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">Belum ada restoran</p>
                            <Button className="mt-3" onClick={() => router.visit('/restaurants/create')}>
                                <Plus className="mr-1 h-4 w-4" />
                                Buat Restoran Pertama
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
