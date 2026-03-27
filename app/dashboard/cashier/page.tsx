"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Activity, CreditCard, DollarSign, ReceiptText, RefreshCcw } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import { getOrders, getPayments, getPaymentsDailyReport, type Payment, type PaymentsDailyReport } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import type { Order } from "@/types/orders";

type QueueRow = {
    id: string;
    order_number: string;
    status: string;
    total_amount: number;
    updated_at: string;
};

type CashierSnapshot = {
    openOrders: number;
    paidToday: number;
    totalCollectedToday: number;
    averageTicketToday: number;
};

const OPEN_ORDER_STATUSES: Array<Order["status"]> = ["pending", "preparing", "ready"];

function createZeroReport(): PaymentsDailyReport {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return {
        date: `${year}-${month}-${day}`,
        total_payments: 0,
        total_collected: 0,
        by_method: []
    };
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

function paymentStatusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
    const normalized = status.toLowerCase();
    if (normalized === "paid") {
        return "success";
    }
    if (normalized === "pending") {
        return "warning";
    }
    if (normalized === "failed") {
        return "danger";
    }
    return "neutral";
}

function orderStatusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
    const normalized = status.toLowerCase();
    if (normalized === "ready" || normalized === "completed") {
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

export default function CashierOverviewPage() {
    const router = useRouter();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );
    const isAuthorized = useMemo(() => hydrated && requireRole("cashier"), [hydrated]);

    const [orders, setOrders] = useState<Order[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [report, setReport] = useState<PaymentsDailyReport>(createZeroReport);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState("");

    useEffect(() => {
        if (hydrated && !isAuthorized) {
            router.replace("/login");
        }
    }, [hydrated, isAuthorized, router]);

    const loadOverview = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [ordersData, paymentsData, reportData] = await Promise.all([
                getOrders(),
                getPayments(),
                getPaymentsDailyReport().catch(() => createZeroReport())
            ]);

            setOrders(ordersData);
            setPayments(paymentsData);
            setReport(reportData);
            setLastUpdated(
                new Date().toLocaleTimeString("en-ET", {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            );
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : "Failed to load cashier overview.";
            setError(message);
            setOrders([]);
            setPayments([]);
            setReport(createZeroReport());
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

    const queueRows = useMemo<QueueRow[]>(() => {
        return [...orders]
            .filter((entry) => OPEN_ORDER_STATUSES.includes(entry.status))
            .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime())
            .slice(0, 8)
            .map((entry) => ({
                id: entry.id,
                order_number: entry.order_number,
                status: entry.status,
                total_amount: entry.total_amount,
                updated_at: entry.updated_at
            }));
    }, [orders]);

    const latestPayments = useMemo(() => {
        return [...payments]
            .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
            .slice(0, 6);
    }, [payments]);

    const snapshot = useMemo<CashierSnapshot>(() => {
        const openOrders = orders.filter((entry) => OPEN_ORDER_STATUSES.includes(entry.status)).length;
        const paidToday = report.total_payments;
        const totalCollectedToday = report.total_collected;
        const averageTicketToday = paidToday > 0 ? totalCollectedToday / paidToday : 0;

        return {
            openOrders,
            paidToday,
            totalCollectedToday,
            averageTicketToday
        };
    }, [orders, report]);

    if (!hydrated || !isAuthorized) {
        return <div className="min-h-screen bg-slate-950" aria-hidden="true" />;
    }

    return (
        <DashboardLayout role="cashier">
            <div className="space-y-6">
                <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.95)]">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 h-52 bg-radial-[circle_at_top] from-cyan-500/20 to-transparent" />
                    <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Cashier Hub</p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">POS Overview</h1>
                            <p className="mt-1 text-sm text-slate-400">Track your queue, payment pace, and checkout performance in real time.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" loading={loading} onClick={() => void loadOverview()}>
                                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                                Refresh
                            </Button>
                            <Button variant="secondary" onClick={() => router.push("/dashboard/cashier/sales")}>Sales</Button>
                            <Button variant="secondary" onClick={() => router.push("/dashboard/cashier/refunds")}>Refunds</Button>
                            <Button variant="secondary" onClick={() => router.push("/dashboard/cashier/settings")}>Settings</Button>
                        </div>
                    </div>
                </header>

                {error ? <p className="text-sm text-rose-300">{error}</p> : null}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card title="Open Orders">
                        <div className="inline-flex items-center gap-2 text-indigo-200">
                            <ReceiptText className="h-4 w-4" aria-hidden="true" />
                            <span className="text-2xl font-semibold text-slate-100">{snapshot.openOrders}</span>
                        </div>
                    </Card>
                    <Card title="Paid Today">
                        <div className="inline-flex items-center gap-2 text-cyan-200">
                            <CreditCard className="h-4 w-4" aria-hidden="true" />
                            <span className="text-2xl font-semibold text-slate-100">{snapshot.paidToday}</span>
                        </div>
                    </Card>
                    <Card title="Collected Today">
                        <div className="inline-flex items-center gap-2 text-emerald-200">
                            <DollarSign className="h-4 w-4" aria-hidden="true" />
                            <span className="text-xl font-semibold text-slate-100">{formatCurrency(snapshot.totalCollectedToday)}</span>
                        </div>
                    </Card>
                    <Card title="Average Ticket">
                        <div className="inline-flex items-center gap-2 text-amber-200">
                            <Activity className="h-4 w-4" aria-hidden="true" />
                            <span className="text-xl font-semibold text-slate-100">{formatCurrency(snapshot.averageTicketToday)}</span>
                        </div>
                    </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                    <Card
                        title="Live Queue"
                        description="Orders currently needing cashier attention."
                        footer={<p className="text-xs text-slate-500">{lastUpdated ? `Last synced at ${lastUpdated}` : "Syncing..."}</p>}
                    >
                        <Table<QueueRow>
                            columns={[
                                { key: "order_number", header: "Order" },
                                {
                                    key: "status",
                                    header: "Status",
                                    render: (value) => <Badge label={String(value ?? "-")} variant={orderStatusVariant(String(value ?? ""))} />
                                },
                                {
                                    key: "total_amount",
                                    header: "Total",
                                    render: (value) => formatCurrency(Number(value ?? 0))
                                },
                                {
                                    key: "updated_at",
                                    header: "Updated",
                                    render: (value) => formatDate(String(value ?? ""))
                                }
                            ]}
                            data={queueRows}
                            rowKey={(row) => row.id}
                            emptyState={loading ? "Loading queue..." : "No active queue items."}
                        />
                    </Card>

                    <Card title="Latest Payments" description="Most recent payment events.">
                        <div className="space-y-2">
                            {latestPayments.length === 0 ? (
                                <p className="text-sm text-slate-400">No payments found.</p>
                            ) : (
                                latestPayments.map((entry) => (
                                    <div key={entry.id} className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-medium text-slate-100">Order {entry.order_id}</p>
                                            <Badge label={entry.status} variant={paymentStatusVariant(entry.status)} />
                                        </div>
                                        <p className="mt-1 text-sm text-slate-300">{formatCurrency(entry.amount)} • {entry.payment_method.toUpperCase()}</p>
                                        <p className="mt-1 text-xs text-slate-500">{formatDate(entry.paid_at || entry.created_at)}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
