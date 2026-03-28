"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import type { DashboardRole } from "../../../components/layout/Sidebar";
import ItemsTable from "../../../components/menu/ItemsTable";
import { useAuth } from "../../../context/AuthContext";
import { getRoleFromToken } from "../../../lib/auth";
import { getCategories, getItems } from "../../../lib/api";
import type { AppRole, Category, MenuItemWithPrice } from "../../../types/menu";

type ToastState = {
    type: "success" | "error";
    message: string;
} | null;

function isDashboardRole(role: AppRole): role is DashboardRole {
    return role === "admin" || role === "manager" || role === "cashier" || role === "barista" || role === "staff";
}

export default function MenuManagementPage() {
    const { role } = useAuth();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );

    const [categories, setCategories] = useState<Category[]>([]);
    const [items, setItems] = useState<MenuItemWithPrice[]>([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [pageError, setPageError] = useState("");
    const [toast, setToast] = useState<ToastState>(null);

    const notify = useCallback((type: "success" | "error", message: string) => {
        setToast({ type, message });
    }, []);

    useEffect(() => {
        if (!toast) {
            return;
        }
        const timeout = window.setTimeout(() => setToast(null), 3000);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    const loadCategories = useCallback(async () => {
        try {
            const data = await getCategories();
            setCategories(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load categories.";
            setPageError(message);
            notify("error", message);
        }
    }, [notify]);

    const loadItems = useCallback(async () => {
        setItemsLoading(true);
        try {
            const data = await getItems();
            setItems(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load items.";
            setPageError(message);
            notify("error", message);
        } finally {
            setItemsLoading(false);
        }
    }, [notify]);

    const refreshAll = useCallback(async () => {
        setPageError("");
        await Promise.all([loadCategories(), loadItems()]);
    }, [loadCategories, loadItems]);

    useEffect(() => {
        void refreshAll();
    }, [refreshAll]);

    const effectiveRole: AppRole = useMemo(() => {
        if (isDashboardRole(role)) {
            return role;
        }

        if (typeof window === "undefined") {
            return "";
        }

        const token = localStorage.getItem("token")?.trim() ?? "";
        if (!token) {
            return "";
        }

        const tokenRole = getRoleFromToken(token) as AppRole;
        if (isDashboardRole(tokenRole)) {
            return tokenRole;
        }

        return "";
    }, [role]);

    const layoutRole: DashboardRole = useMemo(() => {
        if (isDashboardRole(effectiveRole)) {
            return effectiveRole;
        }
        return "staff";
    }, [effectiveRole]);

    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeItems = Array.isArray(items) ? items : [];

    if (!hydrated) {
        return <div className="min-h-screen bg-slate-950" aria-hidden="true" />;
    }

    return (
        <DashboardLayout role={layoutRole}>
            <div className="space-y-6">
                <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.95)]">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 h-52 bg-radial-[circle_at_top] from-cyan-500/20 to-transparent" />
                    <div className="relative space-y-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Catalog</p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">Menu Management</h1>
                            <p className="mt-1 text-sm text-slate-400">Manage menu items in a single streamlined workspace.</p>
                        </div>
                    </div>
                    {pageError ? <p className="relative mt-3 text-sm text-rose-300">{pageError}</p> : null}
                </header>

                {toast ? (
                    <div
                        className={`fixed right-4 top-20 z-60 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${toast.type === "success"
                            ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-100"
                            : "border-rose-300/30 bg-rose-500/15 text-rose-100"
                            }`}
                        role="status"
                        aria-live="polite"
                    >
                        {toast.message}
                    </div>
                ) : null}

                <ItemsTable
                    role={effectiveRole}
                    categories={safeCategories}
                    items={safeItems}
                    loading={itemsLoading}
                    onRefresh={refreshAll}
                    notify={notify}
                />


            </div>
        </DashboardLayout>
    );
}
