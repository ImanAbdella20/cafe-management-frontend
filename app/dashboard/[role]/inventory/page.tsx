"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import InventoryWorkspace from "@/components/inventory/InventoryWorkspace";
import type { DashboardRole } from "@/components/layout/Sidebar";
import { requireRole } from "@/lib/auth";
import type { InventoryActorRole } from "@/types/inventory";

const allowedRoles: Array<DashboardRole> = ["admin", "manager", "cashier", "barista"];

function isDashboardRole(role: string): role is DashboardRole {
    return allowedRoles.includes(role as DashboardRole);
}

export default function RoleInventoryPage() {
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
        return <div className="min-h-screen bg-slate-950" aria-hidden="true" />;
    }

    const dashboardRole = role as DashboardRole;
    const actorRole = role as InventoryActorRole;

    return (
        <DashboardLayout role={dashboardRole}>
            <InventoryWorkspace role={actorRole} />
        </DashboardLayout>
    );
}
