"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RefreshCcw, Server, ShieldCheck, SlidersHorizontal } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { requireRole } from "@/lib/auth";

type ToastState = {
    type: "success" | "error";
    message: string;
} | null;

type BackendStatus = "checking" | "online" | "offline";

type AdminSettings = {
    cafeName: string;
    branchCode: string;
    contactEmail: string;
    contactPhone: string;
    timezone: string;
    currency: string;
    autoRefreshSeconds: number;
    lowStockThreshold: number;
    requireMfa: boolean;
    enableAuditLog: boolean;
    emailAlerts: boolean;
    smsAlerts: boolean;
};

const SETTINGS_STORAGE_KEY = "admin:settings:v1";

const defaultSettings: AdminSettings = {
    cafeName: "AMIDOS Cafe",
    branchCode: "BR1",
    contactEmail: "admin@cafe.com",
    contactPhone: "+251-900-000-000",
    timezone: "Africa/Addis_Ababa",
    currency: "ETB",
    autoRefreshSeconds: 60,
    lowStockThreshold: 8,
    requireMfa: true,
    enableAuditLog: true,
    emailAlerts: true,
    smsAlerts: false
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");

function parseStoredSettings(value: string | null): AdminSettings {
    if (!value) {
        return defaultSettings;
    }

    try {
        const parsed = JSON.parse(value) as Partial<AdminSettings>;
        return {
            ...defaultSettings,
            ...parsed
        };
    } catch {
        return defaultSettings;
    }
}

export default function AdminSettingsPage() {
    const router = useRouter();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );
    const isAuthorized = useMemo(() => hydrated && requireRole("admin"), [hydrated]);
    const [settings, setSettings] = useState<AdminSettings>(() => {
        if (typeof window === "undefined") {
            return defaultSettings;
        }

        return parseStoredSettings(localStorage.getItem(SETTINGS_STORAGE_KEY));
    });
    const [toast, setToast] = useState<ToastState>(null);
    const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
    const [lastChecked, setLastChecked] = useState("");

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

    useEffect(() => {
        if (!isAuthorized) {
            return;
        }

        let cancelled = false;

        const checkHealth = async () => {
            setBackendStatus("checking");
            try {
                const response = await fetch(`${API_BASE_URL}/health`);
                if (!cancelled) {
                    setBackendStatus(response.ok ? "online" : "offline");
                    setLastChecked(
                        new Date().toLocaleTimeString("en-ET", {
                            hour: "2-digit",
                            minute: "2-digit"
                        })
                    );
                }
            } catch {
                if (!cancelled) {
                    setBackendStatus("offline");
                    setLastChecked(
                        new Date().toLocaleTimeString("en-ET", {
                            hour: "2-digit",
                            minute: "2-digit"
                        })
                    );
                }
            }
        };

        void checkHealth();
        const intervalId = window.setInterval(() => {
            void checkHealth();
        }, 60000);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [isAuthorized]);

    const statusVariant = useMemo(() => {
        if (backendStatus === "online") {
            return "success" as const;
        }
        if (backendStatus === "offline") {
            return "danger" as const;
        }
        return "warning" as const;
    }, [backendStatus]);

    const handleSaveSettings = () => {
        if (typeof window === "undefined") {
            return;
        }

        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        setToast({ type: "success", message: "Settings saved successfully." });
    };

    const handleResetDefaults = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(SETTINGS_STORAGE_KEY);
        }

        setSettings(defaultSettings);
        setToast({ type: "success", message: "Settings reset to defaults." });
    };

    if (!hydrated || !isAuthorized) {
        return <div className="min-h-screen bg-slate-950" aria-hidden="true" />;
    }

    return (
        <DashboardLayout role="admin">
            <div className="space-y-6">
                <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.95)]">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 h-52 bg-radial-[circle_at_top] from-cyan-500/20 to-transparent" />
                    <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Configuration</p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">System Settings</h1>
                            <p className="mt-1 text-sm text-slate-400">Control business defaults, security policies, and notification behavior.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge
                                label={backendStatus === "checking" ? "Checking Backend" : backendStatus === "online" ? "Backend Online" : "Backend Offline"}
                                variant={statusVariant}
                            />
                            <span className="text-xs text-slate-500">{lastChecked ? `Checked ${lastChecked}` : "Pending"}</span>
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

                <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
                    <Card title="Business Profile" description="Identity and contact defaults used across the dashboard.">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                                label="Cafe Name"
                                value={settings.cafeName}
                                onChange={(event) => setSettings((prev) => ({ ...prev, cafeName: event.target.value }))}
                            />
                            <Input
                                label="Branch Code"
                                value={settings.branchCode}
                                onChange={(event) => setSettings((prev) => ({ ...prev, branchCode: event.target.value }))}
                            />
                            <Input
                                label="Contact Email"
                                type="email"
                                value={settings.contactEmail}
                                onChange={(event) => setSettings((prev) => ({ ...prev, contactEmail: event.target.value }))}
                            />
                            <Input
                                label="Contact Phone"
                                value={settings.contactPhone}
                                onChange={(event) => setSettings((prev) => ({ ...prev, contactPhone: event.target.value }))}
                            />
                            <Input
                                label="Timezone"
                                value={settings.timezone}
                                onChange={(event) => setSettings((prev) => ({ ...prev, timezone: event.target.value }))}
                            />
                            <Input
                                label="Currency"
                                value={settings.currency}
                                onChange={(event) => setSettings((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                            />
                        </div>
                    </Card>

                    <Card title="System Status" description="Runtime connectivity and admin controls.">
                        <div className="space-y-3">
                            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 text-sm text-slate-300">
                                <p className="font-medium text-slate-100">Backend Health</p>
                                <p className="mt-1 text-xs text-slate-400">Live check against `/health` endpoint.</p>
                                <div className="mt-2">
                                    <Badge label={backendStatus} variant={statusVariant} />
                                </div>
                            </div>

                            <Button variant="secondary" fullWidth onClick={() => window.location.reload()}>
                                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                                Reload Dashboard
                            </Button>
                            <Button
                                variant="secondary"
                                fullWidth
                                onClick={() => {
                                    localStorage.removeItem("payments:lastOrderId");
                                    setToast({ type: "success", message: "Cached filters cleared." });
                                }}
                            >
                                <Server className="h-4 w-4" aria-hidden="true" />
                                Clear Cached Filters
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card title="Security & Compliance" description="Enforce operational safeguards.">
                        <div className="space-y-3 text-sm text-slate-300">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                Policy guardrails active
                            </div>
                            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5">
                                <span>Require MFA for admin users</span>
                                <input
                                    type="checkbox"
                                    checked={settings.requireMfa}
                                    onChange={(event) => setSettings((prev) => ({ ...prev, requireMfa: event.target.checked }))}
                                    className="h-4 w-4 rounded border-white/20 bg-slate-900"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5">
                                <span>Enable audit log tracking</span>
                                <input
                                    type="checkbox"
                                    checked={settings.enableAuditLog}
                                    onChange={(event) => setSettings((prev) => ({ ...prev, enableAuditLog: event.target.checked }))}
                                    className="h-4 w-4 rounded border-white/20 bg-slate-900"
                                />
                            </label>
                        </div>
                    </Card>

                    <Card title="Operational Defaults" description="Control refresh behavior and stock thresholds.">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Input
                                label="Auto Refresh (seconds)"
                                type="number"
                                min="10"
                                value={String(settings.autoRefreshSeconds)}
                                onChange={(event) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        autoRefreshSeconds: Math.max(10, Number(event.target.value) || 10)
                                    }))
                                }
                            />
                            <Input
                                label="Low Stock Threshold"
                                type="number"
                                min="1"
                                value={String(settings.lowStockThreshold)}
                                onChange={(event) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        lowStockThreshold: Math.max(1, Number(event.target.value) || 1)
                                    }))
                                }
                            />
                        </div>
                    </Card>
                </div>

                <Card title="Notification Preferences" description="Configure alert channels for operational events.">
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5 text-sm text-slate-300">
                            <span>Email alerts</span>
                            <input
                                type="checkbox"
                                checked={settings.emailAlerts}
                                onChange={(event) => setSettings((prev) => ({ ...prev, emailAlerts: event.target.checked }))}
                                className="h-4 w-4 rounded border-white/20 bg-slate-900"
                            />
                        </label>
                        <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5 text-sm text-slate-300">
                            <span>SMS alerts</span>
                            <input
                                type="checkbox"
                                checked={settings.smsAlerts}
                                onChange={(event) => setSettings((prev) => ({ ...prev, smsAlerts: event.target.checked }))}
                                className="h-4 w-4 rounded border-white/20 bg-slate-900"
                            />
                        </label>
                    </div>
                </Card>

                <Card
                    title="Apply Changes"
                    description="Save custom configuration for this browser session and future visits."
                    footer={
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={handleResetDefaults}>Reset Defaults</Button>
                            <Button onClick={handleSaveSettings}>
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                Save Settings
                            </Button>
                        </div>
                    }
                >
                    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/45 px-3 py-3 text-sm text-slate-300">
                        <SlidersHorizontal className="mt-0.5 h-4 w-4 text-cyan-300" aria-hidden="true" />
                        <p>
                            These settings are currently stored client-side for rapid iteration. They are structured so they can be
                            wired to a backend config endpoint later without changing the UI.
                        </p>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}
