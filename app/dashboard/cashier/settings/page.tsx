"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, RefreshCcw, SlidersHorizontal } from "lucide-react";
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

type CashierSettings = {
    autoRefreshSeconds: number;
    receiptPrinterName: string;
    receiptCopies: number;
    defaultPaymentMethod: "cash" | "card" | "mobile";
    soundOnPaymentSuccess: boolean;
    showOrderNotesByDefault: boolean;
    requireRefundReason: boolean;
    shiftReminderMinutes: number;
};

const STORAGE_KEY = "cashier:settings:v1";

const defaultSettings: CashierSettings = {
    autoRefreshSeconds: 60,
    receiptPrinterName: "Front Counter Printer",
    receiptCopies: 1,
    defaultPaymentMethod: "cash",
    soundOnPaymentSuccess: true,
    showOrderNotesByDefault: true,
    requireRefundReason: true,
    shiftReminderMinutes: 20
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");

function parseStoredSettings(value: string | null): CashierSettings {
    if (!value) {
        return defaultSettings;
    }

    try {
        const parsed = JSON.parse(value) as Partial<CashierSettings>;
        return {
            ...defaultSettings,
            ...parsed
        };
    } catch {
        return defaultSettings;
    }
}

export default function CashierSettingsPage() {
    const router = useRouter();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );
    const isAuthorized = useMemo(() => hydrated && requireRole("cashier"), [hydrated]);

    const [settings, setSettings] = useState<CashierSettings>(() => {
        if (typeof window === "undefined") {
            return defaultSettings;
        }

        return parseStoredSettings(localStorage.getItem(STORAGE_KEY));
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

        const timeout = window.setTimeout(() => setToast(null), 3000);
        return () => window.clearTimeout(timeout);
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
        setToast({ type: "success", message: "Cashier settings saved." });
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
        <DashboardLayout role="cashier">
            <div className="space-y-6">
                <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.95)]">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 h-52 bg-radial-[circle_at_top] from-cyan-500/20 to-transparent" />
                    <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Cashier Hub</p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">Settings</h1>
                            <p className="mt-1 text-sm text-slate-400">Configure your checkout station behavior and shift defaults.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge label={backendStatus} variant={statusVariant} />
                            <span className="text-xs text-slate-500">{lastChecked ? `Checked ${lastChecked}` : "Checking"}</span>
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

                <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                    <Card title="Checkout Preferences" description="Saved per browser for cashier workspace.">
                        <div className="grid gap-3 sm:grid-cols-2">
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
                                label="Receipt Printer"
                                value={settings.receiptPrinterName}
                                onChange={(event) => setSettings((previous) => ({ ...previous, receiptPrinterName: event.target.value }))}
                            />
                            <Input
                                label="Receipt Copies"
                                type="number"
                                min="1"
                                max="4"
                                value={String(settings.receiptCopies)}
                                onChange={(event) =>
                                    setSettings((previous) => ({
                                        ...previous,
                                        receiptCopies: Math.min(4, Math.max(1, Number(event.target.value) || 1))
                                    }))
                                }
                            />

                            <label className="space-y-1.5 text-sm font-medium text-slate-300">
                                <span>Default Payment Method</span>
                                <select
                                    value={settings.defaultPaymentMethod}
                                    onChange={(event) =>
                                        setSettings((previous) => ({
                                            ...previous,
                                            defaultPaymentMethod: event.target.value as CashierSettings["defaultPaymentMethod"]
                                        }))
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="mobile">Mobile</option>
                                </select>
                            </label>
                        </div>

                        <div className="mt-4 space-y-3 text-sm text-slate-300">
                            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5">
                                <span>Play sound on successful payment</span>
                                <input
                                    type="checkbox"
                                    checked={settings.soundOnPaymentSuccess}
                                    onChange={(event) => setSettings((previous) => ({ ...previous, soundOnPaymentSuccess: event.target.checked }))}
                                    className="h-4 w-4 rounded border-white/20 bg-slate-900"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5">
                                <span>Show order notes by default</span>
                                <input
                                    type="checkbox"
                                    checked={settings.showOrderNotesByDefault}
                                    onChange={(event) => setSettings((previous) => ({ ...previous, showOrderNotesByDefault: event.target.checked }))}
                                    className="h-4 w-4 rounded border-white/20 bg-slate-900"
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2.5">
                                <span>Require reason before refund action</span>
                                <input
                                    type="checkbox"
                                    checked={settings.requireRefundReason}
                                    onChange={(event) => setSettings((previous) => ({ ...previous, requireRefundReason: event.target.checked }))}
                                    className="h-4 w-4 rounded border-white/20 bg-slate-900"
                                />
                            </label>
                        </div>
                    </Card>

                    <Card title="Station Controls" description="Quick actions for your cashier terminal.">
                        <div className="space-y-3">
                            <Button variant="secondary" fullWidth onClick={() => window.location.reload()}>
                                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                                Reload Workspace
                            </Button>
                            <Button
                                variant="secondary"
                                fullWidth
                                onClick={() => {
                                    localStorage.removeItem("payments:lastOrderId");
                                    setToast({ type: "success", message: "Cached payment filters cleared." });
                                }}
                            >
                                <Bell className="h-4 w-4" aria-hidden="true" />
                                Clear Payment Filters
                            </Button>
                            <Button variant="secondary" fullWidth onClick={() => router.push("/dashboard/cashier/refunds")}>
                                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                                Open Refund Workspace
                            </Button>
                        </div>
                    </Card>
                </div>

                <Card
                    title="Apply Changes"
                    description="Save local cashier defaults for faster shift startup."
                    footer={
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleSave}>
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                Save Settings
                            </Button>
                            <Button variant="secondary" onClick={handleReset}>Reset Defaults</Button>
                        </div>
                    }
                >
                    <p className="text-sm text-slate-300">
                        Settings are stored locally in this browser and can be promoted to backend profile settings later.
                    </p>
                </Card>
            </div>
        </DashboardLayout>
    );
}
