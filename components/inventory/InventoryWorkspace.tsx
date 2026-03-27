"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Table from "@/components/ui/Table";
import {
    adjustInventoryStock,
    approveInventoryPurchaseRequest,
    createInventoryItem,
    createInventoryPurchaseRequest,
    deleteInventoryItem,
    getInventoryItemById,
    getInventoryItems,
    listInventoryPurchaseRequests,
    upsertMenuRecipe,
    updateInventoryItem
} from "@/lib/api";
import { getBranchIdFromToken } from "@/lib/auth";
import type {
    InventoryActorRole,
    InventoryItem,
    InventoryItemDetails,
    InventoryPurchaseRequest,
    UpdateInventoryItemPayload
} from "@/types/inventory";

type TabKey = "overview" | "stocks" | "purchases" | "recipes";

type ToastState = {
    type: "success" | "error";
    message: string;
} | null;

type InventoryWorkspaceProps = {
    role: InventoryActorRole;
};

const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "stocks", label: "Stock Ops" },
    { key: "purchases", label: "Purchases" },
    { key: "recipes", label: "Recipes" }
];

function getActiveToken(): string {
    if (typeof window === "undefined") {
        return "";
    }

    const localToken = localStorage.getItem("token")?.trim();
    if (localToken) {
        return localToken;
    }

    return sessionStorage.getItem("token")?.trim() ?? "";
}

function formatNumber(value: number): string {
    return Number.isFinite(value) ? value.toLocaleString() : "0";
}

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }
    return date.toLocaleString();
}

export default function InventoryWorkspace({ role }: InventoryWorkspaceProps) {
    const [activeTab, setActiveTab] = useState<TabKey>("overview");
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [selectedItemId, setSelectedItemId] = useState("");
    const [selectedItemDetails, setSelectedItemDetails] = useState<InventoryItemDetails | null>(null);
    const [purchaseRequests, setPurchaseRequests] = useState<InventoryPurchaseRequest[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [loadingPurchases, setLoadingPurchases] = useState(false);
    const [busyAction, setBusyAction] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [pageError, setPageError] = useState("");

    const [newItemName, setNewItemName] = useState("");
    const [newItemUnit, setNewItemUnit] = useState("unit");
    const [newItemThreshold, setNewItemThreshold] = useState("0");

    const [editName, setEditName] = useState("");
    const [editUnit, setEditUnit] = useState("unit");
    const [editThreshold, setEditThreshold] = useState("0");

    const [adjustBranchId, setAdjustBranchId] = useState("");
    const [adjustQuantity, setAdjustQuantity] = useState("");
    const [adjustMovementType, setAdjustMovementType] = useState("manual_adjustment");

    const [purchaseBranchId, setPurchaseBranchId] = useState("");
    const [purchaseQuantity, setPurchaseQuantity] = useState("");

    const [recipeMenuItemId, setRecipeMenuItemId] = useState("");
    const [recipeInventoryItemId, setRecipeInventoryItemId] = useState("");
    const [recipeQuantityPerOrder, setRecipeQuantityPerOrder] = useState("");

    const isAdmin = role === "admin";
    const isManager = role === "manager";
    const canAccessInventory = isAdmin || isManager;

    const tokenBranchId = useMemo(() => {
        const token = getActiveToken();
        if (!token) {
            return "";
        }
        return getBranchIdFromToken(token);
    }, []);

    const notify = useCallback((type: "success" | "error", message: string) => {
        setToast({ type, message });
    }, []);

    useEffect(() => {
        if (!toast) {
            return;
        }
        const timeoutId = window.setTimeout(() => setToast(null), 3000);
        return () => window.clearTimeout(timeoutId);
    }, [toast]);

    useEffect(() => {
        if (!canAccessInventory) {
            return;
        }

        if (isManager && tokenBranchId) {
            setAdjustBranchId(tokenBranchId);
            setPurchaseBranchId(tokenBranchId);
        }
    }, [canAccessInventory, isManager, tokenBranchId]);

    const loadItems = useCallback(async () => {
        setLoadingItems(true);
        try {
            const data = await getInventoryItems();
            setItems(data);
            if (!selectedItemId && data.length > 0) {
                setSelectedItemId(data[0].id);
            }
            if (selectedItemId && !data.some((item) => item.id === selectedItemId)) {
                setSelectedItemId(data[0]?.id ?? "");
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load inventory items.";
            setPageError(message);
            notify("error", message);
        } finally {
            setLoadingItems(false);
        }
    }, [notify, selectedItemId]);

    const loadItemDetails = useCallback(
        async (itemId: string) => {
            if (!itemId) {
                setSelectedItemDetails(null);
                return;
            }

            setLoadingDetails(true);
            try {
                const data = await getInventoryItemById(itemId);
                setSelectedItemDetails(data);
                setEditName(data.item.name);
                setEditUnit(data.item.unit);
                setEditThreshold(String(data.item.low_stock_threshold));
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to load item details.";
                notify("error", message);
                setSelectedItemDetails(null);
            } finally {
                setLoadingDetails(false);
            }
        },
        [notify]
    );

    const loadPurchases = useCallback(async () => {
        setLoadingPurchases(true);
        try {
            const data = await listInventoryPurchaseRequests({
                branch_id: isManager ? tokenBranchId : undefined
            });
            setPurchaseRequests(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load purchase requests.";
            notify("error", message);
        } finally {
            setLoadingPurchases(false);
        }
    }, [isManager, notify, tokenBranchId]);

    const refreshAll = useCallback(async () => {
        setPageError("");
        await Promise.all([loadItems(), loadPurchases()]);
    }, [loadItems, loadPurchases]);

    useEffect(() => {
        if (!canAccessInventory) {
            return;
        }

        void refreshAll();
    }, [canAccessInventory, refreshAll]);

    useEffect(() => {
        if (!canAccessInventory) {
            return;
        }

        void loadItemDetails(selectedItemId);
    }, [canAccessInventory, loadItemDetails, selectedItemId]);

    const totalStock = useMemo(() => {
        return (selectedItemDetails?.stocks ?? []).reduce((sum, stock) => sum + stock.quantity, 0);
    }, [selectedItemDetails]);

    const pendingRequestsCount = useMemo(() => {
        return purchaseRequests.filter((request) => request.status === "pending").length;
    }, [purchaseRequests]);

    const canApprovePurchases = isAdmin || isManager;

    if (!canAccessInventory) {
        return (
            <div className="space-y-4">
                <Card title="Inventory Access Restricted" description="Your role currently has no direct inventory permission.">
                    <p className="text-sm text-slate-300">
                        Cashier and barista workflows should continue through orders and payments. Inventory operations are limited to
                        admin and manager roles.
                    </p>
                </Card>
            </div>
        );
    }

    async function handleCreateItem() {
        if (!isAdmin) {
            return;
        }

        setBusyAction(true);
        try {
            await createInventoryItem({
                name: newItemName.trim(),
                unit: newItemUnit.trim(),
                low_stock_threshold: Number(newItemThreshold || 0)
            });
            notify("success", "Inventory item created.");
            setNewItemName("");
            setNewItemUnit("unit");
            setNewItemThreshold("0");
            await loadItems();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create inventory item.";
            notify("error", message);
        } finally {
            setBusyAction(false);
        }
    }

    async function handleUpdateItem() {
        if (!isAdmin || !selectedItemId) {
            return;
        }

        setBusyAction(true);
        try {
            const payload: UpdateInventoryItemPayload = {
                name: editName.trim(),
                unit: editUnit.trim(),
                low_stock_threshold: Number(editThreshold || 0)
            };
            await updateInventoryItem(selectedItemId, payload);
            notify("success", "Inventory item updated.");
            await Promise.all([loadItems(), loadItemDetails(selectedItemId)]);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update item.";
            notify("error", message);
        } finally {
            setBusyAction(false);
        }
    }

    async function handleDeleteItem() {
        if (!isAdmin || !selectedItemId) {
            return;
        }

        const selectedName = selectedItemDetails?.item.name ?? "this item";
        const confirmed = window.confirm(`Delete ${selectedName}? This action cannot be undone.`);
        if (!confirmed) {
            return;
        }

        setBusyAction(true);
        try {
            await deleteInventoryItem(selectedItemId);
            notify("success", "Inventory item deleted.");
            setSelectedItemId("");
            setSelectedItemDetails(null);
            await loadItems();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to delete item.";
            notify("error", message);
        } finally {
            setBusyAction(false);
        }
    }

    async function handleAdjustStock() {
        if (!selectedItemId) {
            notify("error", "Select an item first.");
            return;
        }

        setBusyAction(true);
        try {
            const payload = {
                quantity: Number(adjustQuantity),
                movement_type: adjustMovementType.trim(),
                reference_id: undefined
            };

            const normalizedBranchID = adjustBranchId.trim();
            await adjustInventoryStock(selectedItemId, normalizedBranchID ? { ...payload, branch_id: normalizedBranchID } : payload);
            notify("success", "Stock adjusted successfully.");
            setAdjustQuantity("");
            await loadItemDetails(selectedItemId);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to adjust stock.";
            notify("error", message);
        } finally {
            setBusyAction(false);
        }
    }

    async function handleCreatePurchaseRequest() {
        if (!selectedItemId) {
            notify("error", "Select an item first.");
            return;
        }

        setBusyAction(true);
        try {
            const payload = {
                item_id: selectedItemId,
                quantity: Number(purchaseQuantity)
            };

            const normalizedBranchID = purchaseBranchId.trim();
            await createInventoryPurchaseRequest(normalizedBranchID ? { ...payload, branch_id: normalizedBranchID } : payload);
            notify("success", "Purchase request created.");
            setPurchaseQuantity("");
            await loadPurchases();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create purchase request.";
            notify("error", message);
        } finally {
            setBusyAction(false);
        }
    }

    async function handleApprovePurchaseRequest(purchaseRequestId: string) {
        setBusyAction(true);
        try {
            await approveInventoryPurchaseRequest(purchaseRequestId);
            notify("success", "Purchase request approved.");
            await Promise.all([loadPurchases(), loadItemDetails(selectedItemId)]);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to approve purchase request.";
            notify("error", message);
        } finally {
            setBusyAction(false);
        }
    }

    async function handleUpsertRecipe() {
        if (!isAdmin) {
            return;
        }

        setBusyAction(true);
        try {
            await upsertMenuRecipe({
                menu_item_id: Number(recipeMenuItemId),
                inventory_item_id: recipeInventoryItemId.trim(),
                quantity_per_order: Number(recipeQuantityPerOrder)
            });
            notify("success", "Recipe ingredient mapping saved.");
            setRecipeMenuItemId("");
            setRecipeInventoryItemId("");
            setRecipeQuantityPerOrder("");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save recipe mapping.";
            notify("error", message);
        } finally {
            setBusyAction(false);
        }
    }

    const visibleTabs = isAdmin ? tabs : tabs.filter((tab) => tab.key !== "recipes");

    return (
        <div className="space-y-6">
            <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.95)]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 h-52 bg-radial-[circle_at_top] from-cyan-500/20 to-transparent" />
                <div className="relative space-y-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Inventory</p>
                        <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">Inventory Management</h1>
                        <p className="mt-1 text-sm text-slate-400">Track stock, process purchase approvals, and maintain recipe mappings.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-slate-950/45 p-2">
                        {visibleTabs.map((tab) => (
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
                {pageError ? <p className="relative mt-3 text-sm text-rose-300">{pageError}</p> : null}
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
                    <Card title="Inventory Items">
                        <p className="text-2xl font-semibold text-slate-100">{items.length}</p>
                    </Card>
                    <Card title="Pending Purchases">
                        <p className="text-2xl font-semibold text-slate-100">{pendingRequestsCount}</p>
                    </Card>
                    <Card title="Selected Item Stock">
                        <p className="text-2xl font-semibold text-slate-100">{formatNumber(totalStock)}</p>
                    </Card>
                    <Card title="Role Scope">
                        <p className="text-sm text-slate-300">
                            {isAdmin ? "Admin: full inventory controls" : "Manager: branch-scoped inventory controls"}
                        </p>
                    </Card>
                </section>
            ) : null}

            {activeTab === "stocks" ? (
                <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
                    <Card title="Items" description="Select an item to view stock by branch.">
                        {loadingItems ? <p className="mb-2 text-sm text-slate-400">Loading inventory items...</p> : null}
                        <Table<InventoryItem>
                            columns={[
                                { key: "name", header: "Name" },
                                { key: "unit", header: "Unit" },
                                {
                                    key: "low_stock_threshold",
                                    header: "Low Threshold",
                                    render: (value) => formatNumber(Number(value ?? 0))
                                },
                                {
                                    key: "id",
                                    header: "Action",
                                    render: (value) => (
                                        <Button
                                            size="sm"
                                            variant={String(value) === selectedItemId ? "primary" : "secondary"}
                                            onClick={() => setSelectedItemId(String(value))}
                                        >
                                            {String(value) === selectedItemId ? "Selected" : "Select"}
                                        </Button>
                                    )
                                }
                            ]}
                            data={items}
                            rowKey={(row) => row.id}
                            emptyState="No inventory items found."
                        />
                    </Card>

                    <div className="space-y-4">
                        <Card title="Selected Item Details" description="Stock levels and basic item management.">
                            {!selectedItemDetails || loadingDetails ? (
                                <p className="text-sm text-slate-400">{loadingDetails ? "Loading item details..." : "Select an item to continue."}</p>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-300">Name: <span className="text-slate-100">{selectedItemDetails.item.name}</span></p>
                                    <p className="text-sm text-slate-300">Unit: <span className="text-slate-100">{selectedItemDetails.item.unit}</span></p>
                                    <p className="text-sm text-slate-300">Total stock: <span className="text-slate-100">{formatNumber(totalStock)}</span></p>
                                    <div className="space-y-2">
                                        {(selectedItemDetails.stocks ?? []).map((stock) => (
                                            <div key={stock.id} className="rounded-lg border border-white/10 bg-slate-950/45 p-2 text-sm text-slate-300">
                                                <p>Branch: {stock.branch_id}</p>
                                                <p>Qty: {formatNumber(stock.quantity)}</p>
                                                <p>Updated: {formatDate(stock.updated_at)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>

                        {isAdmin ? (
                            <Card title="Create Item" description="Admin-only inventory item creation.">
                                <div className="space-y-3">
                                    <Input label="Name" value={newItemName} onChange={(event) => setNewItemName(event.target.value)} />
                                    <Input label="Unit" value={newItemUnit} onChange={(event) => setNewItemUnit(event.target.value)} />
                                    <Input
                                        label="Low Stock Threshold"
                                        type="number"
                                        min="0"
                                        value={newItemThreshold}
                                        onChange={(event) => setNewItemThreshold(event.target.value)}
                                    />
                                    <Button onClick={handleCreateItem} loading={busyAction}>Create Item</Button>
                                </div>
                            </Card>
                        ) : null}

                        <Card title="Adjust Stock" description="Add or remove stock with movement tracking.">
                            <div className="space-y-3">
                                <Input
                                    label="Branch ID (Optional)"
                                    value={adjustBranchId}
                                    onChange={(event) => setAdjustBranchId(event.target.value)}
                                />
                                <Input
                                    label="Quantity Delta"
                                    type="number"
                                    value={adjustQuantity}
                                    onChange={(event) => setAdjustQuantity(event.target.value)}
                                />
                                <Input
                                    label="Movement Type"
                                    value={adjustMovementType}
                                    onChange={(event) => setAdjustMovementType(event.target.value)}
                                />
                                <Button onClick={handleAdjustStock} loading={busyAction} disabled={!selectedItemId}>Apply Adjustment</Button>
                            </div>
                        </Card>

                        {isAdmin && selectedItemId ? (
                            <Card title="Update or Delete Item" description="Admin-only item maintenance.">
                                <div className="space-y-3">
                                    <Input label="Name" value={editName} onChange={(event) => setEditName(event.target.value)} />
                                    <Input label="Unit" value={editUnit} onChange={(event) => setEditUnit(event.target.value)} />
                                    <Input
                                        label="Low Stock Threshold"
                                        type="number"
                                        min="0"
                                        value={editThreshold}
                                        onChange={(event) => setEditThreshold(event.target.value)}
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        <Button onClick={handleUpdateItem} loading={busyAction}>Update Item</Button>
                                        <Button variant="danger" onClick={handleDeleteItem} loading={busyAction}>Delete Item</Button>
                                    </div>
                                </div>
                            </Card>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {activeTab === "purchases" ? (
                <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
                    <Card title="Purchase Requests" description="Create and approve procurement requests.">
                        {loadingPurchases ? <p className="mb-2 text-sm text-slate-400">Loading purchase requests...</p> : null}
                        <Table<InventoryPurchaseRequest>
                            columns={[
                                { key: "item_id", header: "Item ID" },
                                { key: "branch_id", header: "Branch" },
                                {
                                    key: "quantity",
                                    header: "Qty",
                                    render: (value) => formatNumber(Number(value ?? 0))
                                },
                                { key: "status", header: "Status" },
                                {
                                    key: "requested_at",
                                    header: "Requested",
                                    render: (value) => formatDate(String(value ?? ""))
                                },
                                {
                                    key: "id",
                                    header: "Action",
                                    render: (value, row) => (
                                        <Button
                                            size="sm"
                                            onClick={() => handleApprovePurchaseRequest(String(value))}
                                            disabled={!canApprovePurchases || row.status !== "pending"}
                                        >
                                            Approve
                                        </Button>
                                    )
                                }
                            ]}
                            data={purchaseRequests}
                            rowKey={(row) => row.id}
                            emptyState="No purchase requests found."
                        />
                    </Card>

                    <Card title="Create Purchase Request" description="Request additional stock for a branch.">
                        <div className="space-y-3">
                            <Input
                                label="Selected Item"
                                value={selectedItemId}
                                onChange={(event) => setSelectedItemId(event.target.value)}
                                placeholder="Select item from stock tab"
                            />
                            <Input
                                label="Branch ID (Optional)"
                                value={purchaseBranchId}
                                onChange={(event) => setPurchaseBranchId(event.target.value)}
                            />
                            <Input
                                label="Quantity"
                                type="number"
                                min="1"
                                value={purchaseQuantity}
                                onChange={(event) => setPurchaseQuantity(event.target.value)}
                            />
                            <Button onClick={handleCreatePurchaseRequest} loading={busyAction} disabled={!selectedItemId}>
                                Create Request
                            </Button>
                        </div>
                    </Card>
                </div>
            ) : null}

            {activeTab === "recipes" && isAdmin ? (
                <Card title="Recipe Mapping" description="Map inventory ingredients to menu items for automatic order deduction.">
                    <div className="grid gap-3 md:grid-cols-2">
                        <Input
                            label="Menu Item ID"
                            type="number"
                            min="1"
                            value={recipeMenuItemId}
                            onChange={(event) => setRecipeMenuItemId(event.target.value)}
                        />
                        <Input
                            label="Inventory Item ID"
                            value={recipeInventoryItemId}
                            onChange={(event) => setRecipeInventoryItemId(event.target.value)}
                        />
                        <Input
                            label="Quantity Per Order"
                            type="number"
                            min="0.0001"
                            step="0.0001"
                            value={recipeQuantityPerOrder}
                            onChange={(event) => setRecipeQuantityPerOrder(event.target.value)}
                        />
                    </div>
                    <div className="mt-3">
                        <Button onClick={handleUpsertRecipe} loading={busyAction}>Save Recipe Mapping</Button>
                    </div>
                </Card>
            ) : null}
        </div>
    );
}
