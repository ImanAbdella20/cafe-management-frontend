import axios, { AxiosError, type AxiosInstance } from "axios";
import type {
    Category,
    CreateCategoryPayload,
    CreateMenuItemPayload,
    CreatePricePayload,
    MenuItem,
    MenuItemWithPrice,
    Price,
    UpdateCategoryPayload,
    UpdateMenuItemPayload
} from "@/types/menu";
import type { AddOrderItemPayload, CreateOrderPayload, Order, OrderRoleActor, OrderStatus, OrderWithItems } from "@/types/orders";
import type {
    AdjustInventoryStockPayload,
    CreateInventoryItemPayload,
    CreateInventoryPurchaseRequestPayload,
    InventoryItem,
    InventoryItemDetails,
    InventoryPurchaseRequest,
    ListInventoryPurchaseRequestParams,
    PurchaseApprovalResult,
    StockAdjustmentResult,
    UpdateInventoryItemPayload,
    UpsertMenuRecipePayload
} from "@/types/inventory";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");

type ApiErrorPayload = {
    error?: string;
    message?: string;
};

function normalizeListResponse<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) {
        return payload as T[];
    }

    if (payload && typeof payload === "object" && "data" in payload) {
        const data = (payload as { data?: unknown }).data;
        if (Array.isArray(data)) {
            return data as T[];
        }
    }

    return [];
}

function getTokenFromStorage(): string {
    if (typeof window === "undefined") {
        return "";
    }

    const localToken = localStorage.getItem("token")?.trim();
    if (localToken) {
        return localToken;
    }

    return sessionStorage.getItem("token")?.trim() ?? "";
}

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError<ApiErrorPayload>(error)) {
        const responseError = error.response?.data?.error?.trim();
        if (responseError) {
            return responseError;
        }

        const responseMessage = error.response?.data?.message?.trim();
        if (responseMessage) {
            return responseMessage;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return "Request failed.";
}

const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }
});

api.interceptors.request.use((config) => {
    const token = getTokenFromStorage();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorPayload>) => {
        if (error.response?.status === 401 && typeof window !== "undefined") {
            localStorage.removeItem("token");
            sessionStorage.removeItem("token");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export { api };

export type LoginResponse = {
    token: string;
};

export type StaffRole = "admin" | "manager" | "cashier" | "barista" | "staff";

export type StaffUser = {
    id: number;
    name: string;
    email: string;
    role: StaffRole;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type CurrentUserProfile = {
    id: number;
    name: string;
    email: string;
    password: string;
    role: StaffRole;
    branch_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type Shift = {
    id: number;
    user_id: number;
    shift_date: string;
    start_time: string;
    end_time: string;
    created_at: string;
    updated_at: string;
};

export type CreateItemResponse = {
    message: string;
    item: MenuItem;
};

type UsersResponse = {
    data: StaffUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
};

type RolesResponse = {
    data: StaffRole[];
};

type ShiftsResponse = {
    data: Shift[];
};

export async function fetchUsers(params: { page?: number; limit?: number; role?: string } = {}): Promise<UsersResponse> {
    try {
        const response = await api.get<UsersResponse>("/users", {
            params: {
                page: params.page ?? 1,
                limit: params.limit ?? 10,
                role: params.role || undefined
            }
        });
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function fetchRoles(): Promise<StaffRole[]> {
    try {
        const response = await api.get<RolesResponse>("/roles");
        return response.data.data ?? [];
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function createStaff(payload: { name: string; email: string; password: string; role: StaffRole }): Promise<StaffUser> {
    try {
        const response = await api.post<StaffUser>("/users", payload);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function updateStaffStatus(payload: { id: number; is_active: boolean }): Promise<{ id: number; is_active: boolean }> {
    try {
        const response = await api.patch<{ id: number; is_active: boolean }>("/users/status", payload);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function updateStaffRole(payload: { id: number; role: StaffRole }): Promise<{ id: number; role: StaffRole }> {
    try {
        const response = await api.patch<{ id: number; role: StaffRole }>("/users/role", payload);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function assignStaffShift(payload: { id: number; shift_date: string; start_time: string; end_time: string }): Promise<Shift> {
    try {
        const response = await api.post<Shift>("/users/shifts", payload);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function fetchShiftsByUser(id: number): Promise<Shift[]> {
    try {
        const response = await api.get<ShiftsResponse>(`/users/${id}/shifts`);
        return response.data.data ?? [];
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function fetchCurrentUserProfile(): Promise<CurrentUserProfile> {
    try {
        const response = await api.get<CurrentUserProfile>("/users/me");
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function loginAdmin(email: string, password: string): Promise<LoginResponse> {
    try {
        const response = await api.post<Partial<LoginResponse> & ApiErrorPayload>("/admin/login", { email, password });
        if (!response.data.token) {
            throw new Error(response.data.error ?? "Login failed. Please check your credentials.");
        }
        return { token: response.data.token };
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function getCategories(): Promise<Category[]> {
    try {
        const response = await api.get<Category[] | { data?: Category[] } | null>("/api/categories");
        return normalizeListResponse<Category>(response.data);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
    try {
        const response = await api.post<Category>("/api/categories", payload);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function updateCategory(id: number, payload: UpdateCategoryPayload): Promise<void> {
    try {
        await api.patch(`/api/categories/${id}`, payload);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function deleteCategory(id: number): Promise<void> {
    try {
        await api.delete(`/api/categories/${id}`);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function getItems(): Promise<MenuItemWithPrice[]> {
    try {
        const response = await api.get<MenuItemWithPrice[] | { data?: MenuItemWithPrice[] } | null>("/api/items");
        return normalizeListResponse<MenuItemWithPrice>(response.data);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function createItem(payload: CreateMenuItemPayload): Promise<CreateItemResponse> {
    try {
        const formData = new FormData();
        formData.append("category_id", String(payload.category_id));
        formData.append("name", payload.name.trim());
        formData.append("description", payload.description.trim());
        if (payload.image) {
            formData.append("image", payload.image);
        }
        if (payload.image_url?.trim()) {
            formData.append("image_url", payload.image_url.trim());
        }

        const response = await api.post<CreateItemResponse>("/api/items", formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        });
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function updateItem(id: number, payload: UpdateMenuItemPayload): Promise<void> {
    try {
        const formData = new FormData();
        formData.append("name", payload.name.trim());
        formData.append("description", payload.description.trim());
        if (payload.image) {
            formData.append("image", payload.image);
        }
        if (payload.image_url?.trim()) {
            formData.append("image_url", payload.image_url.trim());
        }
        if (payload.remove_image) {
            formData.append("remove_image", "true");
        }

        await api.patch(`/api/items/${id}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        });
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function deleteItem(id: number): Promise<void> {
    try {
        await api.delete(`/api/items/${id}`);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function createPrice(itemId: number, payload: CreatePricePayload): Promise<void> {
    try {
        await api.post(`/api/items/${itemId}/price`, payload);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function getItemPrices(itemId: number): Promise<Price[]> {
    try {
        const response = await api.get<Price[] | { data?: Price[] }>(`/api/items/${itemId}/prices`);
        if (Array.isArray(response.data)) {
            return response.data;
        }
        if (response.data && Array.isArray(response.data.data)) {
            return response.data.data;
        }
        return [];
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function getInventoryItems(): Promise<InventoryItem[]> {
    try {
        const response = await api.get<InventoryItem[] | { data?: InventoryItem[] } | null>("/api/inventory");
        return normalizeListResponse<InventoryItem>(response.data);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function getInventoryItemById(itemId: string): Promise<InventoryItemDetails> {
    try {
        const response = await api.get<InventoryItemDetails>(`/api/inventory/${itemId}`);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function createInventoryItem(payload: CreateInventoryItemPayload): Promise<InventoryItem> {
    try {
        const response = await api.post<InventoryItem>("/api/inventory", payload);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function updateInventoryItem(itemId: string, payload: UpdateInventoryItemPayload): Promise<InventoryItem> {
    try {
        const response = await api.patch<InventoryItem>(`/api/inventory/${itemId}`, payload);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
    try {
        await api.delete(`/api/inventory/${itemId}`);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function adjustInventoryStock(itemId: string, payload: AdjustInventoryStockPayload): Promise<StockAdjustmentResult> {
    try {
        const response = await api.post<StockAdjustmentResult>(`/api/inventory/${itemId}/adjust`, payload);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function createInventoryPurchaseRequest(payload: CreateInventoryPurchaseRequestPayload): Promise<InventoryPurchaseRequest> {
    try {
        const response = await api.post<InventoryPurchaseRequest>("/api/inventory/purchase-requests", payload);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function listInventoryPurchaseRequests(params: ListInventoryPurchaseRequestParams = {}): Promise<InventoryPurchaseRequest[]> {
    try {
        const response = await api.get<InventoryPurchaseRequest[] | { data?: InventoryPurchaseRequest[] } | null>("/api/inventory/purchase-requests", {
            params: {
                branch_id: params.branch_id || undefined,
                status: params.status || undefined
            }
        });

        return normalizeListResponse<InventoryPurchaseRequest>(response.data);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function approveInventoryPurchaseRequest(purchaseRequestId: string): Promise<PurchaseApprovalResult> {
    try {
        const response = await api.post<PurchaseApprovalResult>(`/api/inventory/purchase-requests/${purchaseRequestId}/approve`, {
            note: "Approved from dashboard"
        });
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function upsertMenuRecipe(payload: UpsertMenuRecipePayload): Promise<void> {
    try {
        await api.post("/api/inventory/recipes", payload);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function getOrders(status?: OrderStatus): Promise<Order[]> {
    try {
        const response = await api.get<Order[] | { data?: Order[] } | null>("/api/orders", {
            params: status ? { status } : undefined
        });
        return normalizeListResponse<Order>(response.data);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function getOrderById(id: string): Promise<OrderWithItems> {
    try {
        const response = await api.get<OrderWithItems>(`/api/orders/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function createOrder(payload: CreateOrderPayload = {}): Promise<Order> {
    try {
        const response = await api.post<Order>("/api/orders", payload);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function addOrderItem(orderId: string, payload: AddOrderItemPayload): Promise<void> {
    try {
        await api.post(`/api/orders/${orderId}/items`, payload);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    try {
        await api.patch(`/api/orders/${orderId}/status`, { status });
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function cancelOrder(orderId: string): Promise<void> {
    try {
        await api.delete(`/api/orders/${orderId}`);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export type Payment = {
    id: number;
    order_id: string;
    amount: number;
    payment_method: string;
    status: string;
    transaction_reference: string;
    paid_at?: string;
    created_at: string;
};

export type PaymentMethod = "cash" | "card" | "mobile";

export type CreatePaymentPayload = {
    order_id: string;
    amount: number;
    method: PaymentMethod;
    status?: "pending" | "paid" | "failed";
};

export type PaymentsDailyReport = {
    date: string;
    total_payments: number;
    total_collected: number;
    by_method: Array<{
        method: string;
        count: number;
        total: number;
    }>;
};

export async function getPayments(orderId = ""): Promise<Payment[]> {
    const trimmedOrderID = orderId.trim();

    try {
        const response = await api.get<Payment[] | { data?: Payment[] }>("/api/payments", {
            params: trimmedOrderID
                ? {
                    order_id: trimmedOrderID
                }
                : undefined
        });
        return normalizeListResponse<Payment>(response.data);
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function getPaymentById(id: string, orderId = ""): Promise<Payment> {
    const payments = await getPayments(orderId);
    const payment = payments.find((entry) => String(entry.id) === id.trim());

    if (!payment) {
        throw new Error("Failed to fetch payment");
    }

    return payment;
}

export async function createPayment(payload: CreatePaymentPayload): Promise<Payment> {
    try {
        const response = await api.post<Payment>("/api/payments", payload);
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function refundPayment(paymentId: number): Promise<void> {
    try {
        await api.post("/api/refunds", { payment_id: paymentId });
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

export async function getPaymentsDailyReport(date?: string): Promise<PaymentsDailyReport> {
    try {
        const response = await api.get<PaymentsDailyReport>("/api/payments/report", {
            params: date ? { date } : undefined
        });
        return response.data;
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}

type ActorOrderApi = {
    getOrders: typeof getOrders;
    getOrderById: typeof getOrderById;
    updateOrderStatus: typeof updateOrderStatus;
    createOrder?: typeof createOrder;
    addOrderItem?: typeof addOrderItem;
    cancelOrder?: typeof cancelOrder;
};

const actorOrderApis: Record<OrderRoleActor, ActorOrderApi> = {
    admin: {
        getOrders,
        getOrderById,
        updateOrderStatus,
        cancelOrder
    },
    manager: {
        getOrders,
        getOrderById,
        updateOrderStatus
    },
    cashier: {
        getOrders,
        getOrderById,
        createOrder,
        addOrderItem,
        updateOrderStatus
    },
    barista: {
        getOrders,
        getOrderById,
        updateOrderStatus
    }
};

export const adminOrderApi = actorOrderApis.admin;
export const managerOrderApi = actorOrderApis.manager;
export const cashierOrderApi = actorOrderApis.cashier;
export const baristaOrderApi = actorOrderApis.barista;

export function getOrderApiForActor(actor: OrderRoleActor): ActorOrderApi {
    return actorOrderApis[actor];
}
