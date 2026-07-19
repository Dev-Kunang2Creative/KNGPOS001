import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Remove a leading "[Open Bill]" / "[Close Bill]" tag from an order note.
 * Kitchen & bar staff only care about the items, not the billing type.
 */
export function stripBillTag(notes?: string | null): string {
    return (notes ?? '').replace(/^\s*\[(open|close)\s*bill\]\s*/i, '').trim();
}

export type ChargeType = 'percentage' | 'nominal';

/**
 * Compute a tax / service charge amount. Percentage types apply to `base`;
 * nominal types are a flat Rp amount. Mirrors Restaurant::serviceChargeAmount/taxAmount.
 */
export function chargeAmount(active: boolean | undefined, type: ChargeType | undefined, value: number | string, base: number): number {
    if (!active) {
        return 0;
    }

    const v = Number(value) || 0;

    return type === 'nominal' ? v : base * (v / 100);
}

/** Human label for a charge line, e.g. "11%" or "Rp 5.000". */
export function chargeLabel(type: ChargeType | undefined, value: number | string): string {
    return type === 'nominal' ? `Rp ${Number(value || 0).toLocaleString('id-ID')}` : `${value}%`;
}
