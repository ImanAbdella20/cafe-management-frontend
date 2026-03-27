"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getRoleFromToken } from "@/lib/auth";

const FALLBACK_DASHBOARD = "/dashboard/manager";

export default function DashboardIndexPage() {
    const router = useRouter();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        const token = localStorage.getItem("token") ?? sessionStorage.getItem("token");
        if (!token) {
            router.replace("/login");
            return;
        }

        const role = getRoleFromToken(token);
        if (!role) {
            router.replace(FALLBACK_DASHBOARD);
            return;
        }

        router.replace(`/dashboard/${role}`);
    }, [hydrated, router]);

    return <div className="min-h-screen bg-slate-950" aria-hidden="true" />;
}
