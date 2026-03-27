"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Activity, ClipboardList, CreditCard, RefreshCcw, TrendingUp, Users } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import { fetchUsers, getOrders, getPaymentsDailyReport, listInventoryPurchaseRequests, type PaymentsDailyReport, type StaffUser } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import type { InventoryPurchaseRequest } from "@/types/inventory";
import type { Order } from "@/types/orders";

type QueueRow = {
    id: string;
    order_number: string;
    status: string;
    total_amount: number;
    updated_at: string;
};

type ToastState = {
    type: "success" | "error";
    message: string;
} | null;

const IN_PROGRESS_STATUSES: Array<Order["status"]> = ["pending", "preparing", "ready"];

function toISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-ET", {
        style: "currency",
        currency: "ETB",
        minimumFractionDigits: 2
    }).format(value ?? 0);
}

function formatDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    return parsed.toLocaleString();
}

function getOrderStatusBadge(status: string): "warning" | "success" | "danger" | "neutral" {
    const normalized = status.trim().toLowerCase();
    if (normalized === "ready") {
        return "success";
    }
    if (normalized === "pending" || normalized === "preparing") {
        return "warning";
    }
    if (normalized === "cancelled") {
        return "danger";
    }
    return "neutral";
}

function createZeroReport(): PaymentsDailyReport {
    return {
        date: toISODate(new Date()),
        total_payments: 0,
        total_collected: 0,
        by_method: []
    };
}

async function fetchAllUsers(): Promise<StaffUser[]> {
    const users: StaffUser[] = [];
    const pageSize = 100;
    let page = 1;
    let total = Number.POSITIVE_INFINITY;

    while (users.length < total && page <= 30) {
        const response = await fetchUsers({ page, limit: pageSize });
        users.push(...response.data);
        total = response.pagination.total;

        if (response.data.length < pageSize) {
            break;
        }

        page += 1;
    }

    return users;
}

export default function ManagerOverviewPage() {
    const router = useRouter();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );
    const isAuthorized = useMemo(() => hydrated && requireRole("manager"), [hydrated]);

    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState("");
    const [toast, setToast] = useState<ToastState>(null);
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [purchaseRequests, setPurchaseRequests] = useState<InventoryPurchaseRequest[]>([]);
    const [todayReport, setTodayReport] = useState<PaymentsDailyReport>(createZeroReport);

    useEffect(() => {
        if (hydrated && !isAuthorized) {
            router.replace("/login");
        }
    }, [hydrated, isAuthorized, router]);

    useEffect(() => {
        if (!toast) {
            return;
        }

        const timeoutId = window.setTimeout(() => setToast(null), 3000);
        return () => window.clearTimeout(timeoutId);
    }, [toast]);

    const loadOverview = useCallback(async () => {
        setLoading(true);
        try {
            const [usersData, ordersData, purchasesData, reportData] = await Promise.all([
                fetchAllUsers(),
                getOrders(),
                listInventoryPurchaseRequests({ status: "pending" }),
                getPaymentsDailyReport().catch(() => createZeroReport())
            ]);

            setUsers(usersData);
            setOrders(ordersData);
            setPurchaseRequests(purchasesData);
            setTodayReport(reportData);
            setLastUpdated(
                new Date().toLocaleTimeString("en-ET", {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load manager overview.";
            setToast({ type: "error", message });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthorized) {
            return;
        }

        void loadOverview();

        const refreshId = window.setInterval(() => {
            void loadOverview();
        }, 60000);

        return () => {
            window.clearInterval(refreshId);
        };
    }, [isAuthorized, loadOverview]);

    const teamMembers = useMemo(() => {
        return users.filter((entry) => entry.role !== "admin");
    }, [users]);

    const activeTeam = useMemo(() => {
        return teamMembers.filter((entry) => entry.is_active);
    }, [teamMembers]);

    const openOrders = useMemo(() => {
        return orders.filter((entry) => IN_PROGRESS_STATUSES.includes(entry.status));
    }, [orders]);

    const readyOrders = useMemo(() => {
        return orders.filter((entry) => entry.status === "ready").length;
    }, [orders]);

    const queueRows = useMemo<QueueRow[]>(() => {
        return [...openOrders]
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 8)
            .map((entry) => ({
                id: entry.id,
                order_number: entry.order_number,
                status: entry.status,
                total_amount: entry.total_amount,
                updated_at: entry.updated_at
            }));
    }, [openOrders]);

    const roleCoverage = useMemo(() => {
        const roles: Array<StaffUser["role"]> = ["manager", "cashier", "barista", "staff"];
        return roles.map((role) => ({
            role,
            active: activeTeam.filter((entry) => entry.role === role).length,
            total: teamMembers.filter((entry) => entry.role === role).length
        }));
    }, [activeTeam, teamMembers]);

    if (!hydrated || !isAuthorized) {
        return <div className="min-h-screen bg-slate-950" aria-hidden="true" />;
    }

    return (
        <DashboardLayout role="manager">
            <div className="space-y-6">
                <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.95)]">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 h-52 bg-radial-[circle_at_top] from-cyan-500/20 to-transparent" />
                    <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Manager Hub</p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">Operations Overview</h1>
                            <p className="mt-1 text-sm text-slate-400">Live pulse of team, queue pressure, purchases, and revenue.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" loading={loading} onClick={() => void loadOverview()}>
                                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                                Refresh
                            </Button>
                            <Button variant="secondary" onClick={() => router.push("/dashboard/manager/teams")}>Teams</Button>
                            <Button variant="secondary" onClick={() => router.push("/dashboard/manager/reports")}>Reports</Button>
                            <Button variant="secondary" onClick={() => router.push("/dashboard/manager/settings")}>Settings</Button>
                        </div>
                    </div>
                </header>

                {toast ? (
                    <div
                        className={`fixed right-4 top-20 z-60 rounded-xl border px-4 py-3 text-sm font-medium ${toast.type === "success"
                            ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-100"
                            : "border-rose-300/30 bg-rose-500/15 text-rose-100"
                            }`}
                        role="status"
                        aria-live="polite"
                    >
                        {toast.message}
                    </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card title="Active Team">
                        <div className="inline-flex items-center gap-2 text-indigo-200">
                            <Users className="h-4 w-4" aria-hidden="true" />
                            <span className="text-2xl font-semibold text-slate-100">{activeTeam.length}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">out of {teamMembers.length} non-admin users</p>
                    </Card>
                    <Card title="Open Orders">
                        <div className="inline-flex items-center gap-2 text-cyan-200">
                            <Activity className="h-4 w-4" aria-hidden="true" />
                            <span className="text-2xl font-semibold text-slate-100">{openOrders.length}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{readyOrders} orders ready for handoff</p>
                    </Card>
                    <Card title="Pending Purchases">
                        <div className="inline-flex items-center gap-2 text-amber-200">
                            <ClipboardList className="h-4 w-4" aria-hidden="true" />
                            <span className="text-2xl font-semibold text-slate-100">{purchaseRequests.length}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">requires approval or follow-up</p>
                    </Card>
                    <Card title="Revenue Today">
                        <div className="inline-flex items-center gap-2 text-emerald-200">
                            <TrendingUp className="h-4 w-4" aria-hidden="true" />
                            <span className="text-xl font-semibold text-slate-100">{formatCurrency(todayReport.total_collected)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{todayReport.total_payments} payments captured</p>
                    </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
                    <Card
                        title="Live Queue"
                        description="Current in-progress orders."
                        footer={<p className="text-xs text-slate-500">{lastUpdated ? `Last synced at ${lastUpdated}` : "Syncing..."}</p>}
                    >
                        <Table<QueueRow>
                            columns={[
                                { key: "order_number", header: "Order" },
                                {
                                    key: "status",
                                    header: "Status",
                                    render: (value) => <Badge label={String(value ?? "-")} variant={getOrderStatusBadge(String(value ?? ""))} />
                                },
                                { key: "total_amount", header: "Total", render: (value) => formatCurrency(Number(value ?? 0)) },
                                { key: "updated_at", header: "Updated", render: (value) => formatDate(String(value ?? "")) }
                            ]}
                            data={queueRows}
                            rowKey={(row) => row.id}
                            emptyState={loading ? "Loading queue..." : "No active orders in queue."}
                        />
                    </Card>

                    <Card title="Coverage By Role" description="Real-time staffing visibility for shift decisions.">
                        <div className="space-y-3">
                            {roleCoverage.map((entry) => (
                                <div key={entry.role} className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
                                    <div className="flex items-center justify-between text-sm text-slate-300">
                                        <span className="capitalize">{entry.role}</span>
                                        <Badge
                                            label={`${entry.active}/${entry.total} active`}
                                            variant={entry.active === 0 ? "danger" : entry.active < entry.total ? "warning" : "success"}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 grid gap-2">
                            <Button variant="secondary" onClick={() => router.push("/dashboard/manager/teams")}>Manage Team</Button>
                            <Button variant="secondary" onClick={() => router.push("/dashboard/manager/orders")}>Open Orders Workspace</Button>
                            <Button variant="secondary" onClick={() => router.push("/dashboard/manager/inventory")}>Open Inventory Workspace</Button>
                            <Button onClick={() => router.push("/dashboard/payments")}>Open Payments</Button>
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
