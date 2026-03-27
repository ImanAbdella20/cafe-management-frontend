"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import type { StaffRole } from "@/lib/api";

type AddStaffModalProps = {
    open: boolean;
    roles: StaffRole[];
    loading?: boolean;
    onClose: () => void;
    onSubmit: (payload: { name: string; email: string; password: string; role: StaffRole }) => Promise<void>;
};

export default function AddStaffModal({ open, roles, loading = false, onClose, onSubmit }: AddStaffModalProps) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<StaffRole>("staff");

    const availableRoles = useMemo<StaffRole[]>(() => (roles.length > 0 ? roles : ["staff"]), [roles]);
    const selectedRole = availableRoles.includes(role) ? role : availableRoles[0];

    const handleClose = () => {
        setName("");
        setEmail("");
        setPassword("");
        setRole(availableRoles[0] ?? "staff");
        onClose();
    };

    const handleSubmit = async () => {
        await onSubmit({
            name: name.trim(),
            email: email.trim(),
            password,
            role: selectedRole
        });
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Add Staff"
            description="Create a new employee account and assign initial role access."
            footer={
                <>
                    <Button variant="ghost" onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} loading={loading} disabled={loading}>
                        Submit
                    </Button>
                </>
            }
        >
            <div className="space-y-3">
                <Input
                    label="Full Name"
                    name="fullName"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ayele Shimeles"
                />
                <Input
                    label="Email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="ayele@cafe.com"
                />
                <Input
                    label="Password"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 chars, letters and numbers"
                />
                <div className="space-y-1.5">
                    <label htmlFor="role" className="block text-sm font-medium text-slate-300">
                        Role
                    </label>
                    <select
                        id="role"
                        value={selectedRole}
                        onChange={(event) => setRole(event.target.value as StaffRole)}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                    >
                        {availableRoles.map((currentRole) => (
                            <option key={currentRole} value={currentRole}>
                                {currentRole}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </Modal>
    );
}
