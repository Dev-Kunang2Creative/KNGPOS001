import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Eye, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

type Json = Record<string, unknown> | null;
type Log = {
    id: number;
    user?: { id: number; name: string; email: string } | null;
    role?: string | null;
    action: string;
    resource_type: string;
    resource_id?: number | null;
    old_value?: Json;
    new_value?: Json;
    ip_address?: string | null;
    created_at: string;
};
type PageLink = { url: string | null; label: string; active: boolean };
type Props = {
    logs: { data: Log[]; links: PageLink[]; from: number | null; to: number | null; total: number };
    filters: { search: string; action: string; from: string | null; to: string | null };
    actions: string[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Audit Logs', href: '/audit-logs' }];

const ALL = 'all';

function actionStyle(action: string): string {
    if (action.startsWith('auth')) {
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (action.startsWith('menu')) {
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
    if (action.startsWith('pos.payment')) {
        return 'bg-violet-100 text-violet-700 border-violet-200';
    }
    if (action.startsWith('user') || action.startsWith('staff')) {
        return 'bg-amber-100 text-amber-700 border-amber-200';
    }
    if (action.startsWith('self_order')) {
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
    if (action.includes('delete') || action.includes('reject')) {
        return 'bg-red-100 text-red-700 border-red-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function AuditLogsIndex({ logs, filters, actions }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [action, setAction] = useState(filters.action || ALL);
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');
    const [detail, setDetail] = useState<Log | null>(null);

    function apply() {
        router.get(
            '/audit-logs',
            {
                search: search || undefined,
                action: action !== ALL ? action : undefined,
                from: from || undefined,
                to: to || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function reset() {
        setSearch('');
        setAction(ALL);
        setFrom('');
        setTo('');
        router.get('/audit-logs', {}, { preserveScroll: true, replace: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Audit Logs" />
            <main className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                        <ShieldCheck className="size-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Audit Logs</h1>
                        <p className="text-muted-foreground text-sm">Jejak aktivitas sensitif sistem — {logs.total} entri.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-2 xl:grid-cols-[1fr_200px_160px_160px_auto]">
                    <div className="relative">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && apply()}
                            placeholder="Cari user / action / resource..."
                            className="pl-9"
                        />
                    </div>
                    <Select value={action} onValueChange={setAction}>
                        <SelectTrigger>
                            <SelectValue placeholder="Semua aksi" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Semua Aksi</SelectItem>
                            {actions.map((a) => (
                                <SelectItem key={a} value={a}>
                                    {a}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="grid gap-1">
                        <Label className="text-muted-foreground text-[11px]">Dari</Label>
                        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div className="grid gap-1">
                        <Label className="text-muted-foreground text-[11px]">Sampai</Label>
                        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                    <div className="flex items-end gap-2">
                        <Button onClick={apply} className="flex-1">
                            Terapkan
                        </Button>
                        <Button onClick={reset} variant="outline" size="icon" title="Reset">
                            <RotateCcw className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-[880px] text-sm">
                        <thead className="text-muted-foreground bg-muted/50 border-b text-left">
                            <tr>
                                <th className="p-3 font-medium">Waktu</th>
                                <th className="p-3 font-medium">User</th>
                                <th className="p-3 font-medium">Role</th>
                                <th className="p-3 font-medium">Action</th>
                                <th className="p-3 font-medium">Resource</th>
                                <th className="p-3 font-medium">IP</th>
                                <th className="p-3 text-right font-medium">Detail</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-muted-foreground p-10 text-center">
                                        Tidak ada aktivitas yang cocok dengan filter.
                                    </td>
                                </tr>
                            ) : (
                                logs.data.map((log) => {
                                    const hasDetail = Boolean(log.old_value || log.new_value);
                                    return (
                                        <tr key={log.id} className="hover:bg-muted/40 border-b last:border-0">
                                            <td className="p-3 whitespace-nowrap tabular-nums">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                                            <td className="p-3">
                                                {log.user ? (
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">{log.user.name}</p>
                                                        <p className="text-muted-foreground truncate text-xs">{log.user.email}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">Sistem</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {log.role ? (
                                                    <Badge variant="outline" className="capitalize">
                                                        {log.role}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${actionStyle(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                {log.resource_type}
                                                {log.resource_id ? <span className="text-muted-foreground"> #{log.resource_id}</span> : null}
                                            </td>
                                            <td className="text-muted-foreground p-3 tabular-nums">{log.ip_address ?? '-'}</td>
                                            <td className="p-3 text-right">
                                                {hasDetail ? (
                                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => setDetail(log)} title="Lihat detail">
                                                        <Eye className="size-4" />
                                                    </Button>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {logs.links.length > 3 && (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-muted-foreground text-xs">
                            Menampilkan {logs.from ?? 0}–{logs.to ?? 0} dari {logs.total}
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {logs.links.map((link, i) => (
                                <button
                                    key={i}
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true, preserveState: true })}
                                    className={`min-w-9 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                                        link.active
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : link.url
                                              ? 'hover:bg-muted'
                                              : 'text-muted-foreground/50 cursor-not-allowed'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <DetailDialog log={detail} onClose={() => setDetail(null)} />
        </AppLayout>
    );
}

function DetailDialog({ log, onClose }: { log: Log | null; onClose: () => void }) {
    return (
        <Dialog open={Boolean(log)} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-base">Detail Perubahan</DialogTitle>
                </DialogHeader>
                {log && (
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <Info label="Action" value={log.action} />
                            <Info label="Waktu" value={new Date(log.created_at).toLocaleString('id-ID')} />
                            <Info label="User" value={log.user?.name ?? 'Sistem'} />
                            <Info label="Resource" value={`${log.resource_type}${log.resource_id ? ` #${log.resource_id}` : ''}`} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <ValueBlock title="Sebelum" value={log.old_value ?? null} tone="text-red-600" />
                            <ValueBlock title="Sesudah" value={log.new_value ?? null} tone="text-emerald-600" />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="font-medium break-words">{value}</p>
        </div>
    );
}

function ValueBlock({ title, value, tone }: { title: string; value: Json; tone: string }) {
    const entries = value ? Object.entries(value) : [];
    return (
        <div className="bg-muted/40 rounded-lg border p-3">
            <p className={`mb-2 text-xs font-semibold ${tone}`}>{title}</p>
            {entries.length === 0 ? (
                <p className="text-muted-foreground text-xs">—</p>
            ) : (
                <dl className="space-y-1">
                    {entries.map(([key, val]) => (
                        <div key={key} className="flex justify-between gap-2 text-xs">
                            <dt className="text-muted-foreground">{key}</dt>
                            <dd className="break-all text-right font-medium">{String(val)}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}
