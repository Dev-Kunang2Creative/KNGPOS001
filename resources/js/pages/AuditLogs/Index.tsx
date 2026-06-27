import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

type Log = { id: number; user?: { name: string; email: string } | null; role?: string | null; action: string; resource_type: string; resource_id?: number | null; ip_address?: string | null; created_at: string };
type Props = { logs: { data: Log[] } };
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Audit Logs', href: '/audit-logs' }];

export default function AuditLogsIndex({ logs }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Audit Logs" />
            <main className="flex flex-1 flex-col gap-4 p-4">
                <div><h1 className="text-2xl font-semibold">Audit Logs</h1><p className="text-sm text-muted-foreground">Aktivitas sensitif sistem.</p></div>
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[920px] text-sm">
                        <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">Waktu</th><th>User</th><th>Role</th><th>Action</th><th>Resource</th><th>IP</th></tr></thead>
                        <tbody>{logs.data.map((log) => <tr key={log.id} className="border-b"><td className="p-3">{new Date(log.created_at).toLocaleString('id-ID')}</td><td>{log.user?.name ?? '-'}</td><td>{log.role ?? '-'}</td><td>{log.action}</td><td>{log.resource_type} #{log.resource_id ?? '-'}</td><td>{log.ip_address ?? '-'}</td></tr>)}</tbody>
                    </table>
                </div>
            </main>
        </AppLayout>
    );
}
