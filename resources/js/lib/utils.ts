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
