import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User | null;
    permissions: string[];
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    restaurant: {
        name: string;
        logo_url?: string | null;
        receipt_header?: string | null;
        receipt_footer?: string | null;
    };
    activeShift: { id: number; opened_at: string; opening_cash: string } | null;
    flash: { success?: string; error?: string; info?: string };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
