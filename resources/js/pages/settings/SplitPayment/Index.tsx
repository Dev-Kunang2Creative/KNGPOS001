import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { BadgePercent, Building2, Info, Pencil, Plus, RefreshCw, Split, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/system' },
    { title: 'Split Payment', href: '/settings/split-payment' },
];

type SplitAccount = {
    id: number;
    name: string;
    bank_code: string | null;
    bank_name: string | null;
    account_number: string | null;
    account_holder: string | null;
    percent_amount: string;
    is_active: boolean;
    sort_order: number;
};

type Disbursement = {
    id: number;
    split_account_id: number;
    transaction_id: number;
    channel_code: string;
    amount: string;
    status: string;
    disbursed_at: string | null;
    split_account: SplitAccount;
};

type Props = {
    accounts: SplitAccount[];
    totalPercent: number;
    splitEnabled: boolean;
    bankChannels: Record<string, string>;
    recentDisbursements: Disbursement[];
};

const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#a855f7', '#3b82f6'];

const emptyForm = {
    name: '',
    bank_code: '',
    bank_name: '',
    account_number: '',
    account_holder: '',
    percent_amount: '',
    is_active: true,
    sort_order: 0,
};

export default function SplitPaymentIndex({ accounts, totalPercent, splitEnabled, bankChannels, recentDisbursements }: Props) {
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<SplitAccount | null>(null);
    const [toggling, setToggling] = useState(false);

    const form = useForm(emptyForm);

    const openCreateModal = () => {
        form.reset();
        form.setData(emptyForm);
        setEditingAccount(null);
        setShowModal(true);
    };

    const openEditModal = (account: SplitAccount) => {
        setEditingAccount(account);
        form.setData({
            name: account.name,
            bank_code: account.bank_code ?? '',
            bank_name: account.bank_name ?? '',
            account_number: account.account_number ?? '',
            account_holder: account.account_holder ?? '',
            percent_amount: account.percent_amount,
            is_active: account.is_active,
            sort_order: account.sort_order,
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingAccount(null);
        form.reset();
    };

    const submitForm = () => {
        if (editingAccount) {
            form.put(route('settings.split-payment.update', editingAccount.id), {
                onSuccess: closeModal,
                preserveScroll: true,
            });
        } else {
            form.post(route('settings.split-payment.store'), {
                onSuccess: closeModal,
                preserveScroll: true,
            });
        }
    };

    const deleteAccount = (account: SplitAccount) => {
        if (!confirm(`Hapus akun "${account.name}"?`)) return;
        router.delete(route('settings.split-payment.destroy', account.id), { preserveScroll: true });
    };

    const toggleSplit = () => {
        setToggling(true);
        router.post(
            route('settings.split-payment.toggle'),
            { enabled: !splitEnabled },
            {
                onFinish: () => setToggling(false),
                preserveScroll: true,
            },
        );
    };

    // Build pie chart data
    const activeAccounts = accounts.filter((a) => a.is_active);
    const remainder = Math.max(0, 100 - activeAccounts.reduce((s, a) => s + parseFloat(a.percent_amount), 0));

    const chartData = [
        ...activeAccounts.map((a) => ({ name: a.name, value: parseFloat(a.percent_amount) })),
        ...(remainder > 0 ? [{ name: 'Sisa', value: remainder }] : []),
    ];

    const isOver100 = totalPercent > 100;
    const isExactly100 = Math.abs(totalPercent - 100) < 0.01;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Split Payment Settings" />

            <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Split className="text-primary h-6 w-6" />
                            <h1 className="text-2xl font-bold tracking-tight">Split Payment</h1>
                            <Badge variant={splitEnabled ? 'default' : 'secondary'} className="ml-1">
                                {splitEnabled ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Konfigurasi distribusi otomatis pendapatan ke beberapa akun via Xendit Split Rule.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant={splitEnabled ? 'destructive' : 'default'} size="sm" onClick={toggleSplit} disabled={toggling}>
                            {toggling ? <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> : null}
                            {splitEnabled ? 'Nonaktifkan Split' : 'Aktifkan Split'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={openCreateModal}>
                            <Plus className="mr-1 h-4 w-4" />
                            Tambah Akun
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                    {/* Accounts Table */}
                    <div className="rounded-xl border shadow-sm">
                        {/* Total percentage bar */}
                        <div className="border-b p-4">
                            <div className="mb-1 flex items-center justify-between text-sm">
                                <span className="font-medium">Total Persentase Aktif</span>
                                <span
                                    className={`font-bold tabular-nums ${isOver100 ? 'text-red-600' : isExactly100 ? 'text-emerald-600' : 'text-amber-600'}`}
                                >
                                    {totalPercent.toFixed(2)}%
                                </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <div
                                    className={`h-full rounded-full transition-all ${isOver100 ? 'bg-red-500' : isExactly100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    style={{ width: `${Math.min(totalPercent, 100)}%` }}
                                />
                            </div>
                            {isOver100 && <p className="mt-1 text-xs text-red-600">Total melebihi 100%. Kurangi persentase akun aktif.</p>}
                            {isExactly100 && <p className="mt-1 text-xs text-emerald-600">Distribusi sempurna — total tepat 100%.</p>}
                        </div>

                        {accounts.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 py-16 text-center">
                                <Split className="text-muted-foreground/30 h-12 w-12" />
                                <div>
                                    <p className="font-medium">Belum ada akun split</p>
                                    <p className="text-muted-foreground text-sm">Tambahkan akun tujuan distribusi pendapatan.</p>
                                </div>
                                <Button size="sm" onClick={openCreateModal}>
                                    <Plus className="mr-1 h-4 w-4" /> Tambah Akun
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {accounts.map((account, idx) => (
                                    <div key={account.id} className="flex items-center gap-4 p-4">
                                        {/* Color dot */}
                                        <div
                                            className="h-3 w-3 shrink-0 rounded-full"
                                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                                        />

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-medium">{account.name}</span>
                                                <Badge variant={account.is_active ? 'default' : 'secondary'} className="text-xs">
                                                    {account.is_active ? 'Aktif' : 'Nonaktif'}
                                                </Badge>
                                                {!account.bank_code || !account.account_number ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-amber-300 text-xs text-amber-600 dark:border-amber-700 dark:text-amber-400"
                                                    >
                                                        Info Bank Belum Lengkap
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                                                {account.bank_code && (
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="h-3 w-3" />
                                                        {account.bank_name || account.bank_code}
                                                        {account.account_number && ` · ${account.account_number}`}
                                                        {account.account_holder && ` (${account.account_holder})`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Percentage */}
                                        <div className="flex items-center gap-1 text-lg font-bold tabular-nums">
                                            <BadgePercent className="text-muted-foreground h-4 w-4" />
                                            {parseFloat(account.percent_amount).toFixed(2)}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEditModal(account)} title="Edit">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                                                onClick={() => deleteAccount(account)}
                                                title="Hapus"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pie Chart */}
                    <div className="rounded-xl border p-4 shadow-sm">
                        <h2 className="mb-4 text-sm font-semibold">Distribusi Persentase</h2>
                        {activeAccounts.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                                            {chartData.map((_, index) => (
                                                <Cell
                                                    key={index}
                                                    fill={index < activeAccounts.length ? CHART_COLORS[index % CHART_COLORS.length] : '#e5e7eb'}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => [`${Number(value ?? 0).toFixed(2)}%`, '']}
                                            contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-3 grid gap-1.5">
                                    {chartData.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1.5">
                                                <span
                                                    className="inline-block h-2.5 w-2.5 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            index < activeAccounts.length ? CHART_COLORS[index % CHART_COLORS.length] : '#e5e7eb',
                                                    }}
                                                />
                                                <span className={index >= activeAccounts.length ? 'text-muted-foreground' : ''}>{item.name}</span>
                                            </span>
                                            <span className="font-mono font-medium">{item.value.toFixed(2)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-muted-foreground flex flex-col items-center justify-center py-10 text-center text-sm">
                                <Info className="mb-2 h-8 w-8 opacity-30" />
                                Belum ada akun aktif
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Box */}
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/20">
                    <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                        <div className="space-y-1 text-blue-800 dark:text-blue-300">
                            <p className="font-medium">Cara kerja Split Payment (via Xendit Payouts)</p>
                            <ol className="list-inside list-decimal space-y-1 text-xs">
                                <li>
                                    Tambahkan akun tujuan dengan memilih <strong>Bank</strong> dan mengisi <strong>No. Rekening</strong>.
                                </li>
                                <li>
                                    Pastikan total persentase akun aktif = <strong>100%</strong>.
                                </li>
                                <li>Aktifkan toggle Split Payment.</li>
                                <li>
                                    Setiap pembayaran QRIS/Invoice yang berhasil (PAID) akan otomatis memicu Disbursement (Transfer) ke masing-masing
                                    rekening sesuai persentase.
                                </li>
                            </ol>
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                ⚠️ Biaya transfer antar bank mungkin berlaku dan akan dipotong dari saldo Xendit Anda.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border bg-white shadow-2xl dark:bg-gray-900">
                        <div className="flex items-center justify-between border-b p-5">
                            <h2 className="text-lg font-semibold">{editingAccount ? 'Edit Akun Split' : 'Tambah Akun Split'}</h2>
                            <button onClick={closeModal} className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid gap-4 p-5">
                            {/* Name */}
                            <div>
                                <Label>
                                    Nama Akun <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    className="mt-1"
                                    placeholder="e.g. Kas Pusat, Biaya Franchise"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                />
                                {form.errors.name && <p className="mt-1 text-xs text-red-600">{form.errors.name}</p>}
                            </div>

                            {/* Percent */}
                            <div>
                                <Label>
                                    Persentase (%) <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative mt-1">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        placeholder="e.g. 30"
                                        value={form.data.percent_amount}
                                        onChange={(e) => form.setData('percent_amount', e.target.value)}
                                    />
                                    <BadgePercent className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
                                </div>
                                {form.errors.percent_amount && <p className="mt-1 text-xs text-red-600">{form.errors.percent_amount}</p>}
                            </div>

                            {/* Bank info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>
                                        Bank / Channel <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={form.data.bank_code}
                                        onValueChange={(val) => {
                                            form.setData('bank_code', val);
                                            form.setData('bank_name', bankChannels[val] ?? '');
                                        }}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Pilih Bank" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(bankChannels).map(([code, name]) => (
                                                <SelectItem key={code} value={code}>
                                                    {name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.bank_code && <p className="mt-1 text-xs text-red-600">{form.errors.bank_code}</p>}
                                </div>
                                <div>
                                    <Label>No. Rekening</Label>
                                    <Input
                                        className="mt-1"
                                        placeholder="e.g. 1234567890"
                                        value={form.data.account_number}
                                        onChange={(e) => form.setData('account_number', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Nama Pemilik Rekening</Label>
                                <Input
                                    className="mt-1"
                                    placeholder="e.g. PT Karcisqu Indonesia"
                                    value={form.data.account_holder}
                                    onChange={(e) => form.setData('account_holder', e.target.value)}
                                />
                            </div>

                            {/* Active & Sort */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Sort Order</Label>
                                    <Input
                                        type="number"
                                        className="mt-1"
                                        min="0"
                                        value={form.data.sort_order}
                                        onChange={(e) => form.setData('sort_order', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="flex flex-col justify-end pb-1">
                                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300"
                                            checked={form.data.is_active}
                                            onChange={(e) => form.setData('is_active', e.target.checked)}
                                        />
                                        Aktifkan akun ini
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t p-5">
                            <Button variant="outline" onClick={closeModal}>
                                Batal
                            </Button>
                            <Button onClick={submitForm} disabled={form.processing}>
                                {form.processing ? <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> : null}
                                {editingAccount ? 'Simpan Perubahan' : 'Tambah Akun'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
