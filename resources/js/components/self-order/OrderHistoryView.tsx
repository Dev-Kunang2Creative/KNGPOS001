import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type StoredOrder = {
 id: number;
 status: string;
 total_amount: string;
 items_count: number;
 timestamp: string;
};

type Props = {
 qrToken: string;
 onBack: () => void;
};

export default function OrderHistoryView({ qrToken, onBack }: Props) {
 const [orders, setOrders] = useState<StoredOrder[]>([]);

 useEffect(() => {
 const stored = JSON.parse(localStorage.getItem(`karcisqu_orders_${qrToken}`) || '[]');
 // Sort descending by timestamp
 stored.sort((a: StoredOrder, b: StoredOrder) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
 setOrders(stored);
 }, [qrToken]);

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'pending':
 return <span className="bg-surface-variant text-on-surface-variant rounded-full px-2 py-1 text-xs">Menunggu Konfirmasi</span>;
 case 'converted_to_order':
 return <span className="bg-primary-container text-white rounded-full px-2 py-1 text-xs">Diproses Dapur</span>;
 case 'rejected':
 return <span className="bg-error-container text-on-error-container rounded-full px-2 py-1 text-xs">Ditolak</span>;
 case 'completed':
 return <span className="bg-secondary-container text-on-secondary-container rounded-full px-2 py-1 text-xs">Selesai</span>;
 default:
 return <span className="bg-surface-variant text-on-surface-variant rounded-full px-2 py-1 text-xs">{status}</span>;
 }
 };

 return (
 <div className="bg-surface text-on-surface flex min-h-screen flex-col pt-16 pb-[120px] antialiased">
 <header className="bg-surface fixed top-0 right-0 left-0 z-50 mx-auto flex h-16 w-full max-w-md items-center justify-between px-4 shadow-[0px_4px_12px_rgba(0,0,0,0.05)] shadow-sm">
 <button
 onClick={onBack}
 aria-label="Kembali"
 className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-2 transition-transform active:scale-95"
 >
 <span className="material-symbols-outlined">arrow_back</span>
 </button>
 <h1 className="text-base font-bold text-primary font-bold">Riwayat Pesanan</h1>
 <div className="w-10"></div>
 </header>

 <main className="mx-auto w-full max-w-2xl flex-grow flex-col px-4 py-6">
 {orders.length === 0 ? (
 <div className="flex flex-col items-center py-12 text-center">
 <span className="material-symbols-outlined text-surface-variant mb-4 text-[64px]">receipt_long</span>
 <p className="text-base text-on-surface-variant">Belum ada pesanan yang dibuat.</p>
 <button
 onClick={onBack}
 className="bg-primary text-white mt-6 rounded-full px-6 py-2 font-medium transition-transform active:scale-95"
 >
 Pesan Sekarang
 </button>
 </div>
 ) : (
 <div className="flex flex-col gap-4">
 {orders.map((order) => (
 <button
 key={order.id}
 onClick={() => router.visit(`/s/${qrToken}/status/${order.id}`)}
 className="bg-surface-container-lowest hover:border-primary-container border-surface-variant rounded-xl border p-4 text-left shadow-[0px_4px_12px_rgba(0,0,0,0.05)] transition-colors active:scale-[0.98]"
 >
 <div className="mb-2 flex items-start justify-between">
 <div>
 <h2 className="text-sm font-semibold text-primary">Pesanan #{order.id}</h2>
 <p className="text-xs text-on-surface-variant mt-0.5">
 {new Date(order.timestamp).toLocaleString('id-ID', {
 hour: '2-digit',
 minute: '2-digit',
 day: 'numeric',
 month: 'short',
 })}
 </p>
 </div>
 {getStatusBadge(order.status)}
 </div>
 <div className="mt-4 flex items-center justify-between">
 <span className="text-sm text-on-surface-variant">{order.items_count} item</span>
 <span className="text-sm font-semibold font-bold">Rp {Number(order.total_amount).toLocaleString('id-ID')}</span>
 </div>
 </button>
 ))}
 </div>
 )}
 </main>
 </div>
 );
}
