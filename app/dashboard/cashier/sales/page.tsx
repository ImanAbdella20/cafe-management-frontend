"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, RefreshCcw, TrendingUp } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Table from "@/components/ui/Table";
import { getOrders, getPayments, getPaymentsDailyReport, type Payment, type PaymentsDailyReport } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import type { Order } from "@/types/orders";

type PaymentRow = {
    id: number;
    order_id: string;
    payment_method: string;
    amount: number;
    status: string;
    paid_at: string;
};

type MethodRow = {
    method: string;
    count: number;
    total: number;
    percent: number;
};

function toISODate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function createZeroReport(date: string): PaymentsDailyReport {
    return {
        date,
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

function statusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
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

export default function CashierSalesPage() {
    const router = useRouter();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );
    const isAuthorized = useMemo(() => hydrated && requireRole("cashier"), [hydrated]);

    const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
    const [orders, setOrders] = useState<Order[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [report, setReport] = useState<PaymentsDailyReport>(createZeroReport(toISODate(new Date())));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (hydrated && !isAuthorized) {
            router.replace("/login");
        }
    }, [hydrated, isAuthorized, router]);

    const loadSales = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [ordersData, paymentsData, reportData] = await Promise.all([
                getOrders(),
                getPayments(),
                getPaymentsDailyReport(selectedDate).catch(() => createZeroReport(selectedDate))
            ]);

            setOrders(ordersData);
            setPayments(paymentsData);
            setReport(reportData);
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : "Failed to load sales data.";
            setError(message);
            setOrders([]);
            setPayments([]);
            setReport(createZeroReport(selectedDate));
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        if (!isAuthorized) {
            return;
        }

        void loadSales();
    }, [isAuthorized, loadSales]);

    const ordersForDate = useMemo(() => {
        return orders.filter((entry) => entry.created_at.startsWith(selectedDate));
    }, [orders, selectedDate]);

    const paymentsForDate = useMemo<PaymentRow[]>(() => {
        return payments
            .filter((entry) => {
                const timestamp = entry.paid_at || entry.created_at;
                return timestamp.startsWith(selectedDate);
            })
            .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
            .map((entry) => ({
                id: entry.id,
                order_id: entry.order_id,
                payment_method: entry.payment_method,
                amount: entry.amount,
                status: entry.status,
                paid_at: entry.paid_at || entry.created_at
            }));
    }, [payments, selectedDate]);

    const methodRows = useMemo<MethodRow[]>(() => {
        const total = report.total_collected || 1;
        return report.by_method.map((entry) => ({
            method: entry.method.toUpperCase(),
            count: entry.count,
            total: entry.total,
            percent: Math.round((entry.total / total) * 100)
        }));
    }, [report]);

    const averageTicket = useMemo(() => {
        return report.total_payments > 0 ? report.total_collected / report.total_payments : 0;
    }, [report]);

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
                            <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">Recent Sales</h1>
                            <p className="mt-1 text-sm text-slate-400">Daily payment activity and channel mix for checkout monitoring.</p>
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                            <Input label="Date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                            <Button variant="secondary" loading={loading} onClick={() => void loadSales()}>
                                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </header>

                {error ? <p className="text-sm text-rose-300">{error}</p> : null}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card title="Orders (Date)">
                        <p className="text-2xl font-semibold text-slate-100">{ordersForDate.length}</p>
                    </Card>
                    <Card title="Payments (Date)">
                        <p className="text-2xl font-semibold text-slate-100">{report.total_payments}</p>
                    </Card>
                    <Card title="Collected (Date)">
                        <p className="text-xl font-semibold text-slate-100">{formatCurrency(report.total_collected)}</p>
                    </Card>
                    <Card title="Average Ticket">
                        <div className="inline-flex items-center gap-2 text-cyan-200">
                            <TrendingUp className="h-4 w-4" aria-hidden="true" />
                            <span className="text-xl font-semibold text-slate-100">{formatCurrency(averageTicket)}</span>
                        </div>
                    </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                    <Card title="Payment Timeline" description="Latest payment events for selected date.">
                        <Table<PaymentRow>
                            columns={[
                                { key: "order_id", header: "Order" },
                                {
                                    key: "payment_method",
                                    header: "Method",
                                    render: (value) => String(value ?? "-").toUpperCase()
                                },
                                {
                                    key: "amount",
                                    header: "Amount",
                                    render: (value) => formatCurrency(Number(value ?? 0))
                                },
                                {
                                    key: "status",
                                    header: "Status",
                                    render: (value) => <Badge label={String(value ?? "-")} variant={statusVariant(String(value ?? ""))} />
                                },
                                {
                                    key: "paid_at",
                                    header: "Paid At",
                                    render: (value) => formatDate(String(value ?? ""))
                                }
                            ]}
                            data={paymentsForDate}
                            rowKey={(row) => String(row.id)}
                            emptyState={loading ? "Loading sales..." : "No payments found for selected date."}
                        />
                    </Card>

                    <Card title="Method Breakdown" description="Revenue split by payment channel.">
                        <div className="space-y-3">
                            {methodRows.length === 0 ? (
                                <p className="text-sm text-slate-400">No method data for selected date.</p>
                            ) : (
                                methodRows.map((entry) => (
                                    <div key={entry.method} className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium text-slate-100">{entry.method}</span>
                                            <span className="text-slate-300">{formatCurrency(entry.total)}</span>
                                        </div>
                                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                                            <div className="h-full rounded-full bg-linear-to-r from-indigo-500 to-cyan-400" style={{ width: `${Math.max(8, entry.percent)}%` }} />
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">{entry.count} payments • {entry.percent}% share</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Use this view for end-of-shift reconciliation snapshots.</span>
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
