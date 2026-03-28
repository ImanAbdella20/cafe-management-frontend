"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
    Archive,
    BarChart3,
    BriefcaseBusiness,
    ChevronLeft,
    ChevronRight,
    Coffee,
    CreditCard,
    LayoutDashboard,
    LogOut,
    ReceiptText,
    Settings,
    ShoppingBag,
    UserCircle2,
    UsersRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/shadcn/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/shadcn/tooltip";


export type DashboardRole = "admin" | "manager" | "cashier" | "barista" | "staff";

export type MenuItem = {
    label: string;
    href: string;
    icon?: string;
    requiredPermission?: string;
};

type SidebarNavItem = {
    label: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
    requiredPermission?: string;
};

type SidebarProps = {
    role: DashboardRole;
    open: boolean;
    collapsed: boolean;
    onClose: () => void;
    onToggleCollapse: () => void;
    onLogout: () => void;
    userName?: string;
    permissions?: string[];
};

const roleDisplay: Record<DashboardRole, string> = {
    admin: "Admin",
    manager: "Manager",
    cashier: "Cashier",
    barista: "Barista",
    staff: "Staff"
};

const roleSettingsHrefMap: Partial<Record<DashboardRole, string>> = {
    admin: "/dashboard/admin/settings",
    manager: "/dashboard/manager/settings",
    cashier: "/dashboard/cashier/settings"
};

const roleNavMap: Record<DashboardRole, SidebarNavItem[]> = {
    admin: [
        { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
        { label: "Management", href: "/dashboard/admin/management", icon: UsersRound },
        { label: "Menu", href: "/dashboard/menu", icon: ShoppingBag },
        { label: "Inventory", href: "/dashboard/admin/inventory", icon: Archive },
        { label: "Orders", href: "/dashboard/admin/orders", icon: ReceiptText, badge: "8" },
        { label: "Payments", href: "/dashboard/payments", icon: CreditCard, badge: "3" },
        { label: "Reports", href: "/dashboard/admin/reports", icon: BarChart3 },
        { label: "Settings", href: "/dashboard/admin/settings", icon: Settings }
    ],
    manager: [
        { label: "Overview", href: "/dashboard/manager", icon: LayoutDashboard },
        { label: "Menu", href: "/dashboard/menu", icon: ShoppingBag },
        { label: "Inventory", href: "/dashboard/manager/inventory", icon: Archive },
        { label: "Teams", href: "/dashboard/manager/teams", icon: UsersRound },
        { label: "Orders", href: "/dashboard/manager/orders", icon: ReceiptText, badge: "5" },
        { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
        { label: "Reports", href: "/dashboard/manager/reports", icon: BarChart3 },
        { label: "Settings", href: "/dashboard/manager/settings", icon: Settings }
    ],
    cashier: [
        { label: "POS", href: "/dashboard/cashier", icon: BriefcaseBusiness },
        { label: "Orders", href: "/dashboard/cashier/orders", icon: ReceiptText, badge: "11" },
        { label: "Payments", href: "/dashboard/payments", icon: CreditCard, badge: "2" },
        { label: "Recent Sales", href: "/dashboard/cashier/sales", icon: BarChart3 },
        { label: "Refunds", href: "/dashboard/cashier/refunds", icon: Settings },
        { label: "Settings", href: "/dashboard/cashier/settings", icon: Settings }
    ],
    barista: [
        { label: "Queue", href: "/dashboard/barista", icon: Coffee, badge: "7" },
        { label: "Orders", href: "/dashboard/barista/orders", icon: ReceiptText },
    ],
    staff: [
        { label: "Menu", href: "/dashboard/menu", icon: ShoppingBag },
        { label: "Orders", href: "/dashboard/staff/orders", icon: ReceiptText },
        { label: "Settings", href: "/dashboard/staff#settings", icon: Settings }
    ]
};

export function getMenuItemsByRole(role: DashboardRole): Array<MenuItem> {
    return (roleNavMap[role] ?? []).map((item) => ({
        label: item.label,
        href: item.href,
        icon: item.label,
        requiredPermission: item.requiredPermission
    }));
}

function hasPermission(requiredPermission: string | undefined, permissions: Array<string>) {
    if (!requiredPermission) {
        return true;
    }
    return permissions.includes(requiredPermission);
}

function isActive(pathname: string, currentHash: string, href: string) {
    const [basePath, hashFragment] = href.split("#");

    if (hashFragment) {
        return pathname === basePath && currentHash === `#${hashFragment}`;
    }

    const exactMatch = pathname === basePath;
    if (!exactMatch) {
        return pathname.startsWith(`${basePath}/`);
    }

    // Prevent base routes (e.g. Overview) from appearing active when a hash section is selected.
    return currentHash.length === 0;
}

export default function Sidebar({
    role,
    open,
    collapsed,
    onClose,
    onToggleCollapse,
    onLogout,
    userName = "Cafe User",
    permissions = []
}: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [currentHash, setCurrentHash] = useState("");

    useEffect(() => {
        const syncHash = () => {
            setCurrentHash(window.location.hash);
        };

        syncHash();
        window.addEventListener("hashchange", syncHash);

        return () => {
            window.removeEventListener("hashchange", syncHash);
        };
    }, [pathname]);

    const visibleItems = (roleNavMap[role] ?? []).filter((item) => hasPermission(item.requiredPermission, permissions));
    const settingsHref = roleSettingsHrefMap[role] ?? `/dashboard/${role}#settings`;
    const showLabels = !collapsed || open;
    const initials = userName.trim().charAt(0).toUpperCase() || "C";

    return (
        <TooltipProvider delayDuration={120}>
            <button
                type="button"
                aria-label="Close navigation overlay"
                onClick={onClose}
                className={cn(
                    "fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition-opacity md:hidden",
                    open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                )}
            />

            <motion.aside
                aria-label="Sidebar navigation"
                animate={{ width: collapsed && !open ? 80 : 260 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                    "fixed inset-y-0 left-0 z-50 h-screen border-r border-white/10 bg-slate-950/95 px-3 py-4 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl",
                    "transition-transform duration-300 md:translate-x-0",
                    open ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-full flex-col">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white shadow-lg shadow-cyan-500/20">
                            <Image
                                src="/Amidos-logo.png"
                                alt="Amidos logo"
                                width={44}
                                height={44}
                                className="h-10 w-10 object-contain"
                                priority
                            />
                        </div>

                        {showLabels ? (
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">AMIDOS</p>
                                <h1 className="truncate text-sm font-semibold text-slate-100">Cafe Cloud</h1>
                            </div>
                        ) : null}

                        <button
                            type="button"
                            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                            onClick={onToggleCollapse}
                            className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 md:inline-flex"
                        >
                            {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
                        </button>

                        <button
                            type="button"
                            aria-label="Close sidebar"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 md:hidden"
                        >
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>

                    <nav className="mt-7 flex-1 overflow-y-auto pr-1" aria-label="Main navigation">
                        {showLabels ? <p className="mb-2 px-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Navigation</p> : null}

                        <ul className="space-y-1.5">
                            {visibleItems.map((item) => {
                                const active = isActive(pathname, currentHash, item.href);
                                const Icon = item.icon;

                                const content = (
                                    <Link
                                        href={item.href}
                                        onClick={onClose}
                                        aria-current={active ? "page" : undefined}
                                        className={cn(
                                            "group relative flex items-center rounded-xl text-sm font-medium outline-none transition-all duration-200",
                                            "focus-visible:ring-2 focus-visible:ring-indigo-400/60",
                                            showLabels ? "h-11 px-3" : "h-11 justify-center px-0",
                                            active
                                                ? "text-indigo-200"
                                                : "text-slate-300 hover:bg-indigo-500/10 hover:text-white"
                                        )}
                                    >
                                        {active ? (
                                            <motion.span
                                                layoutId="sidebar-active-pill"
                                                className="absolute inset-0 rounded-xl bg-indigo-500/15 shadow-[inset_0_0_0_1px_rgba(129,140,248,0.4)]"
                                                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                                                aria-hidden="true"
                                            />
                                        ) : null}

                                        <span
                                            className={cn(
                                                "absolute left-0 top-2 h-7 w-1 rounded-r-full transition-all",
                                                active ? "bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.8)]" : "bg-transparent"
                                            )}
                                            aria-hidden="true"
                                        />

                                        <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-200 transition group-hover:bg-white/10">
                                            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                                        </span>

                                        {showLabels ? <span className="relative ml-3 truncate">{item.label}</span> : null}

                                        {item.badge ? (
                                            <span
                                                className={cn(
                                                    "relative ml-auto rounded-full border border-indigo-300/20 bg-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-100",
                                                    !showLabels && "absolute right-1 top-1 h-4 min-w-4 px-1 text-center"
                                                )}
                                            >
                                                {item.badge}
                                            </span>
                                        ) : null}
                                    </Link>
                                );

                                if (!showLabels) {
                                    return (
                                        <li key={item.href}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>{content}</TooltipTrigger>
                                                <TooltipContent side="right">{item.label}</TooltipContent>
                                            </Tooltip>
                                        </li>
                                    );
                                }

                                return <li key={item.href}>{content}</li>;
                            })}
                        </ul>
                    </nav>

                    <div className="mt-3 border-t border-white/10 pt-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="Open user menu"
                                    className={cn(
                                        "flex w-full items-center rounded-2xl border border-white/10 bg-white/5 p-2.5 text-left transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60",
                                        !showLabels && "justify-center"
                                    )}
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/25 text-sm font-semibold text-indigo-100">
                                        {initials}
                                    </div>
                                    {showLabels ? (
                                        <div className="ml-3 min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-100">{userName}</p>
                                            <p className="truncate text-xs text-slate-400">{roleDisplay[role]}</p>
                                        </div>
                                    ) : null}
                                </button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                side={showLabels ? "top" : "right"}
                                align={showLabels ? "start" : "end"}
                                className="w-56"
                            >
                                <DropdownMenuLabel>
                                    <p className="truncate text-sm font-semibold text-slate-100">{userName}</p>
                                    <p className="truncate text-[11px] text-slate-400">{roleDisplay[role]} account</p>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => router.push(`/dashboard/${role}#profile`)}>
                                    <UserCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => router.push(settingsHref)}>
                                    <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={onLogout} className="text-rose-300 focus:bg-rose-500/20 focus:text-rose-100">
                                    <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </motion.aside>
        </TooltipProvider>
    );
}
