"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import { requireRole } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { DashboardRole } from "@/components/layout/Sidebar";
import AdminView from "@/components/dashboard/AdminView";
import OrdersWorkspace from "@/components/orders/OrdersWorkspace";

const allowedRoles: Array<DashboardRole> = ["admin", "manager", "cashier", "barista"];

function isDashboardRole(role: string): role is DashboardRole {
    return allowedRoles.includes(role as DashboardRole);
}

function getRoleView(role: DashboardRole) {
    switch (role) {
        case "admin":
            return <AdminView />;
        case "manager":
            return <OrdersWorkspace role="manager" />;
        case "cashier":
            return <OrdersWorkspace role="cashier" />;
        case "barista":
            return <OrdersWorkspace role="barista" />;
        default:
            return null;
    }
}

export default function RoleDashboardPage() {
    const router = useRouter();
    const params = useParams<{ role: string }>();
    const role = String(params.role ?? "").toLowerCase();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );

    const isKnownRole = useMemo(() => isDashboardRole(role), [role]);
    const isAuthorized = useMemo(() => hydrated && isKnownRole && requireRole(role), [hydrated, isKnownRole, role]);

    useEffect(() => {
        if (hydrated && !isAuthorized) {
            router.replace("/login");
        }
    }, [hydrated, isAuthorized, router]);

    if (!hydrated || !isAuthorized) {
        return <div className="min-h-screen bg-amber-50" aria-hidden="true" />;
    }

    const dashboardRole = role as DashboardRole;

    return <DashboardLayout role={dashboardRole}>{getRoleView(dashboardRole)}</DashboardLayout>;
}
