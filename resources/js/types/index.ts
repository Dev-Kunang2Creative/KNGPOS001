import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User | null;
    permissions: string[];
    activeRole: string | null;
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

export interface Restaurant {
    id: number;
    name: string;
    slug: string;
    logo_path: string | null;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    restaurant: {
        id: number;
        name: string;
        slug: string;
        logo_url?: string | null;
        receipt_header?: string | null;
        receipt_footer?: string | null;
    } | null;
    restaurants: Restaurant[];
    activeShift: { id: number; opened_at: string; opening_cash: string } | null;
    flash: { success?: string; error?: string; info?: string };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}
