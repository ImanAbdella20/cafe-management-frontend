"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AddStaffModal from "@/components/staff/AddStaffModal";
import AssignShiftModal from "@/components/staff/AssignShiftModal";
import StaffTable from "@/components/staff/StaffTable";
import Button from "@/components/ui/Button";
import {
    assignStaffShift,
    createStaff,
    fetchRoles,
    fetchUsers,
    type StaffRole,
    type StaffUser,
    updateStaffRole,
    updateStaffStatus
} from "@/lib/api";

type ToastState = {
    type: "success" | "error";
    message: string;
} | null;

export default function StaffManagementSection() {
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [roles, setRoles] = useState<StaffRole[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [rowLoadingId, setRowLoadingId] = useState<number | null>(null);
    const [toast, setToast] = useState<ToastState>(null);
    const [shiftUser, setShiftUser] = useState<StaffUser | null>(null);
    const [shiftSubmitting, setShiftSubmitting] = useState(false);

    const showToast = useCallback((type: "success" | "error", message: string) => {
        setToast({ type, message });
    }, []);

    useEffect(() => {
        if (!toast) {
            return;
        }
        const timeout = window.setTimeout(() => setToast(null), 3000);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    const loadRoles = useCallback(async () => {
        try {
            const data = await fetchRoles();
            setRoles(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load roles.";
            showToast("error", message);
        }
    }, [showToast]);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const payload = await fetchUsers({ page, limit, role: roleFilter || undefined });
            setUsers(payload.data);
            setTotal(payload.pagination.total);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load users.";
            showToast("error", message);
        } finally {
            setLoading(false);
        }
    }, [limit, page, roleFilter, showToast]);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleCreateStaff = async (payload: { name: string; email: string; password: string; role: StaffRole }) => {
        setAddSubmitting(true);
        try {
            await createStaff(payload);
            showToast("success", "Staff member created.");
            setShowAddModal(false);
            await loadUsers();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to create staff.";
            showToast("error", message);
        } finally {
            setAddSubmitting(false);
        }
    };

    const handleToggleStatus = async (user: StaffUser, nextActive: boolean) => {
        setRowLoadingId(user.id);
        const previousUsers = users;
        setUsers((current) => current.map((row) => (row.id === user.id ? { ...row, is_active: nextActive } : row)));

        try {
            await updateStaffStatus({ id: user.id, is_active: nextActive });
            showToast("success", nextActive ? "Staff member activated." : "Staff member deactivated.");
        } catch (error) {
            setUsers(previousUsers);
            const message = error instanceof Error ? error.message : "Unable to update staff status.";
            showToast("error", message);
        } finally {
            setRowLoadingId(null);
        }
    };

    const handleEditRole = async (id: number, role: StaffRole) => {
        setRowLoadingId(id);
        try {
            await updateStaffRole({ id, role });
            setUsers((current) => current.map((user) => (user.id === id ? { ...user, role } : user)));
            showToast("success", "Role updated.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to update role.";
            showToast("error", message);
            throw error;
        } finally {
            setRowLoadingId(null);
        }
    };

    const handleAssignShift = async (payload: { shift_date: string; start_time: string; end_time: string }) => {
        if (!shiftUser) {
            return;
        }
        setShiftSubmitting(true);
        try {
            await assignStaffShift({
                id: shiftUser.id,
                shift_date: payload.shift_date,
                start_time: payload.start_time,
                end_time: payload.end_time
            });
            showToast("success", "Shift assigned successfully.");
            setShiftUser(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to assign shift.";
            showToast("error", message);
        } finally {
            setShiftSubmitting(false);
        }
    };

    const titleClass = useMemo(
        () =>
            toast?.type === "success"
                ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-100"
                : "border-rose-300/30 bg-rose-500/15 text-rose-100",
        [toast]
    );

    return (
        <section id="management" className="scroll-mt-20 space-y-6">
            <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.95)]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 h-52 bg-radial-[circle_at_top] from-cyan-500/20 to-transparent" />
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Team Operations</p>
                        <h2 id="staff-management" className="mt-1 text-2xl font-semibold text-slate-100 sm:text-3xl">Staff Management</h2>
                        <p className="mt-1 text-sm text-slate-400">Manage employees, role access, and shift schedules from one place.</p>
                    </div>
                    <Button onClick={() => setShowAddModal(true)}>+ Add Staff</Button>
                </div>
            </header>

            {toast ? (
                <div className={`fixed right-4 top-20 z-40 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${titleClass}`} role="status">
                    {toast.message}
                </div>
            ) : null}

            <StaffTable
                users={users}
                roles={roles}
                loading={loading}
                page={page}
                limit={limit}
                total={total}
                searchValue={searchValue}
                roleFilter={roleFilter}
                statusFilter={statusFilter}
                rowLoadingId={rowLoadingId}
                onSearchChange={setSearchValue}
                onRoleFilterChange={(value) => {
                    setPage(1);
                    setRoleFilter(value);
                }}
                onStatusFilterChange={setStatusFilter}
                onPageChange={setPage}
                onToggleActive={handleToggleStatus}
                onAssignShift={(user) => setShiftUser(user)}
                onEditRole={handleEditRole}
            />

            <AddStaffModal
                key={showAddModal ? "add-open" : "add-closed"}
                open={showAddModal}
                roles={roles}
                loading={addSubmitting}
                onClose={() => setShowAddModal(false)}
                onSubmit={handleCreateStaff}
            />

            <AssignShiftModal
                key={shiftUser ? `shift-${shiftUser.id}` : "shift-closed"}
                open={Boolean(shiftUser)}
                staffName={shiftUser?.name}
                loading={shiftSubmitting}
                onClose={() => setShiftUser(null)}
                onSubmit={handleAssignShift}
            />
        </section>
    );
}
