import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
    key: number;
    type: ToastType;
    message: string;
}

const styles: Record<ToastType, { icon: typeof CheckCircle2; className: string }> = {
    success: {
        icon: CheckCircle2,
        className: 'border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    error: {
        icon: XCircle,
        className: 'border-red-500/30 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300',
    },
    info: {
        icon: Info,
        className: 'border-blue-500/30 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
    },
};

export interface ToastOverride {
    type: ToastType;
    message: string;
    /** Bump this to re-trigger the same message (e.g. repeated failed submits). */
    nonce: number;
}

/**
 * Floating toast notification driven by Inertia flash props.
 * Appears on success/error/info flash messages and auto-dismisses.
 * Pass `override` to trigger a client-side toast (e.g. from an onError callback).
 */
export default function FlashToast({ duration = 4000, override }: { duration?: number; override?: ToastOverride | null }) {
    const { flash } = usePage<SharedData>().props;
    const [toast, setToast] = useState<ToastState | null>(null);

    useEffect(() => {
        const type: ToastType | null = flash?.success ? 'success' : flash?.error ? 'error' : flash?.info ? 'info' : null;

        if (!type) {
            return;
        }

        const message = (flash as Record<ToastType, string | undefined>)[type] as string;
        setToast({ key: Date.now(), type, message });

        const timer = setTimeout(() => setToast(null), duration);

        return () => clearTimeout(timer);
    }, [flash?.success, flash?.error, flash?.info, duration]);

    useEffect(() => {
        if (!override) {
            return;
        }

        setToast({ key: override.nonce, type: override.type, message: override.message });

        const timer = setTimeout(() => setToast(null), duration);

        return () => clearTimeout(timer);
    }, [override, duration]);

    if (!toast) {
        return null;
    }

    const { icon: Icon, className } = styles[toast.type];

    return (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4 sm:justify-end sm:pr-6">
            <div
                key={toast.key}
                role="status"
                className={`animate-in fade-in slide-in-from-top-2 pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${className}`}
            >
                <Icon className="mt-0.5 size-5 shrink-0" />
                <p className="flex-1 font-medium">{toast.message}</p>
                <button
                    type="button"
                    onClick={() => setToast(null)}
                    className="shrink-0 rounded-md p-0.5 opacity-70 transition-opacity hover:opacity-100"
                    aria-label="Tutup"
                >
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}
