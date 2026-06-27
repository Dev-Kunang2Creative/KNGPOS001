import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { KeyRound, Pencil, Power, Trash2, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Station = { id: number; name: string };
type Zone = { id: number; name: string };
type User = {
    id: number;
    name: string;
    email: string;
    role: string;
    kitchen_station_id?: number | null;
    bar_station_id?: number | null;
    is_active: boolean;
    is_primary?: boolean;
    zone_ids?: number[];
};
type Props = { users: User[]; kitchenStations: Station[]; barStations: Station[]; zones: Zone[] };

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Users', href: '/users' }];
const ROLES = ['manager', 'kasir', 'waiter', 'dapur', 'bar'] as const;
const ROLE_LABELS: Record<string, string> = {
    manager: 'Manager',
    kasir: 'Kasir',
    waiter: 'Waiter',
    dapur: 'Dapur',
    bar: 'Bar',
    super_admin: 'Super Admin',
};

export default function UsersIndex({ users, kitchenStations, barStations, zones }: Props) {
    const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; user?: User } | null>(null);
    const [resetUser, setResetUser] = useState<User | null>(null);

    const stationName = (list: Station[], id?: number | null) => list.find((s) => s.id === id)?.name;

    function toggleStatus(user: User) {
        router.patch(`/users/${user.id}/status`, { is_active: !user.is_active }, { preserveScroll: true });
    }

    function removeUser(user: User) {
        if (confirm(`Keluarkan ${user.name} dari restoran ini?`)) {
            router.delete(`/users/${user.id}`, { preserveScroll: true });
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manajemen Staff" />
            <main className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-normal">Manajemen Staff</h1>
                        <p className="text-muted-foreground text-sm">Kelola akun staff restoran: tambah, ubah, reset password, dan atur akses.</p>
                    </div>
                    <Button onClick={() => setDialog({ mode: 'create' })}>
                        <UserPlus className="mr-2 h-4 w-4" /> Tambah Staff
                    </Button>
                </div>

                <Card className="rounded-md">
                    <CardHeader>
                        <CardTitle className="text-base">Daftar Staff ({users.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-sm">
                            <thead className="text-muted-foreground border-b text-left">
                                <tr>
                                    <th className="py-2 font-medium">Nama</th>
                                    <th className="py-2 font-medium">Email</th>
                                    <th className="py-2 font-medium">Role</th>
                                    <th className="py-2 font-medium">Station</th>
                                    <th className="py-2 font-medium">Status</th>
                                    <th className="py-2 text-right font-medium">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => {
                                    const station =
                                        stationName(kitchenStations, user.kitchen_station_id) ?? stationName(barStations, user.bar_station_id);
                                    return (
                                        <tr key={user.id} className="hover:bg-muted/50 border-b">
                                            <td className="py-3 font-medium">
                                                {user.name}
                                                {user.is_primary && (
                                                    <Badge variant="outline" className="ml-2">
                                                        Owner
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="py-3">{user.email}</td>
                                            <td className="py-3">
                                                <Badge variant="secondary">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                                            </td>
                                            <td className="py-3">{station ?? '-'}</td>
                                            <td className="py-3">
                                                <Badge variant={user.is_active ? 'secondary' : 'outline'}>
                                                    {user.is_active ? 'Aktif' : 'Nonaktif'}
                                                </Badge>
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        title="Edit"
                                                        onClick={() => setDialog({ mode: 'edit', user })}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="outline" size="icon" title="Reset Password" onClick={() => setResetUser(user)}>
                                                        <KeyRound className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                        onClick={() => toggleStatus(user)}
                                                    >
                                                        <Power className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="outline" size="icon" title="Keluarkan" onClick={() => removeUser(user)}>
                                                        <Trash2 className="text-destructive h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-muted-foreground py-8 text-center">
                                            Belum ada staff. Klik "Tambah Staff".
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {dialog && (
                    <UserDialog
                        key={dialog.user?.id ?? 'create'}
                        mode={dialog.mode}
                        user={dialog.user}
                        kitchenStations={kitchenStations}
                        barStations={barStations}
                        zones={zones}
                        onClose={() => setDialog(null)}
                    />
                )}

                {resetUser && <ResetPasswordDialog user={resetUser} onClose={() => setResetUser(null)} />}
            </main>
        </AppLayout>
    );
}

function UserDialog({
    mode,
    user,
    kitchenStations,
    barStations,
    zones,
    onClose,
}: {
    mode: 'create' | 'edit';
    user?: User;
    kitchenStations: Station[];
    barStations: Station[];
    zones: Zone[];
    onClose: () => void;
}) {
    const form = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
        role: user?.role ?? 'kasir',
        kitchen_station_id: user?.kitchen_station_id ? String(user.kitchen_station_id) : 'none',
        bar_station_id: user?.bar_station_id ? String(user.bar_station_id) : 'none',
        is_active: user?.is_active ?? true,
        zone_ids: user?.zone_ids ?? ([] as number[]),
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            kitchen_station_id: data.kitchen_station_id === 'none' ? null : Number(data.kitchen_station_id),
            bar_station_id: data.bar_station_id === 'none' ? null : Number(data.bar_station_id),
        }));
        if (mode === 'create') {
            form.post('/users', { preserveScroll: true, onSuccess: onClose });
        } else if (user) {
            form.put(`/users/${user.id}`, { preserveScroll: true, onSuccess: onClose });
        }
    }

    return (
        <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'Tambah Staff' : `Edit Staff: ${user?.name}`}</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>Nama</Label>
                            <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="Nama staff" />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                placeholder="email@resto.com"
                            />
                            <InputError message={form.errors.email} />
                        </div>
                        {mode === 'create' && (
                            <div className="grid gap-2 sm:col-span-2">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                    placeholder="Minimal 8 karakter"
                                />
                                <InputError message={form.errors.password} />
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label>Role</Label>
                            <Select value={form.data.role} onValueChange={(v) => form.setData('role', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLES.map((role) => (
                                        <SelectItem key={role} value={role}>
                                            {ROLE_LABELS[role]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <label className="flex items-center gap-2 pt-7 text-sm">
                                <Checkbox checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', Boolean(v))} /> Akun aktif
                            </label>
                        </div>
                        {form.data.role === 'dapur' && (
                            <div className="grid gap-2">
                                <Label>Kitchen Station</Label>
                                <Select value={form.data.kitchen_station_id} onValueChange={(v) => form.setData('kitchen_station_id', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih kitchen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Tanpa kitchen</SelectItem>
                                        {kitchenStations.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {form.data.role === 'bar' && (
                            <div className="grid gap-2">
                                <Label>Bar Station</Label>
                                <Select value={form.data.bar_station_id} onValueChange={(v) => form.setData('bar_station_id', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih bar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Tanpa bar</SelectItem>
                                        {barStations.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {form.data.role === 'waiter' && (
                        <div className="grid gap-2">
                            <Label>Zona yang ditugaskan</Label>
                            <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                                {zones.map((zone) => (
                                    <label key={zone.id} className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={form.data.zone_ids.includes(zone.id)}
                                            onCheckedChange={(checked) =>
                                                form.setData(
                                                    'zone_ids',
                                                    checked ? [...form.data.zone_ids, zone.id] : form.data.zone_ids.filter((id) => id !== zone.id),
                                                )
                                            }
                                        />
                                        {zone.name}
                                    </label>
                                ))}
                                {zones.length === 0 && <span className="text-muted-foreground text-xs">Belum ada zona.</span>}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {mode === 'create' ? 'Simpan Staff' : 'Simpan Perubahan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ResetPasswordDialog({ user, onClose }: { user: User; onClose: () => void }) {
    const form = useForm({ password: '' });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(`/users/${user.id}/reset-password`, { preserveScroll: true, onSuccess: onClose });
    }

    return (
        <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Reset Password: {user.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Password Baru</Label>
                        <Input
                            type="password"
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                            placeholder="Minimal 8 karakter"
                        />
                        <InputError message={form.errors.password} />
                        <p className="text-muted-foreground text-xs">Staff akan diminta mengganti password saat login berikutnya.</p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            Reset Password
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
