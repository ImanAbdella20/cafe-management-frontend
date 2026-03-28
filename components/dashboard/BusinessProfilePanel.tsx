"use client";

import { useEffect, useState } from "react";
import { Building2, CalendarClock, Eye, EyeOff, KeyRound, Mail, MapPin, ShieldUser } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { fetchCurrentUserProfile } from "@/lib/api";
import { getBranchIdFromToken, getRoleFromToken, getUserIdFromToken } from "@/lib/auth";

type ProfileData = {
    businessName: string;
    userId: number;
    role: string;
    email: string;
    password: string;
    branchId: string;
    loginAt: string;
};

function getFromStorage(key: string): string {
    const localValue = localStorage.getItem(key)?.trim();
    if (localValue) {
        return localValue;
    }

    return sessionStorage.getItem(key)?.trim() ?? "";
}

function roleLabel(role: string): string {
    if (!role) {
        return "User";
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDateTime(value: string): string {
    if (!value) {
        return "-";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString("en-ET", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

export default function BusinessProfilePanel() {
    const [showPassword, setShowPassword] = useState(false);
    const [data, setData] = useState<ProfileData>(() => {
        if (typeof window === "undefined") {
            return {
                businessName: "AMIDOS Cafe",
                userId: 0,
                role: "",
                email: "",
                password: "",
                branchId: "",
                loginAt: ""
            };
        }

        const token = getFromStorage("token");

        return {
            businessName: "AMIDOS Cafe",
            userId: getUserIdFromToken(token),
            role: getRoleFromToken(token),
            email: getFromStorage("auth:user-email"),
            password: getFromStorage("auth:user-password"),
            branchId: getBranchIdFromToken(token),
            loginAt: getFromStorage("auth:login-at")
        };
    });

    useEffect(() => {
        let cancelled = false;

        const loadCurrentUser = async () => {
            try {
                const profile = await fetchCurrentUserProfile();
                if (cancelled) {
                    return;
                }

                setData((prev) => ({
                    ...prev,
                    userId: profile.id,
                    role: profile.role,
                    email: profile.email,
                    password: profile.password,
                    branchId: profile.branch_id
                }));
            } catch {
                // Keep fallback storage-based values if profile fetch fails.
            }
        };

        loadCurrentUser();

        return () => {
            cancelled = true;
        };
    }, []);

    const hasPassword = Boolean(data.password);
    const passwordDisplay = hasPassword
        ? showPassword
            ? data.password
            : "*".repeat(Math.max(data.password.length, 8))
        : showPassword
            ? "No saved password in this session."
            : "********";

    return (
        <Card title="Business Profile" description="Logged in user profile information.">
            <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
                    <div className="flex items-center gap-2 text-slate-100">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                        <span className="font-medium">{data.businessName}</span>
                    </div>
                    <div className="mt-2">
                        <Badge label={roleLabel(data.role)} variant="primary" />
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 text-sm text-slate-300">
                    {/* <p className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        <span>User ID: {data.userId || "-"}</span>
                    </p> */}
                    <p className="mt-2 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        <span>{data.email || "-"}</span>
                    </p>
                    <p className="mt-2 flex items-center gap-2">
                        <ShieldUser className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        <span>{roleLabel(data.role)}</span>
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-slate-400" aria-hidden="true" />
                            <span>{passwordDisplay}</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            aria-pressed={showPassword}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                        </button>
                    </div>
                    <p className="mt-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        <span>{data.branchId || ""} Addis Ababa, Ethiopia</span>
                    </p>
                    <p className="mt-2 flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        <span>{formatDateTime(data.loginAt)}</span>
                    </p>
                </div>
            </div>
        </Card>
    );
}
