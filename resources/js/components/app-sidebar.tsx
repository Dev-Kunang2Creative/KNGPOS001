import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BarChart3, ChefHat, ClipboardList, FileText, LayoutDashboard, MapPinned, MenuSquare, ScrollText, Settings, Table2, Timer, Users, Utensils } from 'lucide-react';
import AppLogo from './app-logo';

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const permissions = new Set(auth.permissions ?? []);
    const role = auth.user?.role;

    const candidates: (NavItem & { permission?: string; roles?: string[] })[] = [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
        { title: 'POS', url: '/pos', icon: Utensils, permission: 'pos.view' },
        { title: 'Kitchen', url: '/kitchen', icon: ChefHat, permission: 'kitchen.view' },
        { title: 'Bar', url: '/bar', icon: BarChart3, permission: 'bar.view' },
        { title: 'Orders', url: '/orders', icon: ClipboardList, permission: 'waiter.view' },
        { title: 'Zones', url: '/zones', icon: MapPinned, permission: 'zones.manage' },
        { title: 'Menu', url: '/menu', icon: MenuSquare, permission: 'menu.view' },
        { title: 'Reports', url: '/reports/kasir', icon: FileText, permission: 'reports.view' },
        { title: 'Users', url: '/users', icon: Users, permission: 'users.view' },
        { title: 'Audit Logs', url: '/audit-logs', icon: ScrollText, permission: 'audit.view' },
        { title: 'Tables', url: '/settings/tables', icon: Table2, permission: 'settings.view' },
        { title: 'Shifts', url: '/shifts', icon: Timer, permission: 'shift.view' },
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
