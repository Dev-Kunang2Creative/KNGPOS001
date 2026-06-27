import { useState } from 'react';

type Props = {
 onContinue: (type: 'open' | 'close') => void;
};

export default function BillSelection({ onContinue }: Props) {
 const [selectedType, setSelectedType] = useState<'open' | 'close' | null>(null);
 const [isLoading, setIsLoading] = useState(false);

 const handleContinue = () => {
 if (!selectedType) return;
 setIsLoading(true);
 setTimeout(() => {
 onContinue(selectedType);
 setIsLoading(false);
 }, 800);
 };

 return (
 <div className="mx-auto flex w-full max-w-md flex-grow flex-col px-4 pt-24 pb-32">
 <div className="mb-6 text-center">
 <h1 className="text-lg font-bold text-primary mb-2">Bagaimana Anda ingin memesan?</h1>
 <p className="text-sm text-on-surface-variant">Pilih cara Anda ingin mengelola pesanan untuk sesi ini.</p>
 </div>

 <div className="flex flex-col gap-4">
 <button
 onClick={() => setSelectedType('open')}
 className={`group relative w-full overflow-hidden rounded-xl border-2 p-4 text-left transition-all duration-200 active:scale-[0.98] ${
 selectedType === 'open'
 ? 'border-primary bg-surface-container-low shadow-[0px_4px_12px_rgba(0,0,0,0.05)]'
 : 'border-surface-container-high bg-surface hover:border-outline-variant'
 }`}
 >
 <div className="flex items-start gap-4">
 <div className="bg-primary-container text-white flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
 <span className="material-symbols-outlined icon-fill">lock_open</span>
 </div>
 <div className="flex-grow pr-2">
 <h2 className="text-sm font-semibold text-on-surface mb-1">Open Bill</h2>
 <p className="text-sm text-on-surface-variant">
 Biarkan tagihan tetap terbuka. Pesan menu secara berkelanjutan dan bayar satu kali di akhir kunjungan.
 </p>
 </div>
 </div>
 <div
 className={`text-primary bg-surface absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-all duration-200 ${
 selectedType === 'open' ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
 }`}
 >
 <span className="material-symbols-outlined icon-fill text-[16px]">check_circle</span>
 </div>
 </button>

 <button
 onClick={() => setSelectedType('close')}
 className={`group relative w-full overflow-hidden rounded-xl border-2 p-4 text-left transition-all duration-200 active:scale-[0.98] ${
 selectedType === 'close'
 ? 'border-primary bg-surface-container-low shadow-[0px_4px_12px_rgba(0,0,0,0.05)]'
 : 'border-surface-container-high bg-surface hover:border-outline-variant'
 }`}
 >
 <div className="flex items-start gap-4">
 <div className="bg-secondary-container text-on-secondary-container flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
 <span className="material-symbols-outlined icon-fill">lock</span>
 </div>
 <div className="flex-grow pr-2">
 <h2 className="text-sm font-semibold text-on-surface mb-1">Close Bill</h2>
 <p className="text-sm text-on-surface-variant">
 Bayar saat memesan. Anda akan diminta untuk langsung membayar setiap kali melakukan pesanan.
 </p>
 </div>
 </div>
 <div
 className={`text-primary bg-surface absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full shadow-sm transition-all duration-200 ${
 selectedType === 'close' ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
 }`}
 >
 <span className="material-symbols-outlined icon-fill text-[16px]">check_circle</span>
 </div>
 </button>
 </div>

 <div className="bg-surface/90 border-surface-variant pb-safe fixed bottom-0 left-0 right-0 mx-auto max-w-md z-40 w-full border-t p-4 shadow-[0px_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md">
 <div className="mx-auto max-w-md">
 <button
 onClick={handleContinue}
 disabled={!selectedType || isLoading}
 className={`text-sm font-semibold flex h-12 w-full items-center justify-center gap-1 rounded-full transition-all duration-200 ${
 selectedType
 ? 'bg-primary text-white shadow-md active:scale-95'
 : 'bg-surface-container-highest text-outline cursor-not-allowed'
 }`}
 >
 {isLoading ? (
 <span className="material-symbols-outlined animate-spin">progress_activity</span>
 ) : (
 <>
 <span>Lanjutkan</span>
 <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 );
}
