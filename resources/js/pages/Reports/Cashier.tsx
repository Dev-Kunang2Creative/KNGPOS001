import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';

type Row = { kasir_id: number | null; kasir_name: string; total_transactions: number; total_revenue: number; cash: number; qris: number; ewallet: number; bank_transfer: number; va: number; is_total: boolean };
type Cashier = { id: number; name: string };
type Props = { rows: Row[]; filters: { from: string; to: string; cashier_id?: number | null; shift_id?: number | null }; cashiers: Cashier[] };
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reports Kasir', href: '/reports/kasir' }];

export default function CashierReport({ rows, filters, cashiers }: Props) {
    const form = useForm({ from: filters.from, to: filters.to, cashier_id: filters.cashier_id ? String(filters.cashier_id) : 'all', shift_id: filters.shift_id ?? '' });
    const params = () => ({ from: form.data.from, to: form.data.to, cashier_id: form.data.cashier_id === 'all' ? '' : form.data.cashier_id, shift_id: form.data.shift_id });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Laporan Kasir" />
            <main className="flex flex-1 flex-col gap-4 p-4">
                <div><h1 className="text-2xl font-semibold">Laporan Kasir</h1><p className="text-sm text-muted-foreground">Termasuk self-order dan baris TOTAL.</p></div>
                <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
                    <Input type="date" className="w-auto" value={form.data.from} onChange={(e) => form.setData('from', e.target.value)} />
                    <Input type="date" className="w-auto" value={form.data.to} onChange={(e) => form.setData('to', e.target.value)} />
                    <Select value={form.data.cashier_id} onValueChange={(value) => form.setData('cashier_id', value)}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua kasir</SelectItem>{cashiers.map((cashier) => <SelectItem key={cashier.id} value={String(cashier.id)}>{cashier.name}</SelectItem>)}</SelectContent></Select>
                    <Input className="w-32" value={form.data.shift_id} onChange={(e) => form.setData('shift_id', e.target.value)} placeholder="Shift ID" />
                    <Button type="button" onClick={() => router.get('/reports/kasir', params(), { preserveState: true })}>Filter</Button>
                    <Button type="button" variant="outline" onClick={() => router.post('/reports/kasir/export', params())}>Export CSV</Button>
                    <Button type="button" variant="outline" onClick={() => router.post('/reports/kasir/export', { ...params(), format: 'pdf' })}>Export PDF</Button>
                </div>
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[900px] text-sm">
                        <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">Kasir</th><th>Trx</th><th>Cash</th><th>QRIS</th><th>Ewallet</th><th>Bank</th><th>VA</th><th>Total</th></tr></thead>
                        <tbody>{rows.map((row) => <tr key={row.kasir_name} className={`border-b ${row.is_total ? 'bg-muted/50 font-semibold' : ''}`}><td className="p-3">{row.kasir_name}</td><td>{row.total_transactions}</td><td>{money(row.cash)}</td><td>{money(row.qris)}</td><td>{money(row.ewallet)}</td><td>{money(row.bank_transfer)}</td><td>{money(row.va)}</td><td>{money(row.total_revenue)}</td></tr>)}</tbody>
                    </table>
                </div>
            </main>
        </AppLayout>
    );
}

function money(value: number) { return `Rp ${Number(value).toLocaleString('id-ID')}`; }
