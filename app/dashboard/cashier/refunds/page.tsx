"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Search, ShieldAlert } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Table from "@/components/ui/Table";
import { getPayments, refundPayment, type Payment } from "@/lib/api";
import { requireRole } from "@/lib/auth";

type RefundRow = {
    id: number;
    order_id: string;
    amount: number;
    method: string;
    status: string;
    reference: string;
    paid_at: string;
};

type ToastState = {
    type: "success" | "error";
    message: string;
} | null;

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

export default function CashierRefundsPage() {
    const router = useRouter();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );
    const isAuthorized = useMemo(() => hydrated && requireRole("cashier"), [hydrated]);

    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [busyId, setBusyId] = useState<number | null>(null);
    const [toast, setToast] = useState<ToastState>(null);
    const [error, setError] = useState("");

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

    const loadPayments = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await getPayments();
            setPayments(data);
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : "Failed to load payments for refund review.";
            setError(message);
            setPayments([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthorized) {
            return;
        }

        void loadPayments();
    }, [isAuthorized, loadPayments]);

    const rows = useMemo<RefundRow[]>(() => {
        return payments
            .map((entry) => ({
                id: entry.id,
                order_id: entry.order_id,
                amount: entry.amount,
                method: entry.payment_method,
                status: entry.status,
                reference: entry.transaction_reference,
                paid_at: entry.paid_at || entry.created_at
            }))
            .filter((entry) => {
                if (statusFilter !== "all" && entry.status.toLowerCase() !== statusFilter) {
                    return false;
                }

                if (!search.trim()) {
                    return true;
                }

                const term = search.trim().toLowerCase();
                return (
                    entry.order_id.toLowerCase().includes(term) ||
                    entry.reference.toLowerCase().includes(term) ||
                    entry.method.toLowerCase().includes(term)
                );
            })
            .sort((left, right) => new Date(right.paid_at).getTime() - new Date(left.paid_at).getTime());
    }, [payments, search, statusFilter]);

    const summary = useMemo(() => {
        const paidCount = payments.filter((entry) => entry.status.toLowerCase() === "paid").length;
        const refundedCount = payments.filter((entry) => entry.status.toLowerCase() === "refunded").length;
        const paidTotal = payments
            .filter((entry) => entry.status.toLowerCase() === "paid")
            .reduce((sum, entry) => sum + entry.amount, 0);

        return {
            paidCount,
            refundedCount,
            paidTotal
        };
    }, [payments]);

    async function handleRefund(paymentId: number, orderId: string) {
        const confirmed = window.confirm(`Issue refund for order ${orderId}?`);
        if (!confirmed) {
            return;
        }

        setBusyId(paymentId);
        try {
            await refundPayment(paymentId);
            setToast({ type: "success", message: `Refund requested for order ${orderId}.` });
            await loadPayments();
        } catch (refundError) {
            const message = refundError instanceof Error ? refundError.message : "Failed to issue refund.";
            setToast({ type: "error", message });
        } finally {
            setBusyId(null);
        }
    }

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
                            <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">Refunds</h1>
                            <p className="mt-1 text-sm text-slate-400">Review payment history and process refunds with confirmation safeguards.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => void loadPayments()} loading={loading}>
                                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </header>

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

                {error ? <p className="text-sm text-rose-300">{error}</p> : null}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Card title="Refundable Payments">
                        <p className="text-2xl font-semibold text-slate-100">{summary.paidCount}</p>
                        <p className="mt-1 text-xs text-slate-400">status = paid</p>
                    </Card>
                    <Card title="Already Refunded">
                        <p className="text-2xl font-semibold text-slate-100">{summary.refundedCount}</p>
                        <p className="mt-1 text-xs text-slate-400">status = refunded</p>
                    </Card>
                    <Card title="Paid Value">
                        <p className="text-xl font-semibold text-slate-100">{formatCurrency(summary.paidTotal)}</p>
                        <p className="mt-1 text-xs text-slate-400">current paid volume</p>
                    </Card>
                </div>

                <Card title="Refund Queue" description="Find transactions by order or reference before issuing refund.">
                    <div className="mb-4 grid gap-3 md:grid-cols-3">
                        <Input
                            label="Search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Order ID or reference"
                        />
                        <label className="space-y-1.5 text-sm font-medium text-slate-300">
                            <span>Status</span>
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                            >
                                <option value="all">All</option>
                                <option value="paid">Paid</option>
                                <option value="refunded">Refunded</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                            </select>
                        </label>
                        <div className="flex items-end">
                            <Button variant="secondary" fullWidth onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                                <Search className="h-4 w-4" aria-hidden="true" />
                                Clear Filters
                            </Button>
                        </div>
                    </div>

                    <Table<RefundRow>
                        columns={[
                            { key: "order_id", header: "Order" },
                            {
                                key: "amount",
                                header: "Amount",
                                render: (value) => formatCurrency(Number(value ?? 0))
                            },
                            {
                                key: "method",
                                header: "Method",
                                render: (value) => String(value ?? "-").toUpperCase()
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
                            },
                            {
                                key: "id",
                                header: "Action",
                                render: (value, row) => (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        disabled={row.status.toLowerCase() !== "paid" || busyId === row.id}
                                        loading={busyId === row.id}
                                        onClick={() => void handleRefund(Number(value), row.order_id)}
                                    >
                                        Refund
                                    </Button>
                                )
                            }
                        ]}
                        data={rows}
                        rowKey={(row) => String(row.id)}
                        emptyState={loading ? "Loading refund queue..." : "No matching transactions found."}
                    />

                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                        <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Only paid transactions are refundable from this workspace.</span>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}
