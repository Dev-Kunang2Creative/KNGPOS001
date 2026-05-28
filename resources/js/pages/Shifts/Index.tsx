import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { DoorClosed, DoorOpen } from 'lucide-react';
import { FormEvent } from 'react';

type Shift = { id: number; opening_cash: string; closing_cash?: string | null; status: string; opened_at: string; closed_at?: string | null; notes?: string | null };
type Props = { activeShift: Shift | null; shifts: Shift[] };
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Shifts', href: '/shifts' }];

export default function ShiftsIndex({ activeShift, shifts }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Shift Management" />
            <main className="flex flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Shift Management</h1>
                    <p className="text-sm text-muted-foreground">Buka shift sebelum POS dan tutup shift di akhir sesi.</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
                    {activeShift ? <CloseShiftForm shift={activeShift} /> : <OpenShiftForm />}
                    <Card className="rounded-md">
                        <CardHeader><CardTitle className="text-base">Riwayat Shift</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {shifts.map((shift) => (
                                <div key={shift.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                                    <div>
                                        <div className="font-medium">Shift #{shift.id}</div>
                                        <div className="text-muted-foreground">{shift.opened_at}</div>
                                    </div>
                                    <Badge variant={shift.status === 'open' ? 'secondary' : 'outline'}>{shift.status}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </AppLayout>
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
                <Input type="number" value={form.data.opening_cash} onChange={(event) => form.setData('opening_cash', Number(event.target.value))} placeholder="Modal awal" />
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
            <p className="mb-3 text-sm text-muted-foreground">Modal awal Rp {Number(shift.opening_cash).toLocaleString('id-ID')}</p>
            <div className="grid gap-3">
                <Input type="number" value={form.data.closing_cash} onChange={(event) => form.setData('closing_cash', Number(event.target.value))} placeholder="Saldo akhir" />
                <Input value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} placeholder="Catatan" />
                <Button type="submit" variant="destructive"><DoorClosed />Tutup Shift</Button>
            </div>
        </form>
    );
}
