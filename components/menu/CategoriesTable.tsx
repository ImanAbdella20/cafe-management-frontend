"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { createCategory, deleteCategory, updateCategory } from "@/lib/api";
import type { AppRole, Category } from "@/types/menu";

type ToastNotify = (type: "success" | "error", message: string) => void;

type CategoriesTableProps = {
    role: AppRole;
    categories: Category[];
    loading: boolean;
    onRefresh: () => Promise<void>;
    notify: ToastNotify;
};

function canManage(role: AppRole) {
    return role === "admin" || role === "manager";
}

export default function CategoriesTable({ role, categories, loading, onRefresh, notify }: CategoriesTableProps) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Category | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    const canEdit = canManage(role);
    const canDelete = role === "admin";

    const resetForm = () => {
        setName("");
        setDescription("");
        setFormError("");
    };

    const handleCreate = async () => {
        const trimmedName = name.trim();
        const trimmedDescription = description.trim();

        if (!trimmedName) {
            setFormError("Category name is required.");
            notify("error", "Category name is required.");
            return;
        }

        setFormError("");
        setSubmitting(true);
        try {
            await createCategory({ name: trimmedName, description: trimmedDescription });
            notify("success", "Category created.");
            setCreateOpen(false);
            resetForm();
            await onRefresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create category.";
            setFormError(message);
            notify("error", message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editTarget) {
            return;
        }

        const trimmedName = name.trim();
        const trimmedDescription = description.trim();

        if (!trimmedName) {
            setFormError("Category name is required.");
            notify("error", "Category name is required.");
            return;
        }

        setFormError("");
        setSubmitting(true);
        try {
            await updateCategory(editTarget.id, { name: trimmedName, description: trimmedDescription });
            notify("success", "Category updated.");
            setEditTarget(null);
            resetForm();
            await onRefresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update category.";
            setFormError(message);
            notify("error", message);
        } finally {
            setSubmitting(false);
        }
    };

    const openEdit = (category: Category) => {
        setFormError("");
        setEditTarget(category);
        setName(category.name);
        setDescription(category.description);
    };

    return (
        <section className="space-y-4">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-100">Categories</h2>
                    <p className="text-sm text-slate-400">Table listing categories with create, edit, and delete actions.</p>
                </div>
                {canEdit ? <Button onClick={() => {
                    resetForm();
                    setCreateOpen(true);
                }}>+ Add Category</Button> : null}
            </header>

            {loading ? <p className="text-sm text-slate-500">Loading categories...</p> : null}

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/45">
                <table className="min-w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                        <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                                    No categories found.
                                </td>
                            </tr>
                        ) : (
                            categories.map((category) => (
                                <tr key={category.id} className="border-t border-white/10 hover:bg-white/5">
                                    <td className="px-4 py-3">{category.name}</td>
                                    <td className="px-4 py-3">{category.description || "-"}</td>
                                    <td className="px-4 py-3">{category.is_active ? "Active" : "Inactive"}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            {canEdit ? (
                                                <Button size="sm" variant="secondary" onClick={() => openEdit(category)}>
                                                    Edit
                                                </Button>
                                            ) : null}
                                            {canDelete ? (
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={async () => {
                                                        const confirmed = window.confirm(`Delete category \"${category.name}\"? This action cannot be undone.`);
                                                        if (!confirmed) {
                                                            return;
                                                        }

                                                        try {
                                                            await deleteCategory(category.id);
                                                            notify("success", "Category deleted.");
                                                            await onRefresh();
                                                        } catch (error) {
                                                            notify("error", error instanceof Error ? error.message : "Failed to delete category.");
                                                        }
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                open={createOpen}
                onClose={() => {
                    if (!submitting) {
                        setCreateOpen(false);
                        resetForm();
                    }
                }}
                title="Add Category"
                footer={
                    <>
                        <Button variant="secondary" disabled={submitting} onClick={() => setCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button loading={submitting} onClick={handleCreate}>
                            Save
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    {formError ? <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{formError}</p> : null}
                    <Input label="Name" value={name} error={formError && !name.trim() ? formError : undefined} onChange={(event) => {
                        if (formError) {
                            setFormError("");
                        }
                        setName(event.target.value);
                    }} />
                    <Input label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
                </div>
            </Modal>

            <Modal
                open={Boolean(editTarget)}
                onClose={() => {
                    if (!submitting) {
                        setEditTarget(null);
                        resetForm();
                    }
                }}
                title="Edit Category"
                footer={
                    <>
                        <Button variant="secondary" disabled={submitting} onClick={() => setEditTarget(null)}>
                            Cancel
                        </Button>
                        <Button loading={submitting} onClick={handleUpdate}>
                            Update
                        </Button>
                    </>
                }
            >
                <div className="space-y-3">
                    {formError ? <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{formError}</p> : null}
                    <Input label="Name" value={name} error={formError && !name.trim() ? formError : undefined} onChange={(event) => {
                        if (formError) {
                            setFormError("");
                        }
                        setName(event.target.value);
                    }} />
                    <Input label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
                </div>
            </Modal>
        </section>
    );
}
