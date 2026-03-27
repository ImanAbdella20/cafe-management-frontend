"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, RefreshCcw, Settings2, SlidersHorizontal } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { getBranchIdFromToken, requireRole } from "@/lib/auth";

type ToastState = {
    type: "success" | "error";
    message: string;
} | null;

type BackendStatus = "checking" | "online" | "offline";

type ManagerSettings = {
    preferredLanding: "overview" | "orders" | "payments";
    autoRefreshSeconds: number;
    shiftReminderMinutes: number;
    compactTables: boolean;
    lowStockAlerts: boolean;
    queueSoundAlerts: boolean;
    dailyDigestEmail: string;
};

const STORAGE_KEY = "manager:settings:v1";

const defaultSettings: ManagerSettings = {
    preferredLanding: "overview",
    autoRefreshSeconds: 60,
    shiftReminderMinutes: 30,
    compactTables: false,
    lowStockAlerts: true,
    queueSoundAlerts: false,
    dailyDigestEmail: ""
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");

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

function parseStoredSettings(value: string | null): ManagerSettings {
    if (!value) {
        return defaultSettings;
    }

    try {
        const parsed = JSON.parse(value) as Partial<ManagerSettings>;
        return {
            ...defaultSettings,
            ...parsed
        };
    } catch {
        return defaultSettings;
    }
}

export default function ManagerSettingsPage() {
    const router = useRouter();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );
    const isAuthorized = useMemo(() => hydrated && requireRole("manager"), [hydrated]);

    const [settings, setSettings] = useState<ManagerSettings>(() => {
        if (typeof window === "undefined") {
            return defaultSettings;
        }

        return parseStoredSettings(localStorage.getItem(STORAGE_KEY));
    });
    const [toast, setToast] = useState<ToastState>(null);
    const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
    const [lastChecked, setLastChecked] = useState("");
    const [branchId, setBranchId] = useState("");

    useEffect(() => {
        if (hydrated && !isAuthorized) {
            router.replace("/login");
        }
    }, [hydrated, isAuthorized, router]);

    useEffect(() => {
        if (!toast) {
            return;
        }

        const timeout = window.setTimeout(() => setToast(null), 3000);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    useEffect(() => {
        if (!isAuthorized) {
            return;
        }

        const token = getActiveToken();
        setBranchId(getBranchIdFromToken(token) || "not-set");
    }, [isAuthorized]);

    useEffect(() => {
        if (!isAuthorized) {
            return;
        }

        let cancelled = false;

        const checkHealth = async () => {
            setBackendStatus("checking");
            try {
                const response = await fetch(`${API_BASE_URL}/health`);
                if (cancelled) {
                    return;
                }

                setBackendStatus(response.ok ? "online" : "offline");
            } catch {
                if (cancelled) {
                    return;
                }
                setBackendStatus("offline");
            } finally {
                if (!cancelled) {
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

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        setToast({ type: "success", message: "Manager settings saved." });
    };

    const handleReset = () => {
        localStorage.removeItem(STORAGE_KEY);
        setSettings(defaultSettings);
        setToast({ type: "success", message: "Settings reset to defaults." });
    };

    if (!hydrated || !isAuthorized) {
        return <div className="min-h-screen bg-slate-950" aria-hidden="true" />;
    }

    return (
        <DashboardLayout role="manager">
            <div className="space-y-6">
                <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.95)]">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 h-52 bg-radial-[circle_at_top] from-cyan-500/20 to-transparent" />
                    <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Manager Hub</p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">Settings</h1>
                            <p className="mt-1 text-sm text-slate-400">Tune workflow defaults, alerts, and manager operations profile.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge label={backendStatus} variant={statusVariant} />
                            <span className="text-xs text-slate-500">{lastChecked ? `Checked ${lastChecked}` : "Checking"}</span>
                        </div>
                    </div>
                </header>

                {toast ? (
                    <div
                        className={`fixed right-4 top-20 z-60 rounded-xl border px-4 py-3 text-sm font-medium ${toast.type === "success"
                            ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-100"
                            : "border-rose-300/30 bg-rose-500/15 text-rose-100"
                            }`}
                        role="status"
                        aria-live="polite"
                    >
                        {toast.message}
                    </div>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                    <Card title="Workspace Preferences" description="Manager-level defaults persisted in browser storage.">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-1.5 text-sm font-medium text-slate-300">
                                <span>Preferred Landing</span>
                                <select
                                    value={settings.preferredLanding}
                                    onChange={(event) =>
                                        setSettings((previous) => ({
                                            ...previous,
                                            preferredLanding: event.target.value as ManagerSettings["preferredLanding"]
                                        }))
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                                >
                                    <option value="overview">Overview</option>
                                    <option value="orders">Orders</option>
                                    <option value="payments">Payments</option>
                                </select>
                            </label>
                            <Input
                                label="Auto Refresh (seconds)"
                                type="number"
                                min="10"
                                value={String(settings.autoRefreshSeconds)}
                                onChange={(event) =>
                                    setSettings((previous) => ({
                                        ...previous,
                                        autoRefreshSeconds: Math.max(10, Number(event.target.value) || 10)
                                    }))
                                }
                            />
                            <Input
                                label="Shift Reminder (minutes)"
                                type="number"
                                min="5"
                                value={String(settings.shiftReminderMinutes)}
                                onChange={(event) =>
                                    setSettings((previous) => ({
                                        ...previous,
                                        shiftReminderMinutes: Math.max(5, Number(event.target.value) || 5)
                                    }))
                                }
                            />
                            <Input
                                label="Daily Digest Email"
                                type="email"
                                value={settings.dailyDigestEmail}
                                onChange={(event) => setSettings((previous) => ({ ...previous, dailyDigestEmail: event.target.value }))}
                                placeholder="manager@cafe.com"
                            />
                        </div>

                        <div className="mt-4 space-y-3 text-sm text-slate-300">
                            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5">
                                <span>Compact table density</span>
                                <input
                                    type="checkbox"
                                    checked={settings.compactTables}
                                    onChange={(event) => setSettings((previous) => ({ ...previous, compactTables: event.target.checked }))}
                                    className="h-4 w-4 rounded border-white/20 bg-slate-900"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5">
                                <span>Low stock alerts</span>
                                <input
                                    type="checkbox"
                                    checked={settings.lowStockAlerts}
                                    onChange={(event) => setSettings((previous) => ({ ...previous, lowStockAlerts: event.target.checked }))}
                                    className="h-4 w-4 rounded border-white/20 bg-slate-900"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5">
                                <span>Queue sound alerts</span>
                                <input
                                    type="checkbox"
                                    checked={settings.queueSoundAlerts}
                                    onChange={(event) => setSettings((previous) => ({ ...previous, queueSoundAlerts: event.target.checked }))}
                                    className="h-4 w-4 rounded border-white/20 bg-slate-900"
                                />
                            </label>
                        </div>
                    </Card>

                    <Card title="Runtime Controls" description="Operational utilities and environment checks.">
                        <div className="space-y-3">
                            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 text-sm text-slate-300">
                                <p className="font-medium text-slate-100">Branch Claim</p>
                                <p className="mt-1 text-xs text-slate-400">Decoded from your auth token.</p>
                                <p className="mt-2 inline-flex rounded-lg bg-white/5 px-2 py-1 font-mono text-xs text-slate-200">{branchId}</p>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3 text-sm text-slate-300">
                                <p className="font-medium text-slate-100">Backend Health</p>
                                <p className="mt-1 text-xs text-slate-400">Polled from /health endpoint.</p>
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
                                    setToast({ type: "success", message: "Manager cache cleared." });
                                }}
                            >
                                <Settings2 className="h-4 w-4" aria-hidden="true" />
                                Clear Saved Filters
                            </Button>
                        </div>
                    </Card>
                </div>

                <Card
                    title="Apply Changes"
                    description="Save your manager workspace profile and keep operations consistent."
                    footer={
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleSave}>
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                Save Settings
                            </Button>
                            <Button variant="secondary" onClick={handleReset}>
                                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                                Reset Defaults
                            </Button>
                            <Button variant="secondary" onClick={() => router.push("/dashboard/manager/reports")}>
                                <Bell className="h-4 w-4" aria-hidden="true" />
                                Review Reports
                            </Button>
                        </div>
                    }
                >
                    <p className="text-sm text-slate-300">
                        These preferences are manager-scoped and saved locally for now. Operational metrics still come from live backend data.
                    </p>
                </Card>
            </div>
        </DashboardLayout>
    );
}
