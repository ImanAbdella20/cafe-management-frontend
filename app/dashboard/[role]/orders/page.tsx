"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import OrdersWorkspace from "@/components/orders/OrdersWorkspace";
import type { DashboardRole } from "@/components/layout/Sidebar";
import { requireRole } from "@/lib/auth";
import type { OrderRoleActor } from "@/types/orders";

const allowedRoles: Array<DashboardRole> = ["admin", "manager", "cashier", "barista"];

function isDashboardRole(role: string): role is DashboardRole {
    return allowedRoles.includes(role as DashboardRole);
}

export default function RoleOrdersPage() {
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
    const actorRole = role as OrderRoleActor;

    return (
        <DashboardLayout role={dashboardRole}>
            <OrdersWorkspace role={actorRole} />
        </DashboardLayout>
    );
}
