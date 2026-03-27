"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { getRoleFromToken } from "@/lib/auth";
import type { AppRole } from "@/types/menu";

type TokenPersistence = "local" | "session";

type AuthContextValue = {
    token: string;
    role: AppRole;
    isAuthenticated: boolean;
    isLoading: boolean;
    setToken: (token: string, persistence?: TokenPersistence) => void;
    clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeRole(role: string): AppRole {
    const value = role.toLowerCase();
    if (value === "admin" || value === "manager" || value === "cashier" || value === "barista" || value === "staff") {
        return value;
    }
    return "";
}

function getTokenFromBrowserStorage() {
    if (typeof window === "undefined") {
        return "";
    }

    const localToken = localStorage.getItem("token")?.trim();
    if (localToken) {
        return localToken;
    }

    return sessionStorage.getItem("token")?.trim() ?? "";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setTokenState] = useState(() => getTokenFromBrowserStorage());

    const role = useMemo<AppRole>(() => {
        if (!token) {
            return "";
        }
        return normalizeRole(getRoleFromToken(token));
    }, [token]);

    const value = useMemo<AuthContextValue>(
        () => ({
            token,
            role,
            isAuthenticated: token.length > 0,
            isLoading: false,
            setToken: (nextToken: string, persistence: TokenPersistence = "local") => {
                const trimmed = nextToken.trim();
                if (!trimmed) {
                    localStorage.removeItem("token");
                    sessionStorage.removeItem("token");
                    setTokenState("");
                    return;
                }

                if (persistence === "session") {
                    sessionStorage.setItem("token", trimmed);
                    localStorage.removeItem("token");
                } else {
                    localStorage.setItem("token", trimmed);
                    sessionStorage.removeItem("token");
                }

                setTokenState(trimmed);
            },
            clearAuth: () => {
                localStorage.removeItem("token");
                sessionStorage.removeItem("token");
                setTokenState("");
            }
        }),
        [role, token]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
