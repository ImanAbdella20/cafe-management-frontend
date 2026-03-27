"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, RefreshCcw, Sparkles, TrendingUp } from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Table from "@/components/ui/Table";
import { getOrders, getPaymentsDailyReport, type PaymentsDailyReport } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import type { Order } from "@/types/orders";

type DailyChartPoint = {
    date: string;
    revenue: number;
    payments: number;
};

type MethodAggregate = {
    method: string;
    total: number;
    count: number;
};

type ReportSnapshot = {
    revenue: number;
    totalPayments: number;
    avgTicket: number;
    completedOrders: number;
    topMethod: string;
};

const REPORT_DAYS = 7;

function toISODate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function toDisplayDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-ET", {
        style: "currency",
        currency: "ETB",
        minimumFractionDigits: 2
    }).format(value ?? 0);
}

function createZeroReport(date: Date): PaymentsDailyReport {
    return {
        date: toISODate(date),
        total_payments: 0,
        total_collected: 0,
        by_method: []
    };
}

function getLastNDays(days: number): Date[] {
    const values: Date[] = [];
    for (let index = days - 1; index >= 0; index -= 1) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - index);
        values.push(date);
    }
    return values;
}

export default function AdminReportsPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [dailyData, setDailyData] = useState<DailyChartPoint[]>([]);
    const [methodData, setMethodData] = useState<MethodAggregate[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [lastUpdated, setLastUpdated] = useState("");

    useEffect(() => {
        if (!requireRole("admin")) {
            router.push("/login");
            return;
        }

        setIsAuthorized(true);
    }, [router]);

    const loadReports = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const targetDates = getLastNDays(REPORT_DAYS);
            const [ordersData, reportData] = await Promise.all([
                getOrders(),
                Promise.all(
                    targetDates.map(async (dateValue) => {
                        const isoDate = toISODate(dateValue);
                        try {
                            return await getPaymentsDailyReport(isoDate);
                        } catch {
                            return createZeroReport(dateValue);
                        }
                    })
                )
            ]);

            const chartPoints: DailyChartPoint[] = reportData.map((report) => ({
                date: toDisplayDate(report.date),
                revenue: report.total_collected,
                payments: report.total_payments
            }));

            const methodTotals = new Map<string, MethodAggregate>();
            for (const report of reportData) {
                for (const entry of report.by_method) {
                    const key = entry.method.toLowerCase();
                    const current = methodTotals.get(key) ?? {
                        method: key.toUpperCase(),
                        total: 0,
                        count: 0
                    };
                    current.total += entry.total;
                    current.count += entry.count;
                    methodTotals.set(key, current);
                }
            }

            setOrders(ordersData);
            setDailyData(chartPoints);
            setMethodData([...methodTotals.values()].sort((a, b) => b.total - a.total));
            setLastUpdated(
                new Date().toLocaleTimeString("en-ET", {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            );
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : "Failed to load reports.";
            setError(message);
            setDailyData([]);
            setMethodData([]);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthorized) {
            return;
        }

        void loadReports();

        const intervalId = window.setInterval(() => {
            void loadReports();
        }, 60000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [isAuthorized, loadReports]);

    const snapshot = useMemo<ReportSnapshot>(() => {
        const revenue = dailyData.reduce((sum, row) => sum + row.revenue, 0);
        const totalPayments = dailyData.reduce((sum, row) => sum + row.payments, 0);
        const avgTicket = totalPayments > 0 ? revenue / totalPayments : 0;
        const completedOrders = orders.filter((entry) => entry.status === "completed").length;
        const topMethod = methodData[0]?.method ?? "-";

        return {
            revenue,
            totalPayments,
            avgTicket,
            completedOrders,
            topMethod
        };
    }, [dailyData, methodData, orders]);

    const recentCompletedOrders = useMemo(() => {
        return [...orders]
            .filter((entry) => entry.status === "completed")
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 8)
            .map((entry) => ({
                order_number: entry.order_number,
                status: entry.status,
                total_amount: entry.total_amount,
                updated_at: entry.updated_at
            }));
    }, [orders]);

    if (!isAuthorized) {
        return <div className="min-h-screen bg-slate-950" aria-hidden="true" />;
    }

    return (
        <DashboardLayout role="admin">
            <div className="space-y-6">
                <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.95)]">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 h-52 bg-radial-[circle_at_top] from-cyan-500/20 to-transparent" />
                    <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Insights</p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">Reports & Analytics</h1>
                            <p className="mt-1 text-sm text-slate-400">Revenue, payment mix, and operational trends sourced from live backend data.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => void loadReports()} loading={loading}>Refresh</Button>
                        </div>
                    </div>
                </header>

                {error ? (
                    <p className="text-sm text-rose-300">{error}</p>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Card title="Revenue (7 days)">
                        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-300/20 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-200">
                            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                            Growth
                        </div>
                        <p className="text-2xl font-semibold text-slate-100">{formatCurrency(snapshot.revenue)}</p>
                    </Card>
                    <Card title="Payments Processed">
                        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">
                            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                            Volume
                        </div>
                        <p className="text-2xl font-semibold text-slate-100">{snapshot.totalPayments.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-slate-400">Completed orders: {snapshot.completedOrders.toLocaleString()}</p>
                    </Card>
                    <Card title="Average Ticket">
                        <p className="text-2xl font-semibold text-slate-100">{formatCurrency(snapshot.avgTicket)}</p>
                    </Card>
                    <Card title="Top Method">
                        <p className="text-2xl font-semibold text-slate-100">{snapshot.topMethod}</p>
                    </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
                    <Card title="Daily Revenue Trend" description="Last 7 days of collected revenue.">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="reportsRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.6} />
                                            <stop offset="100%" stopColor="#818cf8" stopOpacity={0.04} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                                        tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: "rgba(2, 6, 23, 0.94)",
                                            border: "1px solid rgba(129,140,248,0.25)",
                                            borderRadius: "14px",
                                            color: "#e2e8f0"
                                        }}
                                        formatter={(value) => [formatCurrency(Number(value ?? 0)), "Revenue"]}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#818cf8" fill="url(#reportsRevenueGradient)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card title="Payment Method Mix" description="Total collected by payment channel.">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={methodData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                                    <XAxis dataKey="method" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{
                                            background: "rgba(2, 6, 23, 0.94)",
                                            border: "1px solid rgba(34,211,238,0.25)",
                                            borderRadius: "14px",
                                            color: "#e2e8f0"
                                        }}
                                        formatter={(value) => [formatCurrency(Number(value ?? 0)), "Collected"]}
                                    />
                                    <Bar dataKey="total" fill="#22d3ee" radius={[10, 10, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                <Card
                    title="Recent Completed Orders"
                    description="Latest completed orders for quick financial review."
                    footer={
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            {loading ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
                            {lastUpdated ? `Last synced at ${lastUpdated}` : "Waiting for first sync"}
                        </div>
                    }
                >
                    <Table
                        columns={[
                            { key: "order_number", header: "Order" },
                            {
                                key: "status",
                                header: "Status",
                                render: (value) => <Badge label={String(value ?? "-")} variant="success" />
                            },
                            {
                                key: "total_amount",
                                header: "Amount",
                                render: (value) => formatCurrency(Number(value ?? 0))
                            },
                            {
                                key: "updated_at",
                                header: "Completed At",
                                render: (value) => new Date(String(value ?? "")).toLocaleString()
                            }
                        ]}
                        data={recentCompletedOrders as Array<Record<string, unknown>>}
                        rowKey={(row) => `${row.order_number}`}
                        emptyState={loading ? "Loading completed orders..." : "No completed orders available in current dataset."}
                    />
                </Card>
            </div>
        </DashboardLayout>
    );
}
