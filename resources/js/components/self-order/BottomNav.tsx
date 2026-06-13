type BottomNavProps = {
    activeTab: 'menu' | 'cart' | 'status';
    onMenuClick?: () => void;
    onCartClick?: () => void;
    onStatusClick?: () => void;
    cartCount?: number;
};

export default function BottomNav({ activeTab, onMenuClick, onCartClick, onStatusClick, cartCount = 0 }: BottomNavProps) {
    return (
        <div className="bg-surface fixed right-0 bottom-0 left-0 z-[60] mx-auto w-full max-w-md rounded-t-3xl pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)] shadow-[0px_-4px_24px_rgba(0,0,0,0.08)]">
            <div className="mx-auto flex max-w-md items-center justify-between px-6">
                {/* Menu Tab */}
                <button
                    onClick={onMenuClick}
                    className={`flex h-[52px] w-[72px] flex-col items-center justify-center rounded-[26px] transition-colors duration-200 ${
                        activeTab === 'menu' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary bg-transparent'
                    }`}
                >
                    <span className={`material-symbols-outlined mb-0.5 text-[24px] leading-none ${activeTab === 'menu' ? 'icon-fill' : ''}`}>
                        restaurant
                    </span>
                    <span className="text-[12px] leading-none font-medium">Menu</span>
                </button>

                {/* Keranjang Tab */}
                <button
                    onClick={onCartClick}
                    className={`relative flex h-[52px] w-[72px] flex-col items-center justify-center rounded-[26px] transition-colors duration-200 ${
                        activeTab === 'cart' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary bg-transparent'
                    }`}
                >
                    <div className="relative mb-0.5 flex flex-col items-center">
                        <span className={`material-symbols-outlined text-[24px] leading-none ${activeTab === 'cart' ? 'icon-fill' : ''}`}>
                            shopping_cart
                        </span>
                        {cartCount > 0 && (
                            <span className="bg-error text-on-error absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold">
                                {cartCount}
                            </span>
                        )}
                    </div>
                    <span className="text-[12px] leading-none font-medium">Keranjang</span>
                </button>

                {/* Pesanan Tab */}
                <button
                    onClick={onStatusClick}
                    className={`flex h-[52px] w-[72px] flex-col items-center justify-center rounded-[26px] transition-colors duration-200 ${
                        activeTab === 'status' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary bg-transparent'
                    }`}
                >
                    <span className={`material-symbols-outlined mb-0.5 text-[24px] leading-none ${activeTab === 'status' ? 'icon-fill' : ''}`}>
                        receipt_long
                    </span>
                    <span className="text-[12px] leading-none font-medium">Pesanan</span>
                </button>
            </div>
        </div>
    );
}
