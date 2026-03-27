"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Activity,
    ArrowUpRight,
    CreditCard,
    RefreshCcw,
    Sparkles,
    TrendingUp,
    Users
} from "lucide-react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { fetchUsers, getOrders, getPaymentsDailyReport, type PaymentsDailyReport, type StaffUser } from "@/lib/api";
import type { Order } from "@/types/orders";

type RevenuePoint = {
    month: string;
    revenue: number;
    target: number;
};

type StatCard = {
    label: string;
    value: string;
    delta: string;
    helper: string;
    icon: typeof CreditCard;
    accent: string;
};

type OverviewData = {
    stats: StatCard[];
    revenueSeries: RevenuePoint[];
    events: Array<{ label: string; time: string }>;
    growthDelta: string;
    growthNarrative: string;
    footer: string[];
};

const IN_PROGRESS_STATUSES: Array<Order["status"]> = ["pending", "preparing", "ready"];

function getLocalISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function createZeroReport(date: Date): PaymentsDailyReport {
    return {
        date: getLocalISODate(date),
        total_payments: 0,
        total_collected: 0,
        by_method: []
    };
}

function formatMoney(value: number) {
    if (value < 1000) {
        return `ETB ${Math.round(value)}`;
    }
    return `ETB ${Math.round(value / 1000)}k`;
}

function formatCurrency(value: number): string {
    const compact = new Intl.NumberFormat("en-ET", {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(value);

    return `ETB ${compact}`;
}

function formatPct(value: number): string {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
}

function getChangeRate(current: number, previous: number): number {
    if (previous === 0) {
        return current === 0 ? 0 : 100;
    }
    return ((current - previous) / previous) * 100;
}

function getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthKeyByOffset(offset: number): string {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() + offset);
    return getMonthKey(date);
}

function getRelativeTime(dateValue: string): string {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return "recently";
    }

    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) {
        return "just now";
    }
    if (minutes < 60) {
        return `${minutes} mins ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function isSameDay(dateValue: string, compareDate: Date): boolean {
    const date = new Date(dateValue);
    return (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === compareDate.getFullYear() &&
        date.getMonth() === compareDate.getMonth() &&
        date.getDate() === compareDate.getDate()
    );
}

function countCreatedInLastDays(users: StaffUser[], days: number): number {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);

    return users.filter((user) => {
        const createdAt = new Date(user.created_at);
        return !Number.isNaN(createdAt.getTime()) && createdAt >= threshold;
    }).length;
}

function buildRevenueSeries(orders: Order[], monthSpan = 8): RevenuePoint[] {
    const series = Array.from({ length: monthSpan }, (_, idx) => {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - (monthSpan - 1 - idx));

        return {
            key: getMonthKey(date),
            month: date.toLocaleString("en-US", { month: "short" }),
            revenue: 0,
            target: 0
        };
    });

    const indexByKey = new Map(series.map((entry, index) => [entry.key, index]));
    for (const order of orders) {
        const createdAt = new Date(order.created_at);
        if (Number.isNaN(createdAt.getTime())) {
            continue;
        }

        const seriesIndex = indexByKey.get(getMonthKey(createdAt));
        if (seriesIndex === undefined) {
            continue;
        }

        series[seriesIndex].revenue += order.total_amount;
    }

    let previousRevenue = series[0]?.revenue ?? 0;
    for (const point of series) {
        point.target = Math.round(previousRevenue > 0 ? previousRevenue * 1.05 : point.revenue * 0.9);
        previousRevenue = point.revenue;
    }

    return series.map(({ month, revenue, target }) => ({ month, revenue, target }));
}

function buildOverview(users: StaffUser[], orders: Order[], todayReport: PaymentsDailyReport, yesterdayReport: PaymentsDailyReport): OverviewData {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const openOrders = orders.filter((order) => IN_PROGRESS_STATUSES.includes(order.status)).length;
    const openOrdersToday = orders.filter((order) => IN_PROGRESS_STATUSES.includes(order.status) && isSameDay(order.created_at, now)).length;
    const openOrdersYesterday = orders.filter((order) => IN_PROGRESS_STATUSES.includes(order.status) && isSameDay(order.created_at, yesterday)).length;
    const completedToday = orders.filter((order) => order.status === "completed" && isSameDay(order.created_at, now)).length;

    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.is_active).length;
    const thisMonthUsers = users.filter((user) => getMonthKey(new Date(user.created_at)) === getMonthKeyByOffset(0)).length;
    const prevMonthUsers = users.filter((user) => getMonthKey(new Date(user.created_at)) === getMonthKeyByOffset(-1)).length;
    const newUsersLast30Days = countCreatedInLastDays(users, 30);

    const revenueSeries = buildRevenueSeries(orders);
    const currentMonthRevenue = revenueSeries.at(-1)?.revenue ?? 0;
    const previousMonthRevenue = revenueSeries.at(-2)?.revenue ?? 0;
    const revenueGrowthRate = getChangeRate(currentMonthRevenue, previousMonthRevenue);
    const todayRevenueGrowthRate = getChangeRate(todayReport.total_collected, yesterdayReport.total_collected);

    const latestOrder = [...orders].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))[0];

    return {
        stats: [
            {
                label: "Revenue Today",
                value: formatCurrency(todayReport.total_collected),
                delta: formatPct(todayRevenueGrowthRate),
                helper: "vs yesterday",
                icon: CreditCard,
                accent: "from-indigo-500 to-violet-500"
            },
            {
                label: "Staff Accounts",
                value: totalUsers.toLocaleString(),
                delta: formatPct(getChangeRate(thisMonthUsers, prevMonthUsers)),
                helper: `${activeUsers} currently active`,
                icon: Users,
                accent: "from-violet-500 to-fuchsia-500"
            },
            {
                label: "Open Orders",
                value: openOrders.toLocaleString(),
                delta: formatPct(getChangeRate(openOrdersToday, openOrdersYesterday)),
                helper: `${completedToday} completed today`,
                icon: Activity,
                accent: "from-sky-500 to-indigo-500"
            }
        ],
        revenueSeries,
        growthDelta: formatPct(revenueGrowthRate),
        growthNarrative:
            revenueGrowthRate >= 0
                ? "Revenue is trending above the previous month."
                : "Revenue dipped from last month and may need attention.",
        events: [
            latestOrder
                ? {
                    label: `Order #${latestOrder.order_number} is currently ${latestOrder.status.replace("_", " ")}.`,
                    time: getRelativeTime(latestOrder.updated_at)
                }
                : {
                    label: "No recent order activity available yet.",
                    time: "today"
                },
            {
                label: `${todayReport.total_payments} payments processed today.`,
                time: "today"
            },
            {
                label: `${newUsersLast30Days} staff accounts were created in the last 30 days.`,
                time: "this month"
            }
        ],
        footer: [
            `Average payment value today is ${todayReport.total_payments > 0
                ? formatCurrency(todayReport.total_collected / todayReport.total_payments)
                : "ETB 0"
            }.`,
            `${openOrders} orders are currently active across the queue.`,
            `${activeUsers} of ${totalUsers} staff members are active right now.`
        ]
    };
}

async function fetchAllUsers(): Promise<StaffUser[]> {
    const users: StaffUser[] = [];
    const pageSize = 100;
    let page = 1;
    let total = Infinity;

    while (users.length < total && page <= 50) {
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

export default function AdminView() {
    const [overview, setOverview] = useState<OverviewData>(() =>
        buildOverview([], [], createZeroReport(new Date()), createZeroReport(new Date(Date.now() - 86400000)))
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string>("");

    useEffect(() => {
        let cancelled = false;

        const loadOverview = async () => {
            setLoading(true);
            setError(null);

            try {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                const [users, orders, todayReport, yesterdayReport] = await Promise.all([
                    fetchAllUsers(),
                    getOrders(),
                    getPaymentsDailyReport().catch(() => createZeroReport(new Date())),
                    getPaymentsDailyReport(getLocalISODate(yesterday)).catch(() => createZeroReport(yesterday))
                ]);

                if (cancelled) {
                    return;
                }

                setOverview(buildOverview(users, orders, todayReport, yesterdayReport));
                setLastUpdated(
                    new Date().toLocaleTimeString("en-ET", {
                        hour: "2-digit",
                        minute: "2-digit"
                    })
                );
            } catch (loadError) {
                if (cancelled) {
                    return;
                }
                const message = loadError instanceof Error ? loadError.message : "Failed to load overview metrics.";
                setError(message);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadOverview();

        const refreshId = window.setInterval(() => {
            void loadOverview();
        }, 60000);

        return () => {
            cancelled = true;
            window.clearInterval(refreshId);
        };
    }, []);

    return (
        <div className="space-y-6 pb-4">
            <section id="kpis" className="scroll-mt-20">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Overview</p>
                        <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">Business Performance</h1>
                        <p className="mt-1 text-sm text-slate-400">A live snapshot of growth, monetization, and daily operations from backend data.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-200">
                        {loading ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
                        {loading ? "Syncing with backend" : `Live backend data${lastUpdated ? ` • ${lastUpdated}` : ""}`}
                    </div>
                </div>

                {error ? (
                    <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        Failed to refresh overview: {error}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {overview.stats.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <motion.div
                                key={item.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.38, delay: index * 0.08 }}
                                whileHover={{ y: -3 }}
                            >
                                <Card className="border-white/10 bg-slate-900/70 shadow-[0_20px_50px_-35px_rgba(0,0,0,0.9)]">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardDescription className="text-slate-400">{item.label}</CardDescription>
                                            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br ${item.accent} text-white shadow-lg`}>
                                                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                                            </span>
                                        </div>
                                        <CardTitle className="text-3xl text-slate-100">{item.value}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-300">
                                                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                                                {item.delta}
                                            </span>
                                            <span className="text-slate-400">{item.helper}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            <section id="sales-reports" className="scroll-mt-20 grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
                <Card className="border-white/10 bg-slate-900/70 shadow-[0_30px_70px_-45px_rgba(79,70,229,0.45)]">
                    <CardHeader>
                        <CardDescription className="text-slate-400">Revenue Trend</CardDescription>
                        <CardTitle className="text-xl text-slate-100">Monthly Order Revenue vs Target</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={overview.revenueSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.6} />
                                            <stop offset="100%" stopColor="#818cf8" stopOpacity={0.05} />
                                        </linearGradient>
                                        <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.04} />
                                        </linearGradient>
                                    </defs>

                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                                        tickFormatter={formatMoney}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: "rgba(129,140,248,0.35)", strokeWidth: 1 }}
                                        contentStyle={{
                                            background: "rgba(2, 6, 23, 0.94)",
                                            border: "1px solid rgba(129,140,248,0.25)",
                                            borderRadius: "14px",
                                            color: "#e2e8f0"
                                        }}
                                        formatter={(value, name) => {
                                            const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                                            return [
                                                `ETB ${numericValue.toLocaleString()}`,
                                                name === "revenue" ? "Revenue" : "Target"
                                            ];
                                        }}
                                    />
                                    <Area type="monotone" dataKey="target" stroke="#22d3ee" fill="url(#targetGradient)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="revenue" stroke="#818cf8" fill="url(#revenueGradient)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card className="border-white/10 bg-slate-900/70">
                        <CardHeader>
                            <CardDescription className="text-slate-400">Growth Insight</CardDescription>
                            <CardTitle className="text-slate-100">Q3 Forecast</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-slate-300">
                            <p className="leading-6 text-slate-300">{overview.growthNarrative}</p>
                            <div className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-1 text-indigo-200">
                                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                                {overview.growthDelta} projected growth
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-slate-900/70">
                        <CardHeader>
                            <CardDescription className="text-slate-400">Recent Activity</CardDescription>
                            <CardTitle className="text-slate-100">What happened today</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {overview.events.map((event, index) => (
                                <motion.div
                                    key={event.label}
                                    initial={{ opacity: 0, x: 14 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.26, delay: index * 0.06 }}
                                    className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5"
                                >
                                    <p className="text-sm text-slate-200">{event.label}</p>
                                    <p className="mt-1 text-xs text-slate-400">{event.time}</p>
                                </motion.div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section id="settings" className="scroll-mt-20">
                <Card className="border-white/10 bg-slate-900/60">
                    <CardHeader>
                        <CardDescription className="text-slate-400">Overview Footer</CardDescription>
                        <CardTitle className="text-slate-100">Operational Health</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                        {overview.footer.map((insight) => (
                            <p key={insight} className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2">
                                {insight}
                            </p>
                        ))}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
