"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Download, PieChart as PieChartIcon, RefreshCcw } from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Table from "@/components/ui/Table";
import { getOrders, getPaymentsDailyReport, listInventoryPurchaseRequests, type PaymentsDailyReport } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import type { Order } from "@/types/orders";

type StatusChartRow = {
    status: string;
    count: number;
};

type MethodChartRow = {
    method: string;
    count: number;
    total: number;
};

type OrderReportRow = {
    id: string;
    order_number: string;
    status: string;
    total_amount: number;
    created_at: string;
};

const METHOD_COLORS = ["#22d3ee", "#818cf8", "#f59e0b", "#ef4444", "#10b981"];

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

function getStatusVariant(status: string): "warning" | "success" | "danger" | "neutral" {
    const normalized = status.toLowerCase();
    if (normalized === "completed" || normalized === "ready") {
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

function createZeroReport(date: string): PaymentsDailyReport {
    return {
        date,
        total_payments: 0,
        total_collected: 0,
        by_method: []
    };
}

export default function ManagerReportsPage() {
    const router = useRouter();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );
    const isAuthorized = useMemo(() => hydrated && requireRole("manager"), [hydrated]);

    const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
    const [orders, setOrders] = useState<Order[]>([]);
    const [dailyReport, setDailyReport] = useState<PaymentsDailyReport | null>(null);
    const [pendingPurchasesCount, setPendingPurchasesCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (hydrated && !isAuthorized) {
            router.replace("/login");
        }
    }, [hydrated, isAuthorized, router]);

    const loadReports = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [ordersData, reportData, pendingPurchases] = await Promise.all([
                getOrders(),
                getPaymentsDailyReport(selectedDate).catch(() => createZeroReport(selectedDate)),
                listInventoryPurchaseRequests({ status: "pending" })
            ]);

            setOrders(ordersData);
            setDailyReport(reportData);
            setPendingPurchasesCount(pendingPurchases.length);
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : "Failed to load reports.";
            setError(message);
            setOrders([]);
            setDailyReport(createZeroReport(selectedDate));
            setPendingPurchasesCount(0);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        if (!isAuthorized) {
            return;
        }

        void loadReports();
    }, [isAuthorized, loadReports]);

    const ordersForDate = useMemo(() => {
        return orders.filter((entry) => entry.created_at.startsWith(selectedDate));
    }, [orders, selectedDate]);

    const statusRows = useMemo<StatusChartRow[]>(() => {
        const statusCounts = new Map<string, number>();
        for (const order of ordersForDate) {
            const key = order.status.toLowerCase();
            statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);
        }

        return [...statusCounts.entries()].map(([status, count]) => ({ status, count }));
    }, [ordersForDate]);

    const methodRows = useMemo<MethodChartRow[]>(() => {
        return (dailyReport?.by_method ?? []).map((entry) => ({
            method: entry.method.toUpperCase(),
            count: entry.count,
            total: entry.total
        }));
    }, [dailyReport]);

    const tableRows = useMemo<OrderReportRow[]>(() => {
        return [...ordersForDate]
            .sort((a, b) => b.total_amount - a.total_amount)
            .slice(0, 10)
            .map((entry) => ({
                id: entry.id,
                order_number: entry.order_number,
                status: entry.status,
                total_amount: entry.total_amount,
                created_at: entry.created_at
            }));
    }, [ordersForDate]);

    const handleExportSummary = () => {
        const payload = {
            date: selectedDate,
            total_orders: ordersForDate.length,
            total_collected: dailyReport?.total_collected ?? 0,
            total_payments: dailyReport?.total_payments ?? 0,
            pending_purchases: pendingPurchasesCount,
            by_method: methodRows,
            status_breakdown: statusRows
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `manager-report-${selectedDate}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

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
                            <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">Reports</h1>
                            <p className="mt-1 text-sm text-slate-400">Daily order, payment, and procurement performance.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                            <Input label="Report Date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                            <Button variant="secondary" loading={loading} onClick={() => void loadReports()}>
                                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                                Refresh
                            </Button>
                            <Button onClick={handleExportSummary}>
                                <Download className="h-4 w-4" aria-hidden="true" />
                                Export
                            </Button>
                        </div>
                    </div>
                </header>

                {error ? <p className="text-sm text-rose-300">{error}</p> : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Card title="Orders (Date)">
                        <p className="text-2xl font-semibold text-slate-100">{ordersForDate.length}</p>
                    </Card>
                    <Card title="Revenue (Date)">
                        <p className="text-2xl font-semibold text-slate-100">{formatCurrency(dailyReport?.total_collected ?? 0)}</p>
                    </Card>
                    <Card title="Payments (Date)">
                        <p className="text-2xl font-semibold text-slate-100">{dailyReport?.total_payments ?? 0}</p>
                    </Card>
                    <Card title="Pending Purchases">
                        <p className="text-2xl font-semibold text-slate-100">{pendingPurchasesCount}</p>
                    </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                    <Card title="Order Status Breakdown" description="Status counts for selected date.">
                        {statusRows.length === 0 ? (
                            <p className="text-sm text-slate-400">No order status data for selected date.</p>
                        ) : (
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={statusRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                                        <XAxis dataKey="status" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: "rgba(2, 6, 23, 0.94)",
                                                border: "1px solid rgba(129,140,248,0.25)",
                                                borderRadius: "14px",
                                                color: "#e2e8f0"
                                            }}
                                        />
                                        <Bar dataKey="count" fill="#818cf8" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </Card>

                    <Card title="Payment Method Mix" description="Distribution for selected date.">
                        {methodRows.length === 0 ? (
                            <p className="text-sm text-slate-400">No payment method data for selected date.</p>
                        ) : (
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Tooltip
                                            contentStyle={{
                                                background: "rgba(2, 6, 23, 0.94)",
                                                border: "1px solid rgba(34,211,238,0.25)",
                                                borderRadius: "14px",
                                                color: "#e2e8f0"
                                            }}
                                            formatter={(value) => [formatCurrency(Number(value ?? 0)), "Collected"]}
                                        />
                                        <Pie data={methodRows} dataKey="total" nameKey="method" outerRadius={110} innerRadius={60}>
                                            {methodRows.map((entry, index) => (
                                                <Cell key={`${entry.method}-${index}`} fill={METHOD_COLORS[index % METHOD_COLORS.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        <div className="mt-2 space-y-2">
                            {methodRows.map((entry, index) => (
                                <div key={entry.method} className="flex items-center justify-between text-sm text-slate-300">
                                    <span className="inline-flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: METHOD_COLORS[index % METHOD_COLORS.length] }} />
                                        {entry.method}
                                    </span>
                                    <span>{formatCurrency(entry.total)}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <Card title="Top Orders (Selected Date)" description="Highest value orders for quick manager review.">
                    <Table<OrderReportRow>
                        columns={[
                            { key: "order_number", header: "Order" },
                            {
                                key: "status",
                                header: "Status",
                                render: (value) => <Badge label={String(value ?? "-")} variant={getStatusVariant(String(value ?? ""))} />
                            },
                            { key: "total_amount", header: "Total", render: (value) => formatCurrency(Number(value ?? 0)) },
                            { key: "created_at", header: "Created", render: (value) => formatDate(String(value ?? "")) }
                        ]}
                        data={tableRows}
                        rowKey={(row) => row.id}
                        emptyState={loading ? "Loading report rows..." : "No orders found for selected date."}
                    />
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                        <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Orders and payment records are fetched from live backend endpoints.</span>
                        <PieChartIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}
