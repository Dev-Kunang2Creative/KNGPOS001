import BottomNav from '@/components/self-order/BottomNav';
import SelfOrderLayout from '@/layouts/SelfOrderLayout';
import { router, usePage } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect } from 'react';

type SelfOrder = {
    id: number;
    status: string;
    subtotal: string;
    service_charge_amount: string;
    tax_amount: string;
    total_amount: string;
    payment_preference: string;
    rejection_reason?: string | null;
    table?: { name: string };
    items: { id: number; quantity: number; menu_item?: { name: string }; addons?: { id: number; name: string }[] }[];
};
type Payment = { id: number; external_id: string; status: string; xendit_raw_response?: Record<string, unknown> | null } | null;
type StoredOrder = { id: number; status: string; total_amount: string; items_count: number; timestamp: string };
type Props = { qrToken: string; selfOrder: SelfOrder; payment: Payment; restaurant: { name: string } };

export default function SelfOrderStatus({ qrToken, selfOrder, payment, restaurant }: Props) {
    const { flash } = usePage<{ flash?: { error?: string; success?: string } }>().props;
    const qrString = typeof payment?.xendit_raw_response?.qr_string === 'string' ? payment.xendit_raw_response.qr_string : null;
    const invoiceUrl = typeof payment?.xendit_raw_response?.invoice_url === 'string' ? payment.xendit_raw_response.invoice_url : null;
    const isPaid = String(payment?.status ?? '').toLowerCase() === 'paid';
    const isQrisPending = selfOrder.payment_preference === 'qris' && selfOrder.status === 'converted_to_order' && !isPaid;
    const isOnlinePending = selfOrder.payment_preference === 'online' && selfOrder.status === 'converted_to_order' && !isPaid;
    const shouldPoll = selfOrder.status === 'pending' || isQrisPending || isOnlinePending;

    function simulatePayment() {
        if (!payment) return;
        router.post(
            `/s/${qrToken}/status/${selfOrder.id}/payments/${payment.id}/simulate`,
            {},
            {
                preserveScroll: true,
            },
        );
    }

    function refreshPayment() {
        router.post(`/s/${qrToken}/status/${selfOrder.id}/refresh`, {}, { preserveScroll: true, preserveState: true });
    }

    useEffect(() => {
        if (!shouldPoll) return;

        const interval = window.setInterval(() => {
            if (document.hidden) return;
            // Online (Xendit Invoice) payments are confirmed by actively querying Xendit.
            if (isOnlinePending) {
                router.post(`/s/${qrToken}/status/${selfOrder.id}/refresh`, {}, { preserveScroll: true, preserveState: true });
                return;
            }
            router.reload({
                only: ['selfOrder', 'payment'],
            });
        }, 5000);

        return () => window.clearInterval(interval);
    }, [shouldPoll, isOnlinePending, qrToken, selfOrder.id]);

    useEffect(() => {
        const key = `karcisqu_orders_${qrToken}`;
        const storedOrders: StoredOrder[] = JSON.parse(localStorage.getItem(key) || '[]');
        const existingIndex = storedOrders.findIndex((o) => o.id === selfOrder.id);

        const orderData = {
            id: selfOrder.id,
            status: selfOrder.status,
            total_amount: selfOrder.total_amount,
            items_count: selfOrder.items.reduce((sum, item) => sum + item.quantity, 0),
            timestamp: new Date().toISOString(),
        };

        if (existingIndex >= 0) {
            orderData.timestamp = storedOrders[existingIndex].timestamp;
            storedOrders[existingIndex] = orderData;
        } else {
            storedOrders.push(orderData);
        }

        localStorage.setItem(key, JSON.stringify(storedOrders));
    }, [selfOrder, qrToken]);

    // Timeline logic
    const isReceived = true; // Always received if this page is shown
    const isConfirmed = selfOrder.status === 'converted_to_order' && !isQrisPending && !isOnlinePending;
    const isRejected = selfOrder.status === 'rejected';

    return (
        <SelfOrderLayout title={`Status Pesanan - ${restaurant.name} - ${selfOrder.table?.name}`}>
            <header className="bg-surface fixed top-0 right-0 left-0 z-50 mx-auto flex h-16 w-full max-w-md items-center justify-between px-4 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
                <button
                    onClick={() => {
                        if (window.history.length > 2) {
                            window.history.back();
                        } else {
                            router.visit(`/s/${qrToken}?view=orders`);
                        }
                    }}
                    className="text-primary hover:bg-surface-container-low rounded-full p-2 transition-colors duration-200 active:scale-95"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="text-primary flex-1 text-center text-lg font-bold">{restaurant.name}</div>
                <div className="w-10"></div>
            </header>

            <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-24 pb-12">
                {flash?.error && (
                    <div className="border-error/40 bg-error-container text-on-error-container mb-4 rounded-md border p-3 text-sm shadow-sm">
                        {flash.error}
                    </div>
                )}
                {flash?.success && (
                    <div className="border-primary/40 bg-primary-container mb-4 rounded-md border p-3 text-sm text-white shadow-sm">
                        {flash.success}
                    </div>
                )}

                <section className="mb-8 text-center">
                    <h1 className="text-display-lg text-primary mb-2">Pesanan #{selfOrder.id}</h1>
                    <p className="text-on-surface-variant text-base">{selfOrder.table?.name} • Estimasi: 15 mnt</p>
                </section>

                {isQrisPending && (
                    <section className="bg-surface-container-lowest mb-8 rounded-xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
                        <div className="text-center">
                            <h2 className="text-primary mb-2 text-base font-bold">Selesaikan Pembayaran</h2>
                            <p className="text-on-surface-variant mb-6 text-sm">
                                Scan QRIS di bawah ini menggunakan aplikasi e-wallet atau m-banking Anda.
                            </p>

                            {qrString ? (
                                <div className="border-surface-variant mb-6 inline-block rounded-xl border bg-white p-4 shadow-sm">
                                    <QRCodeSVG value={qrString} size={240} className="mx-auto" />
                                </div>
                            ) : (
                                <div className="border-surface-variant bg-surface-container-low mb-6 flex inline-block h-[240px] w-[240px] items-center justify-center rounded-xl border p-4">
                                    <span className="material-symbols-outlined text-outline animate-spin text-[40px]">progress_activity</span>
                                </div>
                            )}

                            <button
                                onClick={simulatePayment}
                                className="bg-primary h-12 w-full rounded-full text-sm font-bold font-semibold text-white shadow-sm transition-transform active:scale-[0.98]"
                            >
                                Simulasi Bayar QRIS
                            </button>
                        </div>
                    </section>
                )}

                {isOnlinePending && (
                    <section className="bg-surface-container-lowest mb-8 rounded-xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
                        <div className="text-center">
                            <h2 className="text-primary mb-2 text-base font-bold">Selesaikan Pembayaran</h2>
                            <p className="text-on-surface-variant mb-6 text-sm">
                                Pilih metode pembayaran (e-wallet, Virtual Account, kartu, atau paylater) di halaman pembayaran.
                            </p>

                            {invoiceUrl ? (
                                <a
                                    href={invoiceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-primary mb-3 flex h-12 w-full items-center justify-center rounded-full text-sm font-bold font-semibold text-white shadow-sm transition-transform active:scale-[0.98]"
                                >
                                    Lanjut ke Pembayaran
                                </a>
                            ) : (
                                <div className="border-surface-variant bg-surface-container-low mb-3 flex h-12 w-full items-center justify-center rounded-full border">
                                    <span className="material-symbols-outlined text-outline animate-spin">progress_activity</span>
                                </div>
                            )}

                            <button
                                onClick={refreshPayment}
                                className="bg-surface-container text-primary h-12 w-full rounded-full text-sm font-bold font-semibold transition-transform active:scale-[0.98]"
                            >
                                Saya Sudah Bayar — Cek Status
                            </button>
                            <p className="text-on-surface-variant mt-3 text-xs">Status akan terbarui otomatis setelah pembayaran berhasil.</p>
                        </div>
                    </section>
                )}

                {!isQrisPending && !isOnlinePending && (
                    <section className="bg-surface-container-lowest mb-8 rounded-xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
                        <h2 className="text-primary mb-6 text-base font-bold">Status</h2>
                        <div className="relative pl-2">
                            <div className="bg-surface-variant absolute top-4 bottom-4 left-[27px] w-0.5"></div>
                            <div
                                className={`bg-primary-container absolute top-4 left-[27px] w-0.5 transition-all duration-500 ${isConfirmed ? 'h-1/2' : 'h-0'}`}
                            ></div>

                            {/* Step 1: Received */}
                            <div className="relative z-10 mb-6 flex items-start">
                                <div
                                    className={`mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full shadow-sm ${isReceived ? 'bg-primary-container text-white' : 'bg-surface-variant text-outline'}`}
                                >
                                    <span className="material-symbols-outlined icon-fill text-xl">check</span>
                                </div>
                                <div className="pt-2">
                                    <h3 className="text-on-surface text-sm font-semibold">Pesanan Diterima</h3>
                                    <p className="text-on-surface-variant mt-1 text-sm">
                                        {selfOrder.status === 'pending' ? 'Menunggu konfirmasi kasir' : 'Diterima oleh sistem'}
                                    </p>
                                </div>
                            </div>

                            {/* Step 2: Confirmed or Rejected */}
                            {isRejected ? (
                                <div className="relative z-10 mb-6 flex items-start">
                                    <div className="bg-error-container text-on-error-container mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full shadow-sm">
                                        <span className="material-symbols-outlined icon-fill text-xl">cancel</span>
                                    </div>
                                    <div className="pt-2">
                                        <h3 className="text-error text-sm font-semibold">Pesanan Ditolak</h3>
                                        <p className="text-on-surface-variant mt-1 text-sm">{selfOrder.rejection_reason || 'Ditolak oleh kasir'}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative z-10 mb-6 flex items-start">
                                    <div
                                        className={`mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full shadow-sm transition-colors ${isConfirmed ? 'bg-primary-container text-white' : 'bg-surface-variant text-outline'}`}
                                    >
                                        <span className="material-symbols-outlined icon-fill text-xl">done_all</span>
                                    </div>
                                    <div className={`pt-2 transition-opacity ${!isConfirmed ? 'opacity-50' : ''}`}>
                                        <h3 className="text-on-surface text-sm font-semibold">Dikonfirmasi</h3>
                                        <p className="text-on-surface-variant mt-1 text-sm">Dapur menerima pesanan</p>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Preparing */}
                            {!isRejected && (
                                <div className="relative z-10 mb-6 flex items-start">
                                    <div
                                        className={`mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all ${isConfirmed ? 'bg-secondary-container text-on-secondary-container ring-surface-container-lowest shadow-[0px_4px_12px_rgba(0,0,0,0.1)] ring-4' : 'bg-surface-variant text-outline'}`}
                                    >
                                        <span className={`material-symbols-outlined icon-fill text-xl ${isConfirmed ? 'animate-spin-slow' : ''}`}>
                                            skillet
                                        </span>
                                    </div>
                                    <div className={`pt-2 transition-opacity ${!isConfirmed ? 'opacity-50' : ''}`}>
                                        <h3
                                            className={`text-base font-bold ${isConfirmed ? 'text-primary' : 'text-on-surface text-sm font-semibold'}`}
                                        >
                                            Menyiapkan Makanan
                                        </h3>
                                        <p className={`mt-1 text-sm ${isConfirmed ? 'text-secondary font-medium' : 'text-on-surface-variant'}`}>
                                            {isConfirmed ? 'Koki sedang memasak' : 'Menunggu konfirmasi'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Ready */}
                            {!isRejected && (
                                <div className="relative z-10 flex items-start">
                                    <div className="bg-surface-variant text-outline mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
                                        <span className="material-symbols-outlined text-xl">room_service</span>
                                    </div>
                                    <div className="pt-2 opacity-50">
                                        <h3 className="text-on-surface text-sm font-semibold">Siap Disajikan</h3>
                                        <p className="text-on-surface-variant mt-1 text-sm">Menunggu untuk disajikan</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                <section className="bg-surface-container-lowest mb-8 rounded-xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
                    <h2 className="text-primary mb-4 text-base font-bold">Ringkasan Pesanan</h2>
                    <ul className="divide-surface-variant mb-4 divide-y">
                        {selfOrder.items.map((item) => (
                            <li key={item.id} className="flex items-start justify-between py-2">
                                <div className="flex items-start">
                                    <span className="text-primary-container bg-surface-container-low mr-2 rounded px-2 py-0.5 text-sm font-bold font-semibold">
                                        {item.quantity}x
                                    </span>
                                    <div>
                                        <p className="text-on-surface text-base">{item.menu_item?.name}</p>
                                        {item.addons && item.addons.length > 0 && (
                                            <p className="text-on-surface-variant mt-0.5 text-xs">+ {item.addons.map((a) => a.name).join(', ')}</p>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="border-surface-variant flex flex-col gap-2 border-t pt-4">
                        {Number(selfOrder.service_charge_amount ?? 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-on-surface-variant">Subtotal</span>
                                <span className="text-on-surface">Rp {Number(selfOrder.subtotal).toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        {Number(selfOrder.service_charge_amount ?? 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-on-surface-variant">Service Charge</span>
                                <span className="text-on-surface">Rp {Number(selfOrder.service_charge_amount).toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        {Number(selfOrder.tax_amount ?? 0) > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-on-surface-variant">PB1</span>
                                <span className="text-on-surface">Rp {Number(selfOrder.tax_amount).toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        <div
                            className={`flex items-center justify-between ${Number(selfOrder.service_charge_amount ?? 0) > 0 || Number(selfOrder.tax_amount ?? 0) > 0 ? 'mt-2 border-t pt-2' : ''}`}
                        >
                            <span className="text-on-surface-variant text-sm font-semibold">Total</span>
                            <span className="text-primary text-base font-bold">Rp {Number(selfOrder.total_amount).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </section>
            </main>

            <div className="pointer-events-none fixed right-0 bottom-[112px] left-0 z-40 mx-auto flex max-w-md justify-end px-4">
                <button className="bg-secondary-container text-on-secondary-container pointer-events-auto flex items-center rounded-xl px-4 py-3 shadow-[0px_8px_24px_rgba(0,0,0,0.15)] transition-transform duration-200 active:scale-95">
                    <span className="material-symbols-outlined icon-fill mr-2">notifications_active</span>
                    <span className="text-sm font-bold font-semibold">Panggil Pelayan</span>
                </button>
            </div>

            <BottomNav
                activeTab="status"
                onMenuClick={() => router.visit(`/s/${qrToken}`)}
                onCartClick={() => router.visit(`/s/${qrToken}?view=cart`)}
                onStatusClick={() => router.visit(`/s/${qrToken}?view=orders`)}
            />

            <style>{`
 .animate-spin-slow {
 animation: spin 3s linear infinite;
 }
 `}</style>
        </SelfOrderLayout>
    );
}
