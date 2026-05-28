import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

type Station = { id: number; name: string };
type Zone = { id: number; name: string };
type User = { id: number; name: string; email: string; role: string; kitchen_station_id?: number | null; bar_station_id?: number | null; is_active: boolean };
type Props = { users: User[]; kitchenStations: Station[]; barStations: Station[]; zones: Zone[] };
const breadcrumbs: BreadcrumbItem[] = [{ title: 'Users', href: '/users' }];
const roles = ['super_admin', 'manager', 'kasir', 'waiter', 'dapur', 'bar'];

export default function UsersIndex({ users, kitchenStations, barStations, zones }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management" />
            <main className="grid flex-1 gap-4 p-4 xl:grid-cols-[380px_1fr]">
                <UserForm kitchenStations={kitchenStations} barStations={barStations} zones={zones} />
                <div className="grid gap-3">
                    {users.map((user) => <UserForm key={user.id} user={user} kitchenStations={kitchenStations} barStations={barStations} zones={zones} />)}
                </div>
            </main>
        </AppLayout>
    );
}

function UserForm({ user, kitchenStations, barStations, zones }: { user?: User; kitchenStations: Station[]; barStations: Station[]; zones: Zone[] }) {
    const form = useForm({ name: user?.name ?? '', email: user?.email ?? '', password: '', role: user?.role ?? 'kasir', kitchen_station_id: user?.kitchen_station_id ? String(user.kitchen_station_id) : 'none', bar_station_id: user?.bar_station_id ? String(user.bar_station_id) : 'none', is_active: user?.is_active ?? true, zone_ids: [] as number[] });
    function submit(event: FormEvent) {
        event.preventDefault();
        const payload = { ...form.data, kitchen_station_id: form.data.kitchen_station_id === 'none' ? null : Number(form.data.kitchen_station_id), bar_station_id: form.data.bar_station_id === 'none' ? null : Number(form.data.bar_station_id) };
        form.transform(() => payload).submit(user ? 'put' : 'post', user ? `/users/${user.id}` : '/users', { preserveScroll: true, onSuccess: () => !user && form.reset() });
    }
    return (
        <form onSubmit={submit} className="rounded-md border p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">{user ? user.name : 'Tambah User'}</h2>{user && <Button type="button" size="sm" variant="outline" onClick={() => router.patch(`/users/${user.id}/status`, { is_active: !user.is_active }, { preserveScroll: true })}>{user.is_active ? 'Nonaktifkan' : 'Aktifkan'}</Button>}</div>
            <div className="grid gap-2">
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="Nama" />
                <Input value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} placeholder="Email" />
                <Input type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} placeholder={user ? 'Password baru opsional' : 'Password'} />
                <Select value={form.data.role} onValueChange={(v) => form.setData('role', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{roles.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select>
                <Select value={form.data.kitchen_station_id} onValueChange={(v) => form.setData('kitchen_station_id', v)}><SelectTrigger><SelectValue placeholder="Kitchen station" /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa kitchen</SelectItem>{kitchenStations.map((station) => <SelectItem key={station.id} value={String(station.id)}>{station.name}</SelectItem>)}</SelectContent></Select>
                <Select value={form.data.bar_station_id} onValueChange={(v) => form.setData('bar_station_id', v)}><SelectTrigger><SelectValue placeholder="Bar station" /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa bar</SelectItem>{barStations.map((station) => <SelectItem key={station.id} value={String(station.id)}>{station.name}</SelectItem>)}</SelectContent></Select>
                {form.data.role === 'waiter' && <div className="grid gap-1 rounded-md border p-2">{zones.map((zone) => <label key={zone.id} className="flex items-center gap-2 text-sm"><Checkbox checked={form.data.zone_ids.includes(zone.id)} onCheckedChange={(checked) => form.setData('zone_ids', checked ? [...form.data.zone_ids, zone.id] : form.data.zone_ids.filter((id) => id !== zone.id))} />{zone.name}</label>)}</div>}
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', Boolean(v))} />Aktif</label>
                <Button type="submit">Simpan User</Button>
            </div>
        </form>
    );
}
