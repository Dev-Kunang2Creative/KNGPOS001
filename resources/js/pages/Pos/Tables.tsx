import FlashToast from '@/components/flash-toast';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { LayoutGrid } from 'lucide-react';

type Table = {
    id: number;
    name: string;
    capacity?: number | null;
    status: string;
    zone?: { id: number; name: string; color_hex?: string | null } | null;
};

type Props = {
    tables: Table[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Meja', href: '/pos/tables' }];

const STATUSES: { value: string; label: string; className: string }[] = [
    { value: 'available', label: 'Tersedia', className: 'bg-emerald-500' },
    { value: 'occupied', label: 'Terisi', className: 'bg-amber-500' },
    { value: 'open_bill', label: 'Open Bill', className: 'bg-blue-500' },
    { value: 'reserved', label: 'Reserved', className: 'bg-violet-500' },
];

const statusMeta = (status: string) => STATUSES.find((s) => s.value === status);

export default function Tables({ tables }: Props) {
    const zones = Array.from(new Map(tables.map((t) => [t.zone?.id ?? 0, t.zone])).values());

    function setStatus(table: Table, status: string) {
        if (status === table.status) {
            return;
        }
        router.patch(`/pos/tables/${table.id}/status`, { status }, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manajemen Meja" />
            <FlashToast />

            <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold">Manajemen Meja</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Ubah status meja secara manual. Tap status untuk mengganti.</p>
                </div>

                {tables.length === 0 && <p className="text-muted-foreground text-sm">Belum ada meja.</p>}

                {zones.map((zone) => {
                    const zoneTables = tables.filter((t) => (t.zone?.id ?? 0) === (zone?.id ?? 0));
                    return (
                        <section key={zone?.id ?? 'no-zone'} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="size-3 rounded-full" style={{ backgroundColor: zone?.color_hex ?? '#94a3b8' }} />
                                <h2 className="font-semibold">{zone?.name ?? 'Tanpa Zona'}</h2>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {zoneTables.map((table) => (
                                    <div key={table.id} className="bg-card rounded-xl border p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold">{table.name}</p>
                                                {table.capacity ? (
                                                    <p className="text-muted-foreground text-xs">{table.capacity} kursi</p>
                                                ) : null}
                                            </div>
                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium text-white ${statusMeta(table.status)?.className ?? 'bg-muted-foreground'}`}>
                                                {statusMeta(table.status)?.label ?? table.status}
                                            </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-1.5">
                                            {STATUSES.map((s) => (
                                                <button
                                                    key={s.value}
                                                    type="button"
                                                    onClick={() => setStatus(table, s.value)}
                                                    className={`min-h-[40px] rounded-lg border text-xs font-medium transition-colors ${
                                                        table.status === s.value
                                                            ? 'border-primary bg-primary/10 text-primary'
                                                            : 'hover:bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}

                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <LayoutGrid className="size-3.5" />
                    Perubahan status meja langsung tersimpan.
                </div>
            </main>
        </AppLayout>
    );
}
