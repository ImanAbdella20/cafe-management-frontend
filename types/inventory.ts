export type InventoryActorRole = "admin" | "manager" | "cashier" | "barista";

export type InventoryItem = {
    id: string;
    name: string;
    unit: string;
    low_stock_threshold: number;
    created_at: string;
};

export type InventoryStock = {
    id: string;
    item_id: string;
    branch_id: string;
    quantity: number;
    updated_at: string;
};

export type InventoryMovement = {
    id: string;
    item_id: string;
    branch_id: string;
    quantity: number;
    movement_type: string;
    reference_id: string;
    created_by: string;
    created_at: string;
};

export type InventoryItemDetails = {
    item: InventoryItem;
    stocks: InventoryStock[];
};

export type StockAdjustmentResult = {
    stock: InventoryStock;
    movement: InventoryMovement;
};

export type InventoryPurchaseRequest = {
    id: string;
    item_id: string;
    branch_id: string;
    quantity: number;
    status: string;
    requested_by: string;
    approved_by: string;
    requested_at: string;
    approved_at: string | null;
};

export type PurchaseApprovalResult = {
    purchase_request: InventoryPurchaseRequest;
    stock: InventoryStock;
    movement: InventoryMovement;
};

export type CreateInventoryItemPayload = {
    name: string;
    unit: string;
    low_stock_threshold: number;
};

export type UpdateInventoryItemPayload = {
    name?: string;
    unit?: string;
    low_stock_threshold?: number;
};

export type AdjustInventoryStockPayload = {
    branch_id?: string;
    quantity: number;
    movement_type: string;
    reference_id?: string;
};

export type CreateInventoryPurchaseRequestPayload = {
    item_id: string;
    branch_id?: string;
    quantity: number;
};

export type ListInventoryPurchaseRequestParams = {
    branch_id?: string;
    status?: string;
};

export type UpsertMenuRecipePayload = {
    menu_item_id: number;
    inventory_item_id: string;
    quantity_per_order: number;
};