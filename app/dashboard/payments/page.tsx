"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Table from "@/components/ui/Table";
import { useAuth } from "@/context/AuthContext";
import { getRoleFromToken } from "@/lib/auth";
import {
    createPayment,
    getOrders,
    getPaymentById,
    getPayments,
    getPaymentsDailyReport,
    refundPayment,
    type Payment,
    type PaymentMethod,
    type PaymentsDailyReport
} from "@/lib/api";
import type { DashboardRole } from "@/components/layout/Sidebar";
import type { AppRole } from "@/types/menu";
import type { Order } from "@/types/orders";

type DrawerPayment = Payment | null;

type ToastState = {
    type: "success" | "error";
    message: string;
} | null;

type PaymentRow = Payment & {
    branch: string;
    cashier: string;
    tax: number;
};

type PayableOrderRow = Order & {
    paid_amount: number;
    due_amount: number;
};

type AdminFilters = {
    from: string;
    to: string;
    branch: string;
    method: string;
    status: string;
    cashier: string;
};

function isDashboardRole(role: AppRole): role is DashboardRole {
    return role === "admin" || role === "manager" || role === "cashier" || role === "barista" || role === "staff";
}

function canAccessPayments(role: AppRole) {
    return role === "admin" || role === "manager" || role === "cashier";
}

function toISODate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDate(value?: string) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}

function formatAmount(value: number) {
    return new Intl.NumberFormat("en-ET", {
        style: "currency",
        currency: "ETB",
        minimumFractionDigits: 2
    }).format(value ?? 0);
}

function getPaymentStatusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
    const normalized = status.trim().toLowerCase();
    if (normalized === "paid") {
        return "success";
    }
    if (normalized === "pending") {
        return "warning";
    }
    if (normalized === "failed" || normalized === "refunded") {
        return "danger";
    }
    return "neutral";
}

function getOrderStatusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
    const normalized = status.trim().toLowerCase();
    if (normalized === "completed") {
        return "success";
    }
    if (normalized === "ready" || normalized === "preparing") {
        return "warning";
    }
    if (normalized === "cancelled") {
        return "danger";
    }
    return "neutral";
}

function calculatePaidAmount(payments: Payment[]): number {
    return payments
        .filter((payment) => payment.status.trim().toLowerCase() === "paid")
        .reduce((sum, payment) => sum + (Number.isFinite(payment.amount) ? payment.amount : 0), 0);
}

export default function PaymentsPage() {
    const router = useRouter();
    const { role } = useAuth();
    const [hydrated, setHydrated] = useState(false);

    const [orderId, setOrderId] = useState("");
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [dailyReport, setDailyReport] = useState<PaymentsDailyReport | null>(null);
    const [open, setOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<DrawerPayment>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [toast, setToast] = useState<ToastState>(null);
    const [adminFilters, setAdminFilters] = useState<AdminFilters>({
        from: "",
        to: "",
        branch: "all",
        method: "all",
        status: "all",
        cashier: "all"
    });
    const [quickOrderId, setQuickOrderId] = useState("");
    const [quickAmount, setQuickAmount] = useState("");
    const [quickMethod, setQuickMethod] = useState<PaymentMethod>("cash");
    const [quickActionLoading, setQuickActionLoading] = useState(false);
    const [payableOrders, setPayableOrders] = useState<PayableOrderRow[]>([]);
    const [payableLoading, setPayableLoading] = useState(false);
    const [overviewLoading, setOverviewLoading] = useState(false);

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

        return getRoleFromToken(token) as AppRole;
    }, [role]);

    const dashboardRole: DashboardRole = useMemo(() => {
        if (isDashboardRole(effectiveRole)) {
            return effectiveRole;
        }
        return "staff";
    }, [effectiveRole]);

    useEffect(() => {
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        if (!canAccessPayments(effectiveRole)) {
            router.replace("/login");
        }
    }, [effectiveRole, hydrated, router]);

    useEffect(() => {
        if (!toast) {
            return;
        }

        const timeout = window.setTimeout(() => setToast(null), 3000);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    useEffect(() => {
        if (!canAccessPayments(effectiveRole)) {
            return;
        }

        const loadReport = async () => {
            setReportLoading(true);
            try {
                const report = await getPaymentsDailyReport(toISODate(new Date()));
                setDailyReport(report);
            } catch {
                setDailyReport(null);
            } finally {
                setReportLoading(false);
            }
        };

        void loadReport();
    }, [effectiveRole]);

    useEffect(() => {
        if (!canAccessPayments(effectiveRole)) {
            return;
        }

        void loadPayableOrders();
    }, [effectiveRole]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const storedOrderId = localStorage.getItem("payments:lastOrderId")?.trim() ?? "";
        if (storedOrderId) {
            setOrderId(storedOrderId);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const trimmed = orderId.trim();
        if (trimmed) {
            localStorage.setItem("payments:lastOrderId", trimmed);
            return;
        }

        localStorage.removeItem("payments:lastOrderId");
    }, [orderId]);

    const loadPaymentsForOrder = async (targetOrderID: string, showSuccessToast = true): Promise<boolean> => {
        const normalizedOrderID = targetOrderID.trim();
        setErrorMessage("");

        if (!normalizedOrderID) {
            setErrorMessage("Order ID is required to load payments.");
            setPayments([]);
            return false;
        }

        setLoading(true);
        try {
            const data = await getPayments(normalizedOrderID);
            setPayments(data);
            setOrderId(normalizedOrderID);
            if (showSuccessToast) {
                setToast({ type: "success", message: "Payments loaded successfully." });
            }
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load payments.";
            setErrorMessage(message);
            setToast({ type: "error", message });
            setPayments([]);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const loadPayments = async () => {
        await loadPaymentsForOrder(orderId, true);
    };

    const loadPayableOrders = async () => {
        setPayableLoading(true);
        setOverviewLoading(true);
        try {
            const allPayments = await getPayments();
            const sortedPayments = [...allPayments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setPayments(sortedPayments);

            const paymentsByOrder = new Map<string, Payment[]>();
            for (const payment of allPayments) {
                const key = String(payment.order_id ?? "").trim();
                if (!key) {
                    continue;
                }

                const existing = paymentsByOrder.get(key) ?? [];
                existing.push(payment);
                paymentsByOrder.set(key, existing);
            }

            try {
                const allOrders = await getOrders();
                const recentPayableCandidates = allOrders
                    .filter((order) => order.status !== "cancelled" && order.total_amount > 0)
                    .slice(0, 25);

                const rows = await Promise.all(
                    recentPayableCandidates.map(async (order) => {
                        const orderPayments = paymentsByOrder.get(order.id) ?? [];
                        const paidAmount = calculatePaidAmount(orderPayments);

                        return {
                            ...order,
                            paid_amount: paidAmount,
                            due_amount: Math.max(order.total_amount - paidAmount, 0)
                        } satisfies PayableOrderRow;
                    })
                );

                const outstandingOrders = rows
                    .filter((order) => order.due_amount > 0.0001)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                setPayableOrders(outstandingOrders);
            } catch (orderError) {
                const message = orderError instanceof Error ? orderError.message : "Failed to load orders awaiting payment.";
                setToast({ type: "error", message });
                setPayableOrders([]);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load payments.";
            setToast({ type: "error", message });
            setPayments([]);
        } finally {
            setPayableLoading(false);
            setOverviewLoading(false);
        }
    };

    const handleSelectPayableOrder = (order: PayableOrderRow) => {
        setOrderId(order.id);
        setQuickOrderId(order.id);
        setQuickAmount(order.due_amount.toFixed(2));
        setErrorMessage("");
    };

    const handleQuickPayment = async (status: "paid" | "pending") => {
        const order = quickOrderId.trim() || orderId.trim();
        const selectedOrder = payableOrders.find((entry) => entry.id === order);
        const fallbackAmount = selectedOrder?.due_amount;
        const amount = quickAmount.trim() ? Number(quickAmount) : Number(fallbackAmount);

        if (!order) {
            setToast({ type: "error", message: "Select an order from the payment list or enter an Order ID." });
            return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            setToast({ type: "error", message: "Amount must be greater than zero." });
            return;
        }
        if (selectedOrder && amount - selectedOrder.due_amount > 0.0001) {
            setToast({ type: "error", message: `Amount exceeds outstanding due (${formatAmount(selectedOrder.due_amount)}).` });
            return;
        }

        if (!quickAmount.trim()) {
            setQuickAmount(amount.toFixed(2));
        }

        setQuickActionLoading(true);
        try {
            await createPayment({
                order_id: order,
                amount,
                method: quickMethod,
                status
            });

            if (orderId.trim() !== order) {
                setOrderId(order);
            }

            await loadPaymentsForOrder(order, false);
            await loadPayableOrders();

            setToast({
                type: "success",
                message: status === "paid" ? "Payment completed successfully." : "Payment marked as pending."
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create payment.";
            setToast({ type: "error", message });
        } finally {
            setQuickActionLoading(false);
        }
    };

    const handleRefund = async (paymentId: number, reason: "refund" | "request") => {
        try {
            await refundPayment(paymentId);
            setToast({
                type: "success",
                message: reason === "request" ? "Refund request sent." : "Payment refunded successfully."
            });
            if (orderId.trim()) {
                await loadPaymentsForOrder(orderId, false);
            }
            await loadPayableOrders();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Refund failed.";
            setToast({ type: "error", message });
        }
    };

    const paymentRows = useMemo<PaymentRow[]>(() => {
        return payments.map((payment) => ({
            ...payment,
            branch: "Main Branch",
            cashier: "Cashier",
            tax: payment.amount * 0.15
        }));
    }, [payments]);

    const filteredAdminRows = useMemo(() => {
        return paymentRows.filter((row) => {
            const createdAt = new Date(row.created_at);

            if (adminFilters.from) {
                const from = new Date(`${adminFilters.from}T00:00:00`);
                if (!Number.isNaN(from.getTime()) && createdAt < from) {
                    return false;
                }
            }

            if (adminFilters.to) {
                const to = new Date(`${adminFilters.to}T23:59:59`);
                if (!Number.isNaN(to.getTime()) && createdAt > to) {
                    return false;
                }
            }

            if (adminFilters.branch !== "all" && row.branch !== adminFilters.branch) {
                return false;
            }
            if (adminFilters.method !== "all" && row.payment_method !== adminFilters.method) {
                return false;
            }
            if (adminFilters.status !== "all" && row.status !== adminFilters.status) {
                return false;
            }
            if (adminFilters.cashier !== "all" && row.cashier !== adminFilters.cashier) {
                return false;
            }

            return true;
        });
    }, [adminFilters, paymentRows]);

    const cashierRows = useMemo(() => {
        return [...paymentRows]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 20);
    }, [paymentRows]);

    const monthSales = useMemo(() => {
        const now = new Date();
        return paymentRows
            .filter((row) => {
                const created = new Date(row.created_at);
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear() && row.status === "paid";
            })
            .reduce((sum, row) => sum + row.amount, 0);
    }, [paymentRows]);

    const refundCount = useMemo(() => paymentRows.filter((row) => row.status === "refunded").length, [paymentRows]);
    const pendingCount = useMemo(() => paymentRows.filter((row) => row.status === "pending").length, [paymentRows]);

    const exportCsv = () => {
        const rows = (effectiveRole === "admin" ? filteredAdminRows : paymentRows).map((row) => [
            row.id,
            row.order_id,
            row.branch,
            row.amount,
            row.tax,
            row.payment_method,
            row.status,
            row.cashier,
            row.created_at
        ]);

        const header = ["payment_id", "order_id", "branch", "amount", "tax", "payment_method", "status", "cashier", "date"];
        const csv = [header, ...rows].map((line) => line.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `payments-${toISODate(new Date())}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const exportFinancialReport = () => {
        const reportBlob = new Blob([JSON.stringify(dailyReport ?? {}, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(reportBlob);
        link.download = `financial-report-${toISODate(new Date())}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const canCashierRefundSelectedPayment = useMemo(() => {
        if (!selectedPayment || effectiveRole !== "cashier") {
            return false;
        }

        const paymentDate = new Date(selectedPayment.created_at);
        const now = new Date();

        return (
            paymentDate.getFullYear() === now.getFullYear() &&
            paymentDate.getMonth() === now.getMonth() &&
            paymentDate.getDate() === now.getDate()
        );
    }, [effectiveRole, selectedPayment]);

    const openDrawer = async (id: string, paymentOrderID?: string) => {
        const fallbackOrderID = payments.find((entry) => String(entry.id) === id.trim())?.order_id ?? "";
        const targetOrderID = paymentOrderID?.trim() || orderId.trim() || fallbackOrderID;

        if (!targetOrderID) {
            setToast({ type: "error", message: "Unable to determine the order for this payment." });
            return;
        }

        try {
            const data = await getPaymentById(id, targetOrderID);
            setSelectedPayment(data);
            setOpen(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to fetch payment details.";
            setToast({ type: "error", message });
        }
    };

    if (!hydrated || !canAccessPayments(effectiveRole)) {
        return <div className="min-h-screen bg-slate-950" aria-hidden="true" />;
    }

    return (
        <DashboardLayout role={dashboardRole}>
            <div className="space-y-6">
                <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.95)]">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 h-52 bg-radial-[circle_at_top] from-cyan-500/20 to-transparent" />
                    <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Finance</p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">Payment Management</h1>
                            <p className="mt-1 text-sm text-slate-400">
                                {effectiveRole === "admin"
                                    ? "Financial control center with filters, refund controls, and exports."
                                    : effectiveRole === "manager"
                                        ? "Branch payment monitoring and operational payment visibility."
                                        : "Fast transaction execution with recent payments and quick actions."}
                            </p>
                        </div>
                        <div className="w-full sm:w-auto">
                            <label htmlFor="orderId" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                                Order ID
                            </label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <input
                                    id="orderId"
                                    value={orderId}
                                    onChange={(event) => setOrderId(event.target.value)}
                                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                                    className="h-10 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25 sm:w-[320px]"
                                />
                                <Button onClick={loadPayments} loading={loading}>
                                    Load Payments
                                </Button>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                {effectiveRole === "cashier"
                                    ? "Payments are fetched live from the backend for the selected order."
                                    : "Recent payments are auto-loaded. Use Order ID to drill into a specific order."}
                            </p>
                        </div>
                    </div>
                </header>

                <Card
                    title="Orders To Be Paid"
                    description="Pick an order to auto-fill payment details. Outstanding amount is calculated from order total minus paid transactions."
                >
                    <Table
                        columns={[
                            { key: "order_number", header: "Order #" },
                            { key: "status", header: "Status", render: (value) => <Badge label={String(value ?? "-")} variant={getOrderStatusVariant(String(value ?? ""))} /> },
                            { key: "total_amount", header: "Total", render: (value) => formatAmount(Number(value ?? 0)) },
                            { key: "paid_amount", header: "Paid", render: (value) => formatAmount(Number(value ?? 0)) },
                            { key: "due_amount", header: "Due", render: (value) => <span className="font-semibold text-amber-200">{formatAmount(Number(value ?? 0))}</span> },
                            { key: "created_at", header: "Created", render: (value) => formatDate(String(value ?? "")) },
                            {
                                key: "id",
                                header: "Actions",
                                className: "w-[280px]",
                                render: (_, row) => {
                                    const payableOrder = row as unknown as PayableOrderRow;
                                    return (
                                        <div className="flex flex-wrap gap-2">
                                            <Button size="sm" variant="secondary" onClick={() => handleSelectPayableOrder(payableOrder)}>
                                                Use For Payment
                                            </Button>
                                            <Button size="sm" onClick={() => {
                                                void loadPaymentsForOrder(payableOrder.id, false);
                                            }}>
                                                Load Payments
                                            </Button>
                                        </div>
                                    );
                                }
                            }
                        ]}
                        data={payableOrders as Array<Record<string, unknown>>}
                        rowKey={(row) => String(row.id)}
                        emptyState={payableLoading ? "Loading orders awaiting payment..." : "No outstanding orders found."}
                    />
                </Card>

                {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}

                {toast ? (
                    <div
                        className={`fixed right-4 top-20 z-40 rounded-xl border px-4 py-3 text-sm font-medium ${toast.type === "success"
                            ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-100"
                            : "border-rose-300/30 bg-rose-500/15 text-rose-100"
                            }`}
                        role="status"
                    >
                        {toast.message}
                    </div>
                ) : null}

                {effectiveRole === "admin" ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                            <Card title="Total Sales Today" className="border-indigo-400/25">
                                <p className="text-xl font-semibold text-slate-100">{reportLoading ? "..." : formatAmount(dailyReport?.total_collected ?? 0)}</p>
                            </Card>
                            <Card title="Total Sales This Month" className="border-indigo-400/25">
                                <p className="text-xl font-semibold text-slate-100">{formatAmount(monthSales)}</p>
                            </Card>
                            <Card title="Total Refunds" className="border-indigo-400/25">
                                <p className="text-xl font-semibold text-slate-100">{refundCount}</p>
                            </Card>
                            <Card title="Pending Payments" className="border-indigo-400/25">
                                <p className="text-xl font-semibold text-slate-100">{pendingCount}</p>
                            </Card>
                            <Card title="Revenue by Method" className="border-indigo-400/25">
                                <div className="space-y-1 text-xs text-slate-300">
                                    {(dailyReport?.by_method ?? []).length === 0 ? (
                                        <p>-</p>
                                    ) : (
                                        dailyReport?.by_method.map((method) => (
                                            <p key={method.method}>{method.method.toUpperCase()}: {formatAmount(method.total)}</p>
                                        ))
                                    )}
                                </div>
                            </Card>
                        </div>

                        <Card title="Filters" description="Filter by date range, branch, payment method, status, and cashier.">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                                <Input
                                    label="From"
                                    type="date"
                                    value={adminFilters.from}
                                    onChange={(event) => setAdminFilters((prev) => ({ ...prev, from: event.target.value }))}
                                />
                                <Input
                                    label="To"
                                    type="date"
                                    value={adminFilters.to}
                                    onChange={(event) => setAdminFilters((prev) => ({ ...prev, to: event.target.value }))}
                                />
                                <label className="space-y-1.5 text-sm font-medium text-slate-300">
                                    <span>Branch</span>
                                    <select
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                                        value={adminFilters.branch}
                                        onChange={(event) => setAdminFilters((prev) => ({ ...prev, branch: event.target.value }))}
                                    >
                                        <option value="all">All</option>
                                        <option value="Main Branch">Main Branch</option>
                                    </select>
                                </label>
                                <label className="space-y-1.5 text-sm font-medium text-slate-300">
                                    <span>Method</span>
                                    <select
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                                        value={adminFilters.method}
                                        onChange={(event) => setAdminFilters((prev) => ({ ...prev, method: event.target.value }))}
                                    >
                                        <option value="all">All</option>
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="mobile">Mobile</option>
                                    </select>
                                </label>
                                <label className="space-y-1.5 text-sm font-medium text-slate-300">
                                    <span>Status</span>
                                    <select
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                                        value={adminFilters.status}
                                        onChange={(event) => setAdminFilters((prev) => ({ ...prev, status: event.target.value }))}
                                    >
                                        <option value="all">All</option>
                                        <option value="paid">Paid</option>
                                        <option value="pending">Pending</option>
                                        <option value="failed">Failed</option>
                                        <option value="refunded">Refunded</option>
                                    </select>
                                </label>
                                <label className="space-y-1.5 text-sm font-medium text-slate-300">
                                    <span>Cashier</span>
                                    <select
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                                        value={adminFilters.cashier}
                                        onChange={(event) => setAdminFilters((prev) => ({ ...prev, cashier: event.target.value }))}
                                    >
                                        <option value="all">All</option>
                                        <option value="Cashier">Cashier</option>
                                    </select>
                                </label>
                            </div>
                        </Card>

                        <Card
                            title="Payments"
                            description="Full payments table for financial oversight and compliance checks."
                            footer={
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="secondary" size="sm" onClick={exportCsv}>Export CSV</Button>
                                    <Button variant="secondary" size="sm" onClick={() => window.print()}>Export PDF</Button>
                                    <Button variant="secondary" size="sm" onClick={exportFinancialReport}>Financial Report</Button>
                                </div>
                            }
                        >
                            <Table
                                columns={[
                                    { key: "id", header: "Payment ID" },
                                    { key: "order_id", header: "Order ID" },
                                    { key: "branch", header: "Branch" },
                                    { key: "amount", header: "Amount", render: (value) => formatAmount(Number(value ?? 0)) },
                                    { key: "tax", header: "Tax", render: (value) => formatAmount(Number(value ?? 0)) },
                                    { key: "payment_method", header: "Payment Method", render: (value) => String(value ?? "-").toUpperCase() },
                                    {
                                        key: "status",
                                        header: "Status",
                                        render: (value) => <Badge label={String(value ?? "-")} variant={getPaymentStatusVariant(String(value ?? ""))} />
                                    },
                                    { key: "cashier", header: "Cashier" },
                                    { key: "created_at", header: "Date", render: (value) => formatDate(String(value ?? "")) },
                                    {
                                        key: "id",
                                        header: "Actions",
                                        className: "w-[260px]",
                                        render: (value, row) => (
                                            <div className="flex flex-wrap gap-2">
                                                <Button size="sm" variant="secondary" onClick={() => openDrawer(String(value), String(row.order_id ?? ""))}>View</Button>
                                                <Button size="sm" onClick={() => handleRefund(Number(value), "refund")}>Refund</Button>
                                                <Button size="sm" variant="danger" onClick={() => setToast({ type: "error", message: `Void not available for payment ${row.id}.` })}>Void</Button>
                                            </div>
                                        )
                                    }
                                ]}
                                data={filteredAdminRows as Array<Record<string, unknown>>}
                                rowKey={(row) => String(row.id)}
                                emptyState={overviewLoading ? "Loading payments..." : "No payments found for current filters."}
                            />
                        </Card>
                    </>
                ) : null}

                {effectiveRole === "manager" ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card title="Today's Branch Revenue" className="border-indigo-400/25">
                                <p className="text-xl font-semibold text-slate-100">{reportLoading ? "..." : formatAmount(dailyReport?.total_collected ?? 0)}</p>
                            </Card>
                            <Card title="Payments by Method" className="border-indigo-400/25">
                                <p className="text-sm text-slate-300">{(dailyReport?.by_method ?? []).map((m) => `${m.method.toUpperCase()}: ${m.count}`).join(" • ") || "-"}</p>
                            </Card>
                            <Card title="Refund Count" className="border-indigo-400/25">
                                <p className="text-xl font-semibold text-slate-100">{refundCount}</p>
                            </Card>
                        </div>

                        <Card title="Branch Payments" description="Payments are branch-scoped to your current branch.">
                            <Table
                                columns={[
                                    { key: "id", header: "Payment ID" },
                                    { key: "order_id", header: "Order" },
                                    { key: "amount", header: "Amount", render: (value) => formatAmount(Number(value ?? 0)) },
                                    { key: "payment_method", header: "Method", render: (value) => String(value ?? "-").toUpperCase() },
                                    { key: "status", header: "Status", render: (value) => <Badge label={String(value ?? "-")} variant={getPaymentStatusVariant(String(value ?? ""))} /> },
                                    { key: "cashier", header: "Cashier" },
                                    { key: "created_at", header: "Time", render: (value) => formatDate(String(value ?? "")) },
                                    {
                                        key: "id",
                                        header: "Actions",
                                        className: "w-[220px]",
                                        render: (value, row) => (
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="secondary" onClick={() => openDrawer(String(value), String(row.order_id ?? ""))}>View</Button>
                                                <Button size="sm" onClick={() => handleRefund(Number(value), "request")}>Request Refund</Button>
                                            </div>
                                        )
                                    }
                                ]}
                                data={paymentRows as Array<Record<string, unknown>>}
                                rowKey={(row) => String(row.id)}
                                emptyState={overviewLoading ? "Loading branch payments..." : "No branch payments to display."}
                            />
                        </Card>
                    </>
                ) : null}

                {effectiveRole === "cashier" ? (
                    <>
                        <Card title="Quick Actions" description="Complete payment, mark as paid, select method, print receipt, and issue same-day refunds.">
                            <div className="grid gap-3 md:grid-cols-4">
                                <Input label="Order ID" value={quickOrderId} onChange={(event) => setQuickOrderId(event.target.value)} />
                                <Input label="Amount" type="number" min="0" step="0.01" value={quickAmount} onChange={(event) => setQuickAmount(event.target.value)} />
                                <label className="space-y-1.5 text-sm font-medium text-slate-300">
                                    <span>Payment Method</span>
                                    <select
                                        value={quickMethod}
                                        onChange={(event) => setQuickMethod(event.target.value as PaymentMethod)}
                                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="card">Card</option>
                                        <option value="mobile">Mobile</option>
                                    </select>
                                </label>
                                <div className="flex items-end gap-2">
                                    <Button loading={quickActionLoading} onClick={() => handleQuickPayment("paid")}>Complete Payment</Button>
                                    <Button loading={quickActionLoading} variant="secondary" onClick={() => handleQuickPayment("pending")}>Mark as Pending</Button>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-slate-500">Tip: use an order from the "Orders To Be Paid" list to auto-fill order ID and exact due amount.</p>
                        </Card>

                        <Card title="Recent Payments" description="Last 20 transactions for quick cashier processing.">
                            <Table
                                columns={[
                                    { key: "order_id", header: "Order ID" },
                                    { key: "amount", header: "Amount", render: (value) => formatAmount(Number(value ?? 0)) },
                                    { key: "payment_method", header: "Method", render: (value) => String(value ?? "-").toUpperCase() },
                                    { key: "status", header: "Status", render: (value) => <Badge label={String(value ?? "-")} variant={getPaymentStatusVariant(String(value ?? ""))} /> },
                                    { key: "created_at", header: "Time", render: (value) => formatDate(String(value ?? "")) },
                                    {
                                        key: "id",
                                        header: "Action",
                                        render: (value, row) => (
                                            <Button size="sm" variant="secondary" onClick={() => openDrawer(String(value), String(row.order_id ?? ""))}>
                                                View Payment
                                            </Button>
                                        )
                                    }
                                ]}
                                data={cashierRows as Array<Record<string, unknown>>}
                                rowKey={(row) => String(row.id)}
                                emptyState={loading ? "Loading recent payments..." : "No recent payments found."}
                            />
                        </Card>
                    </>
                ) : null}
            </div>

            <div
                className={`fixed inset-0 z-50 flex justify-end bg-black/30 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
                onClick={() => setOpen(false)}
                aria-hidden={!open}
            >
                <aside
                    className={`h-full w-full max-w-md transform border-l border-white/10 bg-slate-900 p-6 text-slate-200 shadow-2xl transition-transform duration-300 sm:w-105 ${open ? "translate-x-0" : "translate-x-full"}`}
                    onClick={(event) => event.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Payment details"
                >
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-100">Payment Details</h2>
                        <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
                            Close
                        </Button>
                    </div>

                    {selectedPayment ? (
                        <div className="space-y-3 text-sm text-slate-300">
                            <p>
                                <strong className="text-slate-100">Payment ID:</strong> {selectedPayment.id}
                            </p>
                            <p>
                                <strong className="text-slate-100">Order ID:</strong> {selectedPayment.order_id}
                            </p>
                            <p>
                                <strong className="text-slate-100">Amount:</strong> {formatAmount(selectedPayment.amount)}
                            </p>
                            <p>
                                <strong className="text-slate-100">Method:</strong> {selectedPayment.payment_method}
                            </p>
                            <p>
                                <strong className="text-slate-100">Status:</strong> {selectedPayment.status}
                            </p>
                            <p>
                                <strong className="text-slate-100">Cashier:</strong> -
                            </p>
                            <p>
                                <strong className="text-slate-100">Created At:</strong> {formatDate(selectedPayment.created_at)}
                            </p>

                            {effectiveRole === "admin" ? (
                                <>
                                    <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/55 p-3">
                                        <p className="font-medium text-slate-100">Full Order Breakdown</p>
                                        <p className="mt-1 text-xs text-slate-400">Order totals and items are not available in this endpoint.</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3">
                                        <p className="font-medium text-slate-100">Tax Breakdown</p>
                                        <p className="mt-1 text-xs text-slate-400">Estimated tax: {formatAmount(selectedPayment.amount * 0.15)}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3">
                                        <p className="font-medium text-slate-100">Receipt Preview</p>
                                        <p className="mt-1 text-xs text-slate-400">Receipt #{selectedPayment.id} for order {selectedPayment.order_id}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3">
                                        <p className="font-medium text-slate-100">Audit Log</p>
                                        <p className="mt-1 text-xs text-slate-400">Audit entries are not available in current API response.</p>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button onClick={() => handleRefund(selectedPayment.id, "refund")}>Refund</Button>
                                        <Button variant="secondary" onClick={() => window.print()}>Receipt Preview</Button>
                                    </div>
                                </>
                            ) : null}

                            {effectiveRole === "manager" ? (
                                <div className="flex gap-2 pt-2">
                                    <Button onClick={() => handleRefund(selectedPayment.id, "request")}>Request Refund</Button>
                                </div>
                            ) : null}

                            {effectiveRole === "cashier" ? (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    <Button variant="secondary" onClick={() => window.print()}>Print Receipt</Button>
                                    <Button
                                        onClick={() => handleRefund(selectedPayment.id, "refund")}
                                        disabled={!canCashierRefundSelectedPayment}
                                        title={canCashierRefundSelectedPayment ? "Issue same-day refund" : "Cashier refunds are allowed only for same-day payments"}
                                    >
                                        Refund
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400">No payment selected.</p>
                    )}
                </aside>
            </div>
        </DashboardLayout>
    );
}
