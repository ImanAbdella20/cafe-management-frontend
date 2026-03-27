"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { getItems, getOrderApiForActor } from "@/lib/api";
import type { MenuItemWithPrice } from "@/types/menu";
import type { Order, OrderRoleActor, OrderStatus, OrderWithItems, OrderType } from "@/types/orders";

type ActiveTab = "overview" | "queue" | "create";

type DateFilter = "today" | "this_week" | "all";

type ToastState = {
    type: "success" | "error";
    message: string;
} | null;

type DraftOrderItem = {
    rowId: string;
    menuItemId: string;
    qty: string;
    notes: string;
};

type StatusAction = {
    label: string;
    nextStatus: OrderStatus;
};

const allStatuses: OrderStatus[] = ["pending", "preparing", "ready", "completed", "cancelled"];

const actorTabs: Record<OrderRoleActor, ActiveTab[]> = {
    admin: ["overview", "queue"],
    manager: ["overview", "queue"],
    cashier: ["overview", "queue", "create"],
    barista: ["queue", "overview"]
};

const tabLabelMap: Record<ActiveTab, string> = {
    overview: "Overview",
    queue: "Order Queue",
    create: "Create Order"
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-ET", {
        style: "currency",
        currency: "ETB",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }
    return date.toLocaleString();
}

function badgeVariantForStatus(status: OrderStatus): "neutral" | "warning" | "primary" | "success" | "danger" {
    switch (status) {
        case "pending":
            return "warning";
        case "preparing":
            return "primary";
        case "ready":
            return "neutral";
        case "completed":
            return "success";
        case "cancelled":
            return "danger";
        default:
            return "neutral";
    }
}

function getStatusActions(role: OrderRoleActor, status: OrderStatus): StatusAction[] {
    if (role === "barista") {
        if (status === "pending") {
            return [{ label: "Start Preparing", nextStatus: "preparing" }];
        }
        if (status === "preparing") {
            return [{ label: "Mark Ready", nextStatus: "ready" }];
        }
        return [];
    }

    if (role === "cashier") {
        if (status === "ready") {
            return [{ label: "Mark Completed", nextStatus: "completed" }];
        }
        return [];
    }

    if (role === "admin" || role === "manager") {
        if (status === "pending") {
            return [{ label: "Cancel Order", nextStatus: "cancelled" }];
        }
        if (status === "cancelled") {
            return [{ label: "Reopen Order", nextStatus: "pending" }];
        }
    }

    return [];
}

function getAllowedStatusOptions(role: OrderRoleActor, currentStatus: OrderStatus): OrderStatus[] {
    const allowedNextStatuses = getStatusActions(role, currentStatus).map((action) => action.nextStatus);
    return [currentStatus, ...allowedNextStatuses];
}

function createDraftOrderItem(rowId: string): DraftOrderItem {
    return {
        rowId,
        menuItemId: "",
        qty: "1",
        notes: ""
    };
}

export default function OrdersWorkspace({ role }: { role: OrderRoleActor }) {
    const orderApi = useMemo(() => getOrderApiForActor(role), [role]);

    const [activeTab, setActiveTab] = useState<ActiveTab>(() => actorTabs[role][0] ?? "overview");
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string>("");
    const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [performingAction, setPerformingAction] = useState(false);
    const [loadingMenuItems, setLoadingMenuItems] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItemWithPrice[]>([]);
    const [statusDrafts, setStatusDrafts] = useState<Record<string, OrderStatus>>({});

    const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
    const [dateFilter, setDateFilter] = useState<DateFilter>("today");
    const [searchTerm, setSearchTerm] = useState("");

    const [createOrderType, setCreateOrderType] = useState<OrderType>("dine_in");
    const [creatingOrder, setCreatingOrder] = useState(false);

    const [draftItems, setDraftItems] = useState<DraftOrderItem[]>([createDraftOrderItem("0")]);
    const [addingItem, setAddingItem] = useState(false);
    const draftRowIdRef = useRef(1);

    const [toast, setToast] = useState<ToastState>(null);

    const showToast = useCallback((type: "success" | "error", message: string) => {
        setToast({ type, message });
    }, []);

    useEffect(() => {
        if (!toast) {
            return;
        }
        const timeout = window.setTimeout(() => setToast(null), 3000);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    const loadOrders = useCallback(async () => {
        setLoadingOrders(true);
        try {
            const data = await orderApi.getOrders();
            setOrders(data);
            setStatusDrafts((previous) => {
                const next: Record<string, OrderStatus> = {};
                data.forEach((order) => {
                    next[order.id] = previous[order.id] ?? order.status;
                });
                return next;
            });

            if (!selectedOrderId && data.length > 0) {
                setSelectedOrderId(data[0].id);
            }

            if (data.length === 0) {
                setSelectedOrderId("");
                setSelectedOrder(null);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load orders.";
            showToast("error", message);
        } finally {
            setLoadingOrders(false);
        }
    }, [orderApi, selectedOrderId, showToast]);

    const loadOrderDetail = useCallback(
        async (orderId: string) => {
            if (!orderId) {
                setSelectedOrder(null);
                return;
            }

            setLoadingDetail(true);
            try {
                const data = await orderApi.getOrderById(orderId);
                setSelectedOrder(data);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to load order detail.";
                showToast("error", message);
                setSelectedOrder(null);
            } finally {
                setLoadingDetail(false);
            }
        },
        [orderApi, showToast]
    );

    const loadMenuItems = useCallback(async () => {
        if (!orderApi.addOrderItem) {
            return;
        }

        setLoadingMenuItems(true);
        try {
            const data = await getItems();
            setMenuItems(data.filter((item) => item.is_available));
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load menu items.";
            showToast("error", message);
        } finally {
            setLoadingMenuItems(false);
        }
    }, [orderApi.addOrderItem, showToast]);

    useEffect(() => {
        void loadOrders();
    }, [loadOrders]);

    useEffect(() => {
        void loadOrderDetail(selectedOrderId);
    }, [loadOrderDetail, selectedOrderId]);

    useEffect(() => {
        if (role === "cashier") {
            void loadMenuItems();
        }
    }, [loadMenuItems, role]);

    useEffect(() => {
        setActiveTab(actorTabs[role][0] ?? "overview");
    }, [role]);

    const filteredOrders = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const startOfWeek = new Date(startOfToday);
        const dayOfWeek = (startOfWeek.getDay() + 6) % 7;
        startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

        return orders
            .filter((order) => {
                const statusMatches = statusFilter === "all" || order.status === statusFilter;
                const searchMatches =
                    searchTerm.trim().length === 0 ||
                    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    order.id.toLowerCase().includes(searchTerm.toLowerCase());

                const orderDate = new Date(order.created_at);
                const hasValidDate = !Number.isNaN(orderDate.getTime());

                const dateMatches =
                    dateFilter === "all" ||
                    (hasValidDate &&
                        (dateFilter === "today"
                            ? orderDate >= startOfToday
                            : orderDate >= startOfWeek));

                return statusMatches && searchMatches && dateMatches;
            })
            .sort((left, right) => {
                const leftTime = new Date(left.created_at).getTime();
                const rightTime = new Date(right.created_at).getTime();
                const safeLeft = Number.isNaN(leftTime) ? 0 : leftTime;
                const safeRight = Number.isNaN(rightTime) ? 0 : rightTime;
                return safeRight - safeLeft;
            });
    }, [dateFilter, orders, searchTerm, statusFilter]);

    const statusCounts = useMemo(() => {
        return allStatuses.reduce<Record<OrderStatus, number>>((acc, status) => {
            acc[status] = orders.filter((order) => order.status === status).length;
            return acc;
        }, {
            pending: 0,
            preparing: 0,
            ready: 0,
            completed: 0,
            cancelled: 0
        });
    }, [orders]);

    const totalRevenue = useMemo(() => {
        return orders
            .filter((order) => order.status === "completed")
            .reduce((sum, order) => sum + order.total_amount, 0);
    }, [orders]);

    const selectedStatusActions = selectedOrder ? getStatusActions(role, selectedOrder.status) : [];

    const updateDraftItem = useCallback((rowId: string, key: "menuItemId" | "qty" | "notes", value: string) => {
        setDraftItems((previous) =>
            previous.map((draftItem) =>
                draftItem.rowId === rowId
                    ? {
                        ...draftItem,
                        [key]: value
                    }
                    : draftItem
            )
        );
    }, []);

    const addDraftItemRow = useCallback(() => {
        const nextRowId = String(draftRowIdRef.current);
        draftRowIdRef.current += 1;
        setDraftItems((previous) => [...previous, createDraftOrderItem(nextRowId)]);
    }, []);

    const removeDraftItemRow = useCallback((rowId: string) => {
        setDraftItems((previous) => {
            if (previous.length <= 1) {
                return previous;
            }
            return previous.filter((draftItem) => draftItem.rowId !== rowId);
        });
    }, []);

    const resetDraftItems = useCallback(() => {
        draftRowIdRef.current = 1;
        setDraftItems([createDraftOrderItem("0")]);
    }, []);

    const handleInlineStatusChange = useCallback((orderId: string, status: OrderStatus) => {
        setStatusDrafts((previous) => ({
            ...previous,
            [orderId]: status
        }));
    }, []);

    const handleInlineStatusUpdate = useCallback(
        async (order: Order) => {
            const nextStatus = statusDrafts[order.id] ?? order.status;
            const allowedStatuses = getAllowedStatusOptions(role, order.status);

            if (!allowedStatuses.includes(nextStatus)) {
                showToast("error", "You are not allowed to set this status.");
                return;
            }

            setPerformingAction(true);
            try {
                await orderApi.updateOrderStatus(order.id, nextStatus);
                showToast("success", "Order status updated.");
                await loadOrders();

                if (selectedOrderId === order.id) {
                    await loadOrderDetail(order.id);
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to update status.";
                showToast("error", message);
            } finally {
                setPerformingAction(false);
            }
        },
        [loadOrderDetail, loadOrders, orderApi, role, selectedOrderId, showToast, statusDrafts]
    );

    const handleStatusUpdate = useCallback(
        async (nextStatus: OrderStatus) => {
            if (!selectedOrder) {
                return;
            }

            setPerformingAction(true);
            try {
                await orderApi.updateOrderStatus(selectedOrder.id, nextStatus);
                showToast("success", `Order ${selectedOrder.order_number} updated to ${nextStatus}.`);
                await Promise.all([loadOrders(), loadOrderDetail(selectedOrder.id)]);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to update status.";
                showToast("error", message);
            } finally {
                setPerformingAction(false);
            }
        },
        [loadOrderDetail, loadOrders, orderApi, selectedOrder, showToast]
    );

    const handleDeleteOrder = useCallback(async () => {
        if (!selectedOrder || !orderApi.cancelOrder) {
            return;
        }

        const confirmed = window.confirm(`Delete order ${selectedOrder.order_number}? This action cannot be undone.`);
        if (!confirmed) {
            return;
        }

        setPerformingAction(true);
        try {
            await orderApi.cancelOrder(selectedOrder.id);
            showToast("success", `Order ${selectedOrder.order_number} removed.`);
            setSelectedOrderId("");
            setSelectedOrder(null);
            await loadOrders();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to delete order.";
            showToast("error", message);
        } finally {
            setPerformingAction(false);
        }
    }, [loadOrders, orderApi, selectedOrder, showToast]);

    const handleCreateOrder = useCallback(async () => {
        if (!orderApi.createOrder) {
            return;
        }

        setCreatingOrder(true);
        try {
            const created = await orderApi.createOrder({ order_type: createOrderType });
            showToast("success", `Order ${created.order_number} created.`);
            setSelectedOrderId(created.id);
            setActiveTab("queue");
            await Promise.all([loadOrders(), loadOrderDetail(created.id)]);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create order.";
            showToast("error", message);
        } finally {
            setCreatingOrder(false);
        }
    }, [createOrderType, loadOrderDetail, loadOrders, orderApi, showToast]);

    const handleAddItem = useCallback(async () => {
        if (!selectedOrder || !orderApi.addOrderItem) {
            showToast("error", "Select an order first.");
            return;
        }

        const validatedItems: Array<{ menu_item_id: number; qty: number; notes?: string }> = [];
        for (let index = 0; index < draftItems.length; index += 1) {
            const draftItem = draftItems[index];
            const parsedMenuItemId = Number(draftItem.menuItemId);
            const parsedQty = Number(draftItem.qty);

            if (!Number.isInteger(parsedMenuItemId) || parsedMenuItemId <= 0) {
                showToast("error", `Select a valid menu item for item ${index + 1}.`);
                return;
            }

            if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
                showToast("error", `Quantity must be greater than zero for item ${index + 1}.`);
                return;
            }

            validatedItems.push({
                menu_item_id: parsedMenuItemId,
                qty: parsedQty,
                notes: draftItem.notes.trim() || undefined
            });
        }

        setAddingItem(true);
        try {
            for (const itemPayload of validatedItems) {
                await orderApi.addOrderItem(selectedOrder.id, itemPayload);
            }
            showToast("success", `${validatedItems.length} item${validatedItems.length > 1 ? "s" : ""} added to order.`);
            resetDraftItems();
            await Promise.all([loadOrders(), loadOrderDetail(selectedOrder.id)]);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to add item.";
            showToast("error", message);
        } finally {
            setAddingItem(false);
        }
    }, [draftItems, loadOrderDetail, loadOrders, orderApi, resetDraftItems, selectedOrder, showToast]);

    const tabs = actorTabs[role].map((tab) => ({ key: tab, label: tabLabelMap[tab] }));

    return (
        <div className="space-y-6">
            <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.95)]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 h-52 bg-radial-[circle_at_top] from-indigo-500/20 to-transparent" />
                <div className="relative space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Order Command</p>
                    <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Orders</h1>
                    <p className="text-sm text-slate-400">Manage the full order lifecycle with real-time operations visibility.</p>
                    <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-2">
                        {tabs.map((tab) => (
                            <Button
                                key={tab.key}
                                size="sm"
                                variant={activeTab === tab.key ? "primary" : "secondary"}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.label}
                            </Button>
                        ))}
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

            {activeTab === "overview" ? (
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Card title="Total Orders">
                        <p className="text-2xl font-semibold text-slate-100">{orders.length}</p>
                    </Card>
                    <Card title="Pending Queue">
                        <p className="text-2xl font-semibold text-slate-100">{statusCounts.pending + statusCounts.preparing + statusCounts.ready}</p>
                    </Card>
                    <Card title="Completed">
                        <p className="text-2xl font-semibold text-slate-100">{statusCounts.completed}</p>
                    </Card>
                    <Card title="Completed Revenue">
                        <p className="text-2xl font-semibold text-slate-100">{formatCurrency(totalRevenue)}</p>
                    </Card>
                </section>
            ) : null}

            {activeTab === "create" ? (
                <Card title="Create New Order" description="Cashier can open a new order before adding line items.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <label htmlFor="orderType" className="block text-sm font-medium text-slate-300">
                                Order Type
                            </label>
                            <select
                                id="orderType"
                                value={createOrderType}
                                onChange={(event) => setCreateOrderType(event.target.value as OrderType)}
                                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                            >
                                <option value="dine_in">Dine In</option>
                                <option value="takeaway">Takeaway</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button loading={creatingOrder} onClick={handleCreateOrder}>
                                Create Order
                            </Button>
                        </div>
                    </div>
                </Card>
            ) : null}

            {activeTab === "queue" ? (
                <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
                    <Card title="Order List" description="Select an order to view full details and available actions.">
                        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                            <Input
                                label="Search"
                                placeholder="Order # or ID"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                            <div className="space-y-1.5">
                                <label htmlFor="dateFilter" className="block text-sm font-medium text-slate-300">
                                    Order Date
                                </label>
                                <select
                                    id="dateFilter"
                                    value={dateFilter}
                                    onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                                >
                                    <option value="today">Today</option>
                                    <option value="this_week">This Week</option>
                                    <option value="all">All</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="statusFilter" className="block text-sm font-medium text-slate-300">
                                    Status
                                </label>
                                <select
                                    id="statusFilter"
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "all")}
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                                >
                                    <option value="all">All</option>
                                    {allStatuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <Button variant="secondary" onClick={() => void loadOrders()} loading={loadingOrders}>
                                    Refresh
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {filteredOrders.length === 0 ? (
                                <p className="rounded-xl border border-white/10 bg-slate-950/45 p-3 text-sm text-slate-400">No matching orders found.</p>
                            ) : (
                                filteredOrders.map((order) => {
                                    const selected = selectedOrderId === order.id;
                                    const allowedStatusOptions = getAllowedStatusOptions(role, order.status);
                                    const draftStatus = allowedStatusOptions.includes(statusDrafts[order.id] ?? order.status)
                                        ? (statusDrafts[order.id] ?? order.status)
                                        : order.status;
                                    return (
                                        <div
                                            key={order.id}
                                            className={`w-full rounded-xl border px-3 py-3 text-left transition ${selected
                                                ? "border-indigo-300/30 bg-indigo-500/10"
                                                : "border-white/10 bg-slate-950/45 hover:border-white/20 hover:bg-white/5"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedOrderId(order.id)}
                                                    className="text-left"
                                                >
                                                    <p className="text-sm font-semibold text-slate-100">{order.order_number}</p>
                                                </button>
                                                <div className="flex items-center gap-2">
                                                    <Badge label={order.status} variant={badgeVariantForStatus(order.status)} />
                                                    <select
                                                        value={draftStatus}
                                                        onChange={(event) => handleInlineStatusChange(order.id, event.target.value as OrderStatus)}
                                                        className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                                                    >
                                                        {allowedStatusOptions.map((status) => (
                                                            <option key={status} value={status}>
                                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => void handleInlineStatusUpdate(order)}
                                                        loading={performingAction}
                                                        disabled={draftStatus === order.status}
                                                    >
                                                        Update
                                                    </Button>
                                                </div>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">{formatDate(order.created_at)}</p>
                                            <p className="mt-1 text-sm font-medium text-slate-200">{formatCurrency(order.total_amount)}</p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </Card>

                    <Card title="Order Detail" description="Includes line items, totals, and role-based actions.">
                        {!selectedOrderId ? (
                            <p className="text-sm text-slate-400">No order selected.</p>
                        ) : loadingDetail ? (
                            <p className="text-sm text-slate-400">Loading order detail...</p>
                        ) : !selectedOrder ? (
                            <p className="text-sm text-slate-400">Unable to load order details.</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-semibold text-slate-100">{selectedOrder.order_number}</p>
                                        <Badge label={selectedOrder.status} variant={badgeVariantForStatus(selectedOrder.status)} />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">{formatDate(selectedOrder.updated_at)}</p>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                        <p className="text-slate-400">Subtotal: <span className="font-medium text-slate-100">{formatCurrency(selectedOrder.subtotal)}</span></p>
                                        <p className="text-slate-400">Tax: <span className="font-medium text-slate-100">{formatCurrency(selectedOrder.tax_amount)}</span></p>
                                        <p className="text-slate-400">Discount: <span className="font-medium text-slate-100">{formatCurrency(selectedOrder.discount_amount)}</span></p>
                                        <p className="text-slate-400">Total: <span className="font-semibold text-slate-100">{formatCurrency(selectedOrder.total_amount)}</span></p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="mb-2 text-sm font-semibold text-slate-100">Items</h3>
                                    {selectedOrder.items.length === 0 ? (
                                        <p className="rounded-lg border border-white/10 bg-slate-950/45 p-3 text-sm text-slate-400">No items yet.</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {selectedOrder.items.map((item) => (
                                                <li key={item.id} className="rounded-lg border border-white/10 bg-slate-950/45 p-3 text-sm">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-medium text-slate-100">Menu Item #{item.menu_item_id}</span>
                                                        <span className="text-slate-300">x{item.quantity}</span>
                                                    </div>
                                                    <p className="mt-1 text-slate-400">Unit {formatCurrency(item.unit_price)} · Total {formatCurrency(item.total_price)}</p>
                                                    {item.notes ? <p className="mt-1 text-xs text-slate-500">Note: {item.notes}</p> : null}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                {orderApi.addOrderItem ? (
                                    <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
                                        <h3 className="mb-3 text-sm font-semibold text-slate-100">Add Item</h3>
                                        <div className="space-y-3">
                                            {draftItems.map((draftItem, index) => (
                                                <div key={draftItem.rowId} className="rounded-xl border border-white/10 bg-slate-900/35 p-3">
                                                    <div className="mb-3 flex items-center justify-between gap-2">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Item {index + 1}</p>
                                                        {draftItems.length > 1 ? (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => removeDraftItemRow(draftItem.rowId)}
                                                                disabled={addingItem || loadingMenuItems}
                                                            >
                                                                Remove
                                                            </Button>
                                                        ) : null}
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                        <div className="space-y-1.5 sm:col-span-2">
                                                            <label htmlFor={`menuItem-${draftItem.rowId}`} className="block text-sm font-medium text-slate-300">
                                                                Menu Item
                                                            </label>
                                                            <select
                                                                id={`menuItem-${draftItem.rowId}`}
                                                                value={draftItem.menuItemId}
                                                                onChange={(event) => updateDraftItem(draftItem.rowId, "menuItemId", event.target.value)}
                                                                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                                                            >
                                                                <option value="">Select menu item</option>
                                                                {menuItems.map((item) => (
                                                                    <option key={item.id} value={item.id}>
                                                                        {item.name} ({formatCurrency(item.price)})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <Input
                                                            label="Quantity"
                                                            type="number"
                                                            min="1"
                                                            value={draftItem.qty}
                                                            onChange={(event) => updateDraftItem(draftItem.rowId, "qty", event.target.value)}
                                                        />
                                                    </div>

                                                    <Input
                                                        label="Notes"
                                                        placeholder="Optional notes"
                                                        value={draftItem.notes}
                                                        onChange={(event) => updateDraftItem(draftItem.rowId, "notes", event.target.value)}
                                                    />
                                                </div>
                                            ))}

                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    variant="secondary"
                                                    onClick={addDraftItemRow}
                                                    disabled={addingItem || loadingMenuItems}
                                                >
                                                    + Add Another Item
                                                </Button>

                                                <Button onClick={handleAddItem} loading={addingItem || loadingMenuItems}>
                                                    {draftItems.length > 1 ? "Add Selected Items" : "Add Item"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="flex flex-wrap gap-2">
                                    {selectedStatusActions.map((action) => (
                                        <Button
                                            key={action.nextStatus}
                                            variant={action.nextStatus === "cancelled" ? "danger" : "primary"}
                                            onClick={() => void handleStatusUpdate(action.nextStatus)}
                                            loading={performingAction}
                                        >
                                            {action.label}
                                        </Button>
                                    ))}

                                    {orderApi.cancelOrder ? (
                                        <Button variant="danger" onClick={() => void handleDeleteOrder()} loading={performingAction}>
                                            Delete Order
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </Card>
                </section>
            ) : null}
        </div>
    );
}
