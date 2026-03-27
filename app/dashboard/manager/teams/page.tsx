"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, RefreshCcw, Users } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Table from "@/components/ui/Table";
import { assignStaffShift, fetchShiftsByUser, fetchUsers, updateStaffStatus, type Shift, type StaffUser } from "@/lib/api";
import { requireRole } from "@/lib/auth";

type ToastState = {
    type: "success" | "error";
    message: string;
} | null;

type TeamRow = StaffUser & {
    status_label: string;
};

function formatDateTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
}

async function fetchAllUsers(): Promise<StaffUser[]> {
    const users: StaffUser[] = [];
    const pageSize = 100;
    let page = 1;
    let total = Number.POSITIVE_INFINITY;

    while (users.length < total && page <= 30) {
        const response = await fetchUsers({ page, limit: pageSize });
        users.push(...response.data);
        total = response.pagination.total;

        if (response.data.length < pageSize) {
            break;
        }

        page += 1;
    }

    return users;
}

export default function ManagerTeamsPage() {
    const router = useRouter();
    const hydrated = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false
    );
    const isAuthorized = useMemo(() => hydrated && requireRole("manager"), [hydrated]);

    const [users, setUsers] = useState<StaffUser[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedUserShifts, setSelectedUserShifts] = useState<Shift[]>([]);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);

    const [shiftDate, setShiftDate] = useState("");
    const [shiftStart, setShiftStart] = useState("08:00");
    const [shiftEnd, setShiftEnd] = useState("16:00");

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

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAllUsers();
            setUsers(data.filter((entry) => entry.role !== "admin"));
            if (!selectedUserId && data.length > 0) {
                setSelectedUserId(data[0].id);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load team members.";
            setToast({ type: "error", message });
        } finally {
            setLoading(false);
        }
    }, [selectedUserId]);

    const loadSelectedUserShifts = useCallback(async (userId: number) => {
        try {
            const data = await fetchShiftsByUser(userId);
            setSelectedUserShifts(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load shifts.";
            setToast({ type: "error", message });
            setSelectedUserShifts([]);
        }
    }, []);

    useEffect(() => {
        if (!isAuthorized) {
            return;
        }

        void loadUsers();
    }, [isAuthorized, loadUsers]);

    useEffect(() => {
        if (!isAuthorized || !selectedUserId) {
            return;
        }

        void loadSelectedUserShifts(selectedUserId);
    }, [isAuthorized, loadSelectedUserShifts, selectedUserId]);

    const filteredUsers = useMemo(() => {
        return users
            .filter((entry) => {
                if (roleFilter !== "all" && entry.role !== roleFilter) {
                    return false;
                }

                if (statusFilter === "active" && !entry.is_active) {
                    return false;
                }

                if (statusFilter === "inactive" && entry.is_active) {
                    return false;
                }

                if (search.trim()) {
                    const term = search.trim().toLowerCase();
                    return entry.name.toLowerCase().includes(term) || entry.email.toLowerCase().includes(term);
                }

                return true;
            })
            .map((entry) => ({ ...entry, status_label: entry.is_active ? "active" : "inactive" }));
    }, [roleFilter, search, statusFilter, users]);

    const teamRows = useMemo<TeamRow[]>(() => filteredUsers, [filteredUsers]);

    const selectedUser = useMemo(() => users.find((entry) => entry.id === selectedUserId) ?? null, [selectedUserId, users]);

    const roleSummary = useMemo(() => {
        const roles: Array<StaffUser["role"]> = ["manager", "cashier", "barista", "staff"];
        return roles.map((role) => {
            const members = users.filter((entry) => entry.role === role);
            const active = members.filter((entry) => entry.is_active).length;
            return { role, active, total: members.length };
        });
    }, [users]);

    const handleToggleActive = async (user: StaffUser) => {
        setBusy(true);
        try {
            await updateStaffStatus({ id: user.id, is_active: !user.is_active });
            setUsers((previous) => previous.map((entry) => (entry.id === user.id ? { ...entry, is_active: !entry.is_active } : entry)));
            setToast({ type: "success", message: `${user.name} is now ${user.is_active ? "inactive" : "active"}.` });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update staff status.";
            setToast({ type: "error", message });
        } finally {
            setBusy(false);
        }
    };

    const handleAssignShift = async () => {
        if (!selectedUser) {
            setToast({ type: "error", message: "Select a staff member first." });
            return;
        }

        if (!shiftDate.trim()) {
            setToast({ type: "error", message: "Shift date is required." });
            return;
        }

        setBusy(true);
        try {
            await assignStaffShift({
                id: selectedUser.id,
                shift_date: shiftDate,
                start_time: shiftStart,
                end_time: shiftEnd
            });
            setToast({ type: "success", message: `Shift assigned to ${selectedUser.name}.` });
            await loadSelectedUserShifts(selectedUser.id);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to assign shift.";
            setToast({ type: "error", message });
        } finally {
            setBusy(false);
        }
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
                            <h1 className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">Teams</h1>
                            <p className="mt-1 text-sm text-slate-400">Staff coverage, activation controls, and quick shift scheduling.</p>
                        </div>
                        <Button variant="secondary" loading={loading} onClick={() => void loadUsers()}>
                            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                            Refresh Team
                        </Button>
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

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {roleSummary.map((entry) => (
                        <Card key={entry.role} title={entry.role.charAt(0).toUpperCase() + entry.role.slice(1)}>
                            <div className="inline-flex items-center gap-2 text-slate-200">
                                <Users className="h-4 w-4" aria-hidden="true" />
                                <span className="text-2xl font-semibold text-slate-100">{entry.active}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">active of {entry.total}</p>
                        </Card>
                    ))}
                </div>

                <Card title="Team Directory" description="Filter and manage staff availability.">
                    <div className="mb-4 grid gap-3 md:grid-cols-4">
                        <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" />
                        <label className="space-y-1.5 text-sm font-medium text-slate-300">
                            <span>Role</span>
                            <select
                                value={roleFilter}
                                onChange={(event) => setRoleFilter(event.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                            >
                                <option value="all">All roles</option>
                                <option value="manager">Manager</option>
                                <option value="cashier">Cashier</option>
                                <option value="barista">Barista</option>
                                <option value="staff">Staff</option>
                            </select>
                        </label>
                        <label className="space-y-1.5 text-sm font-medium text-slate-300">
                            <span>Status</span>
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                            >
                                <option value="all">All statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </label>
                        <div className="flex items-end">
                            <Button variant="secondary" fullWidth onClick={() => {
                                setSearch("");
                                setRoleFilter("all");
                                setStatusFilter("all");
                            }}>
                                Clear Filters
                            </Button>
                        </div>
                    </div>

                    <Table<TeamRow>
                        columns={[
                            {
                                key: "name",
                                header: "Name",
                                render: (value, row) => (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedUserId(row.id)}
                                        className="text-left text-indigo-200 transition hover:text-indigo-100"
                                    >
                                        {String(value ?? "-")}
                                    </button>
                                )
                            },
                            { key: "email", header: "Email" },
                            { key: "role", header: "Role", render: (value) => <span className="capitalize">{String(value ?? "-")}</span> },
                            {
                                key: "status_label",
                                header: "Status",
                                render: (value) => <Badge label={String(value ?? "-")} variant={String(value) === "active" ? "success" : "danger"} />
                            },
                            {
                                key: "id",
                                header: "Actions",
                                render: (_, row) => (
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => setSelectedUserId(row.id)}>
                                            Select
                                        </Button>
                                        <Button size="sm" onClick={() => void handleToggleActive(row)} disabled={busy}>
                                            {row.is_active ? "Deactivate" : "Activate"}
                                        </Button>
                                    </div>
                                )
                            }
                        ]}
                        data={teamRows}
                        rowKey={(row) => String(row.id)}
                        emptyState={loading ? "Loading team..." : "No team members found."}
                    />
                </Card>

                <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
                    <Card title="Shift Scheduler" description="Assign shifts to selected team member.">
                        <div className="space-y-3">
                            <Input label="Selected Member" value={selectedUser ? `${selectedUser.name} (${selectedUser.role})` : ""} readOnly />
                            <Input label="Shift Date" type="date" value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Input label="Start" type="time" value={shiftStart} onChange={(event) => setShiftStart(event.target.value)} />
                                <Input label="End" type="time" value={shiftEnd} onChange={(event) => setShiftEnd(event.target.value)} />
                            </div>
                            <Button loading={busy} onClick={() => void handleAssignShift()} disabled={!selectedUser}>
                                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                                Assign Shift
                            </Button>
                        </div>
                    </Card>

                    <Card title="Recent Shifts" description="Shifts for the selected team member.">
                        <Table<Shift>
                            columns={[
                                { key: "shift_date", header: "Date" },
                                { key: "start_time", header: "Start" },
                                { key: "end_time", header: "End" },
                                { key: "created_at", header: "Assigned", render: (value) => formatDateTime(String(value ?? "")) }
                            ]}
                            data={selectedUserShifts}
                            rowKey={(row) => String(row.id)}
                            emptyState={selectedUser ? "No shifts found for this team member." : "Select a team member to view shifts."}
                        />
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
