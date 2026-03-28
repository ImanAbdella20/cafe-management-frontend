"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import type { StaffRole, StaffUser } from "@/lib/api";

type StaffTableProps = {
    users: StaffUser[];
    roles: StaffRole[];
    loading?: boolean;
    page: number;
    limit: number;
    total: number;
    searchValue: string;
    roleFilter: string;
    statusFilter: "all" | "active" | "inactive";
    rowLoadingId?: number | null;
    onSearchChange: (value: string) => void;
    onRoleFilterChange: (value: string) => void;
    onStatusFilterChange: (value: "all" | "active" | "inactive") => void;
    onPageChange: (page: number) => void;
    onToggleActive: (user: StaffUser, nextActive: boolean) => Promise<void>;
    onAssignShift: (user: StaffUser) => void;
    onEditRole: (id: number, role: StaffRole) => Promise<void>;
};

const roleBadge: Record<string, "primary" | "warning" | "neutral"> = {
    admin: "primary",
    manager: "warning",
    cashier: "neutral",
    barista: "neutral",
    staff: "neutral"
};

export default function StaffTable({
    users,
    roles,
    loading = false,
    page,
    limit,
    total,
    searchValue,
    roleFilter,
    statusFilter,
    rowLoadingId = null,
    onSearchChange,
    onRoleFilterChange,
    onStatusFilterChange,
    onPageChange,
    onToggleActive,
    onAssignShift,
    onEditRole
}: StaffTableProps) {
    const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
    const [newRole, setNewRole] = useState<StaffRole>("staff");
    const [roleUpdating, setRoleUpdating] = useState(false);

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const search = searchValue.trim().toLowerCase();
            const matchesSearch = !search || [
                String(user.id),
                user.name,
                user.email,
                user.role,
                user.is_active ? "active" : "inactive",
                user.created_at,
                user.updated_at
            ].some((value) => value.toLowerCase().includes(search));
            const matchesRole = !roleFilter || user.role === roleFilter;
            const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? user.is_active : !user.is_active);
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, searchValue, roleFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

    const openRoleModal = (user: StaffUser) => {
        setEditingUser(user);
        setNewRole(user.role);
    };

    const handleSaveRole = async () => {
        if (!editingUser) {
            return;
        }
        setRoleUpdating(true);
        try {
            await onEditRole(editingUser.id, newRole);
            setEditingUser(null);
        } finally {
            setRoleUpdating(false);
        }
    };

    return (
        <>
            <Card title="Staff Directory" description="Search, filter, and manage employee access and shifts." className="rounded-2xl">
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Input
                        placeholder="Search by name or email"
                        aria-label="Search staff"
                        value={searchValue}
                        onChange={(event) => onSearchChange(event.target.value)}
                    />
                    <select
                        aria-label="Filter by role"
                        value={roleFilter}
                        onChange={(event) => onRoleFilterChange(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                    >
                        <option value="">All roles</option>
                        {roles.map((role) => (
                            <option key={role} value={role}>
                                {role}
                            </option>
                        ))}
                    </select>
                    <select
                        aria-label="Filter by status"
                        value={statusFilter}
                        onChange={(event) => onStatusFilterChange(event.target.value as "all" | "active" | "inactive")}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                    >
                        <option value="all">All status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {loading ? (
                    <div className="rounded-xl border border-white/10 bg-slate-950/45 px-4 py-8 text-center text-slate-400">
                        <span className="inline-flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-cyan-300" />
                            Loading staff...
                        </span>
                    </div>
                ) : (
                    <Table<StaffUser>
                        columns={[
                            { key: "name", header: "Full Name", className: "font-medium text-slate-100" },
                            { key: "email", header: "Email" },
                            {
                                key: "role",
                                header: "Role",
                                render: (value) => <Badge label={String(value)} variant={roleBadge[String(value)] ?? "neutral"} />
                            },
                            {
                                key: "is_active",
                                header: "Status",
                                render: (value) => (
                                    <Badge label={value ? "Active" : "Inactive"} variant={value ? "success" : "danger"} />
                                )
                            },
                            {
                                key: "id",
                                header: "Actions",
                                render: (_, user) => (
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => openRoleModal(user)} disabled={rowLoadingId === user.id}>
                                            Edit Role
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={user.is_active ? "danger" : "secondary"}
                                            loading={rowLoadingId === user.id}
                                            onClick={async () => {
                                                if (user.is_active) {
                                                    const confirmed = window.confirm(`Deactivate ${user.name}?`);
                                                    if (!confirmed) {
                                                        return;
                                                    }
                                                }
                                                await onToggleActive(user, !user.is_active);
                                            }}
                                        >
                                            {user.is_active ? "Deactivate" : "Activate"}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => onAssignShift(user)} disabled={rowLoadingId === user.id}>
                                            Assign Shift
                                        </Button>
                                    </div>
                                )
                            }
                        ]}
                        data={filteredUsers}
                        rowKey={(user) => String(user.id)}
                        emptyState="No staff found for current filters."
                    />
                )}

                <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                            Previous
                        </Button>
                        <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
                            Next
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {pages.map((pageNumber) => (
                            <button
                                key={pageNumber}
                                type="button"
                                aria-label={`Go to page ${pageNumber}`}
                                onClick={() => onPageChange(pageNumber)}
                                className={`h-8 min-w-8 rounded-lg border px-2 text-xs font-medium transition ${pageNumber === page
                                    ? "border-indigo-300/30 bg-indigo-500/20 text-indigo-100"
                                    : "border-white/10 bg-slate-950/60 text-slate-300 hover:bg-white/10"
                                    }`}
                            >
                                {pageNumber}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            <Modal
                open={Boolean(editingUser)}
                onClose={() => setEditingUser(null)}
                title="Edit Role"
                description={editingUser ? `Update role for ${editingUser.name}.` : "Update user role."}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setEditingUser(null)} disabled={roleUpdating}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveRole} loading={roleUpdating} disabled={roleUpdating}>
                            Save
                        </Button>
                    </>
                }
            >
                <div className="space-y-1.5">
                    <label htmlFor="edit-role-select" className="block text-sm font-medium text-slate-300">
                        Role
                    </label>
                    <select
                        id="edit-role-select"
                        value={newRole}
                        onChange={(event) => setNewRole(event.target.value as StaffRole)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                    >
                        {roles.map((role) => (
                            <option key={role} value={role}>
                                {role}
                            </option>
                        ))}
                    </select>
                </div>
            </Modal>
        </>
    );
}
