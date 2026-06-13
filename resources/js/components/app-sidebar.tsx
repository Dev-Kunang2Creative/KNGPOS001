import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    Building2,
    Check,
    ChefHat,
    ChevronDown,
    ClipboardList,
    FileText,
    LayoutDashboard,
    MapPinned,
    MenuSquare,
    Plus,
    ScrollText,
    Settings,
    Timer,
    Users,
    Utensils,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AppLogo from './app-logo';

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { auth, restaurant, restaurants } = usePage<SharedData>().props;
    const permissions = new Set(auth.permissions ?? []);
    const role = auth.activeRole;

    const candidates: (NavItem & { permission?: string; roles?: string[] })[] = [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
        { title: 'POS', url: '/pos', icon: Utensils, permission: 'pos.view' },
        { title: 'Kitchen', url: '/kitchen', icon: ChefHat, permission: 'kitchen.view' },
        { title: 'Bar', url: '/bar', icon: BarChart3, permission: 'bar.view' },
        { title: 'Orders', url: '/orders', icon: ClipboardList, permission: 'waiter.view' },
        { title: 'Zona & Meja', url: '/zones', icon: MapPinned, permission: 'zones.manage' },
        { title: 'Menu', url: '/menu', icon: MenuSquare, permission: 'menu.view' },
        { title: 'Reports', url: '/reports/kasir', icon: FileText, permission: 'reports.view' },
        { title: 'Users', url: '/users', icon: Users, permission: 'users.view' },
        { title: 'Audit Logs', url: '/audit-logs', icon: ScrollText, permission: 'audit.view' },
        { title: 'Shifts', url: '/shifts', icon: Timer, permission: 'shift.view' },
        { title: 'Restoran', url: '/restaurant/edit', icon: Building2, permission: 'settings.view' },
        { title: 'Settings', url: '/settings/system', icon: Settings, permission: 'settings.view' },
    ];

    const mainNavItems = candidates.filter((item) => {
        if (item.roles && role && item.roles.includes(role)) {
            return true;
        }

        return item.permission ? permissions.has(item.permission) : true;
    });

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                {/* Restaurant Switcher */}
                {restaurant && <RestaurantSwitcherInline current={restaurant} restaurants={restaurants ?? []} />}
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

/**
 * Inline restaurant switcher for the sidebar header.
 * Shows current restaurant name with dropdown to switch.
 */
function RestaurantSwitcherInline({
    current,
    restaurants,
}: {
    current: { id: number; name: string; slug: string; logo_url?: string | null };
    restaurants: { id: number; name: string; slug: string; logo_path: string | null }[];
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSwitch = (restaurantId: number) => {
        setIsOpen(false);
        router.post(route('restaurants.switch', { restaurant: restaurantId }));
    };

    return (
        <div className="relative px-2" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="border-sidebar-border/50 bg-sidebar-accent/30 hover:bg-sidebar-accent/60 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors"
            >
                <Building2 className="text-sidebar-primary/70 h-4 w-4 shrink-0" />
                <span className="text-sidebar-foreground min-w-0 flex-1 truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
                    {current.name}
                </span>
                <ChevronDown
                    className={`text-sidebar-foreground/50 h-3.5 w-3.5 shrink-0 transition-transform group-data-[collapsible=icon]:hidden ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="border-sidebar-border bg-sidebar absolute top-full right-2 left-2 z-50 mt-1 overflow-hidden rounded-lg border shadow-lg">
                    {restaurants.length > 1 && (
                        <div className="max-h-48 overflow-y-auto p-1">
                            {restaurants.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => handleSwitch(r.id)}
                                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                        r.id === current.id
                                            ? 'bg-sidebar-primary/10 text-sidebar-primary font-medium'
                                            : 'text-sidebar-foreground hover:bg-sidebar-accent'
                                    }`}
                                >
                                    <span className="min-w-0 flex-1 truncate">{r.name}</span>
                                    {r.id === current.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="border-sidebar-border border-t p-1">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                router.visit('/restaurants/create');
                            }}
                            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Tambah Restoran Baru
                        </button>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                router.visit('/restaurants/select');
                            }}
                            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors"
                        >
                            <Building2 className="h-3.5 w-3.5" />
                            Kelola Restoran
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
