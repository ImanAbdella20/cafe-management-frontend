"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StaffManagementSection from "@/components/staff/StaffManagementSection";
import { requireRole } from "@/lib/auth";

export default function AdminManagementPage() {
    const router = useRouter();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );
    const isAuthorized = useMemo(() => hydrated && requireRole("admin"), [hydrated]);

    useEffect(() => {
        if (hydrated && !isAuthorized) {
            router.replace("/login");
        }
    }, [hydrated, isAuthorized, router]);

    if (!hydrated || !isAuthorized) {
        return <div className="min-h-screen bg-slate-950" aria-hidden="true" />;
    }

    return (
        <DashboardLayout role="admin">
            <StaffManagementSection />
        </DashboardLayout>
    );
}
