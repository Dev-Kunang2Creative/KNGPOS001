import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { DoorClosed, DoorOpen, Scale } from 'lucide-react';
import { FormEvent } from 'react';

type ShiftSummary = {
    total_cash: string;
    total_qris: string;
    total_ewallet: string;
    total_bank_transfer: string;
    total_va: string;
    total_transactions: number;
    total_revenue: string;
    cash_difference: string;
};

type Shift = {
    id: number;
    opening_cash: string;
    closing_cash?: string | null;
    status: string;
    opened_at: string;
    closed_at?: string | null;
    notes?: string | null;
    cashier?: { id: number; name: string; email: string } | null;
    summary?: ShiftSummary | null;
};

type Props = { activeShift: Shift | null; shifts: Shift[] };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Shifts', href: '/shifts' }];
const quickAmounts = [50000, 100000, 200000, 500000, 1000000];

const money = (value: number | string | null | undefined) => Number(value ?? 0).toLocaleString('id-ID');
const parseCashInput = (value: string) => Number(value.replace(/[^\d]/g, '') || 0);
const formatWib = (value?: string | null) => {
    if (!value) {
        return '-';
    }

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(value)) + ' WIB';
};

export default function ShiftsIndex({ activeShift, shifts }: Props) {
    const { auth } = usePage<SharedData>().props;
    const permissions = auth.permissions ?? [];
    const canOpenShift = permissions.includes('shift.open');
    const canCloseShift = permissions.includes('shift.close');
    const canManageOwnShift = canOpenShift || canCloseShift;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Shift Management" />
            <main className="flex flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Shift Management</h1>
                    <p className="text-sm text-muted-foreground">Buka shift sebelum POS dan tutup shift di akhir sesi.</p>
                </div>
                <div className={`grid gap-4 ${canManageOwnShift ? 'lg:grid-cols-[380px_1fr]' : ''}`}>
                    {canManageOwnShift && (
                        activeShift && canCloseShift ? <CloseShiftForm shift={activeShift} /> : canOpenShift ? <OpenShiftForm /> : null
                    )}
                    <Card className="rounded-md">
                        <CardHeader><CardTitle className="text-base">Riwayat Shift</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {shifts.length === 0 ? (
                                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada riwayat shift.</div>
                            ) : shifts.map((shift) => <ShiftHistoryRow key={shift.id} shift={shift} />)}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </AppLayout>
    );
}

function ShiftHistoryRow({ shift }: { shift: Shift }) {
    const summary = shift.summary;
    const totalCashSales = Number(summary?.total_cash ?? 0);
    const openingCash = Number(shift.opening_cash ?? 0);
    const expectedCash = openingCash + totalCashSales;
    const closingCash = Number(shift.closing_cash ?? 0);
    const cashDifference = Number(summary?.cash_difference ?? 0);
    const nonCashRevenue =
        Number(summary?.total_qris ?? 0) +
        Number(summary?.total_ewallet ?? 0) +
        Number(summary?.total_bank_transfer ?? 0) +
        Number(summary?.total_va ?? 0);
    const hasDifference = Math.abs(cashDifference) > 0;

    return (
        <div className="rounded-md border p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="font-medium">Shift #{shift.id}</div>
                    {shift.cashier && <div className="text-xs text-muted-foreground">Kasir: {shift.cashier.name}</div>}
                    <div className="mt-1 text-muted-foreground">Buka: {formatWib(shift.opened_at)}</div>
                    {shift.closed_at && <div className="text-muted-foreground">Tutup: {formatWib(shift.closed_at)}</div>}
                    <div className="mt-1 text-xs text-muted-foreground">Modal awal Rp {money(shift.opening_cash)}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Badge variant={shift.status === 'open' ? 'secondary' : 'outline'}>{shift.status}</Badge>
                    {hasDifference && <Badge variant="destructive">Selisih Rp {money(Math.abs(cashDifference))}</Badge>}
                </div>
            </div>

            {summary && (
                <div className={`mt-3 rounded-md border p-3 ${hasDifference ? 'border-destructive/30 bg-destructive/5' : 'bg-muted/30'}`}>
                    <div className="mb-2 flex items-center gap-2 font-medium">
                        <Scale className="size-4" />
                        Neraca Tutup Kasir
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <BalanceMetric label="Revenue" value={Number(summary.total_revenue)} />
                        <BalanceMetric label="Transaksi" value={summary.total_transactions} plain />
                        <BalanceMetric label="Cash" value={totalCashSales} />
                        <BalanceMetric label="Non-cash" value={nonCashRevenue} />
                        <BalanceMetric label="Kas seharusnya" value={expectedCash} />
                        <BalanceMetric label="Kas aktual" value={closingCash} />
                        <BalanceMetric label="Selisih kas" value={cashDifference} highlight={hasDifference} signed />
                    </div>
                </div>
            )}
        </div>
    );
}

function BalanceMetric({ label, value, plain = false, highlight = false, signed = false }: { label: string; value: number; plain?: boolean; highlight?: boolean; signed?: boolean }) {
    const signedPrefix = signed && value > 0 ? '+' : '';

    return (
        <div className="rounded-md border bg-background px-3 py-2">
            <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
            <div className={`mt-0.5 font-semibold ${highlight ? 'text-destructive' : ''}`}>
                {plain ? value.toLocaleString('id-ID') : `${signedPrefix}Rp ${money(value)}`}
            </div>
        </div>
    );
}

function OpenShiftForm() {
    const form = useForm({ opening_cash: 0, notes: '' });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.post('/shifts', { preserveScroll: true });
    }
    return (
        <form onSubmit={submit} className="rounded-md border p-4">
            <h2 className="mb-3 text-base font-semibold">Buka Shift</h2>
            <div className="grid gap-3">
                <div className="space-y-2">
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={form.data.opening_cash > 0 ? money(form.data.opening_cash) : ''}
                        onChange={(event) => form.setData('opening_cash', parseCashInput(event.target.value))}
                        placeholder="Modal awal"
                        className="min-h-[48px] text-lg font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <div className="grid grid-cols-5 gap-1.5">
                        {quickAmounts.map((amount) => (
                            <button
                                key={amount}
                                type="button"
                                className="rounded-lg border bg-muted py-2 text-xs font-semibold hover:bg-muted/80"
                                onClick={() => form.setData('opening_cash', form.data.opening_cash + amount)}
                            >
                                {amount >= 1000000 ? `${amount / 1000000}jt` : `${amount / 1000}rb`}
                            </button>
                        ))}
                    </div>
                </div>
                <Input value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} placeholder="Catatan" />
                <Button type="submit"><DoorOpen />Buka Shift</Button>
            </div>
        </form>
    );
}

function CloseShiftForm({ shift }: { shift: Shift }) {
    const form = useForm({ closing_cash: 0, notes: '' });
    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(`/shifts/${shift.id}/close`, { preserveScroll: true });
    }
    return (
        <form onSubmit={submit} className="rounded-md border p-4">
            <h2 className="mb-3 text-base font-semibold">Tutup Shift Aktif</h2>
            <p className="mb-3 text-sm text-muted-foreground">Modal awal Rp {money(shift.opening_cash)} - Dibuka {formatWib(shift.opened_at)}</p>
            <div className="grid gap-3">
                <div className="space-y-2">
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={form.data.closing_cash > 0 ? money(form.data.closing_cash) : ''}
                        onChange={(event) => form.setData('closing_cash', parseCashInput(event.target.value))}
                        placeholder="Saldo akhir"
                        className="min-h-[48px] text-lg font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <div className="grid grid-cols-5 gap-1.5">
                        {quickAmounts.map((amount) => (
                            <button
                                key={amount}
                                type="button"
                                className="rounded-lg border bg-muted py-2 text-xs font-semibold hover:bg-muted/80"
                                onClick={() => form.setData('closing_cash', form.data.closing_cash + amount)}
                            >
                                {amount >= 1000000 ? `${amount / 1000000}jt` : `${amount / 1000}rb`}
                            </button>
                        ))}
                    </div>
                </div>
                <Input value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} placeholder="Catatan" />
                <Button type="submit" variant="destructive"><DoorClosed />Tutup Shift</Button>
            </div>
        </form>
    );
}
