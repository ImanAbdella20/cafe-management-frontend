export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

export type OrderType = "dine_in" | "takeaway";

export type OrderRoleActor = "admin" | "manager" | "cashier" | "barista";

export type Order = {
    id: string;
    order_number: string;
    cashier_id: string;
    order_type: string;
    status: OrderStatus;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    created_at: string;
    updated_at: string;
};

export type OrderItem = {
    id: string;
    order_id: string;
    menu_item_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes: string;
    created_at: string;
};

export type OrderWithItems = Order & {
    items: OrderItem[];
};

export type CreateOrderPayload = {
    order_type?: OrderType;
};

export type AddOrderItemPayload = {
    menu_item_id: number;
    qty: number;
    notes?: string;
};
