export type AppRole = "admin" | "manager" | "cashier" | "barista" | "staff" | "";

export type Category = {
    id: number;
    name: string;
    description: string;
    is_active: boolean;
    created_at: string;
};

export type CreateCategoryPayload = {
    name: string;
    description: string;
};

export type UpdateCategoryPayload = {
    name: string;
    description: string;
};

export type MenuItem = {
    id: number;
    category_id: number | null;
    name: string;
    description: string;
    image_url: string;
    is_available: boolean;
    created_at: string;
};

export type MenuItemWithPrice = {
    id: number;
    category_id?: number | null;
    category_name?: string;
    name: string;
    description: string;
    image_url: string;
    is_available: boolean;
    price: number;
    currency: string;
};

export type CreateMenuItemPayload = {
    category_id: number;
    name: string;
    description: string;
    image?: File | null;
    image_url?: string;
};

export type UpdateMenuItemPayload = {
    name: string;
    description: string;
    image?: File | null;
    image_url?: string;
    remove_image?: boolean;
};

export type Price = {
    id: number;
    item_id: number;
    amount: number;
    currency: string;
    effective_from: string;
    is_active: boolean;
};

export type CreatePricePayload = {
    amount: number;
    currency: string;
};
