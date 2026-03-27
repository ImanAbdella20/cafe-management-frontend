type JwtPayload = {
    role?: string;
    branch_id?: string;
};

function decodeTokenPayload(token: string): JwtPayload | null {
    try {
        const payloadPart = token.split(".")[1] ?? "";
        if (!payloadPart) {
            return null;
        }

        const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
        const paddedBase64 = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const decoded = atob(paddedBase64);

        return JSON.parse(decoded) as JwtPayload;
    } catch {
        return null;
    }
}

export function getRoleFromToken(token: string): string {
    const decoded = decodeTokenPayload(token);
    return String(decoded?.role ?? "").toLowerCase();
}

export function getBranchIdFromToken(token: string): string {
    const decoded = decodeTokenPayload(token);
    return String(decoded?.branch_id ?? "").trim().toLowerCase();
}

export function requireRole(role: string): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    const token = localStorage.getItem("token") ?? sessionStorage.getItem("token");
    if (!token) {
        return false;
    }

    return getRoleFromToken(token) === role.toLowerCase();
}
