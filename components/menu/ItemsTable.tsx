"use client";

import { useState } from "react";
import MenuImageUploadField from "@/components/menu/MenuImageUploadField";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { createItem, deleteItem, updateItem } from "@/lib/api";
import { resolveMenuImageURL } from "@/lib/media";
import type { AppRole, Category, MenuItemWithPrice } from "@/types/menu";

type ToastNotify = (type: "success" | "error", message: string) => void;

type ItemsTableProps = {
    role: AppRole;
    items: MenuItemWithPrice[];
    categories: Category[];
    loading: boolean;
    onRefresh: () => Promise<void>;
    notify: ToastNotify;
};

function canManage(role: AppRole) {
    return role === "admin" || role === "manager";
}

type ItemImageCellProps = {
    name: string;
    imageURL: string;
};

function ItemImageCell({ name, imageURL }: ItemImageCellProps) {
    const [imageFailed, setImageFailed] = useState(false);
    const trimmedURL = resolveMenuImageURL(imageURL);
    const showImage = trimmedURL.length > 0 && !imageFailed;
    const initials = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "?";

    return (
        <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-slate-900/70">
            {showImage ? (
                // Use native image tag to avoid forcing external domain configuration for this table thumbnail.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={trimmedURL}
                    alt={`${name} item image`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-300">{initials}</div>
            )}
        </div>
    );
}

export default function ItemsTable({ role, items, categories, loading, onRefresh, notify }: ItemsTableProps) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<MenuItemWithPrice | null>(null);
    const [categoryID, setCategoryID] = useState("");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [currentImageURL, setCurrentImageURL] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const canEdit = canManage(role);
    const canDelete = role === "admin";

    const resetForm = () => {
        setCategoryID("");
        setName("");
        setDescription("");
        setCurrentImageURL("");
        setImageFile(null);
        setRemoveImage(false);
    };

    const handleCreate = async () => {
        const parsedCategoryID = Number(categoryID);
        if (!parsedCategoryID) {
            notify("error", "Please select a category.");
            return;
        }

        setSubmitting(true);
        try {
            const response = await createItem({
                category_id: parsedCategoryID,
                name: name.trim(),
                description: description.trim(),
                image: imageFile
            });
            notify("success", response.message || "Item added.");
            setCreateOpen(false);
            resetForm();
            await onRefresh();
        } catch (error) {
            notify("error", error instanceof Error ? error.message : "Failed to create item.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editTarget) {
            return;
        }

        setSubmitting(true);
        try {
            await updateItem(editTarget.id, {
                name: name.trim(),
                description: description.trim(),
                image: imageFile,
                remove_image: removeImage
            });
            notify("success", "Item updated.");
            setEditTarget(null);
            resetForm();
            await onRefresh();
        } catch (error) {
            notify("error", error instanceof Error ? error.message : "Failed to update item.");
        } finally {
            setSubmitting(false);
        }
    };

    const openEdit = (item: MenuItemWithPrice) => {
        setEditTarget(item);
        setName(item.name);
        setDescription(item.description);
        setCurrentImageURL(item.image_url ?? "");
        setImageFile(null);
        setRemoveImage(false);
    };

    return (
        <section className="space-y-4">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-100">Items</h2>
                    <p className="text-sm text-slate-400">Manage menu items and see active item prices.</p>
                </div>
                {canEdit ? <Button onClick={() => setCreateOpen(true)}>+ Add Item</Button> : null}
            </header>

            {loading ? <p className="text-sm text-slate-500">Loading items...</p> : null}

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/45">
                <table className="min-w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                        <tr>
                            <th className="w-16 px-4 py-3">Image</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3">Active Price</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                                    No items found.
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => (
                                <tr key={item.id} className="border-t border-white/10 hover:bg-white/5">
                                    <td className="px-4 py-3">
                                        <ItemImageCell name={item.name} imageURL={item.image_url ?? ""} />
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-100">{item.name}</td>
                                    <td className="px-4 py-3">{item.description || "-"}</td>
                                    <td className="px-4 py-3">{item.currency ? `${item.currency === "USD" ? "ETB" : item.currency} ${item.price.toLocaleString()}` : "-"}</td>
                                    <td className="px-4 py-3">{item.is_available ? "Available" : "Unavailable"}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            {canEdit ? (
                                                <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
                                                    Edit
                                                </Button>
                                            ) : null}
                                            {canDelete ? (
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={async () => {
                                                        const confirmed = window.confirm(`Delete item \"${item.name}\"? This action cannot be undone.`);
                                                        if (!confirmed) {
                                                            return;
                                                        }

                                                        try {
                                                            await deleteItem(item.id);
                                                            notify("success", "Item deleted.");
                                                            await onRefresh();
                                                        } catch (error) {
                                                            notify("error", error instanceof Error ? error.message : "Failed to delete item.");
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
                title="Add Item"
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
                    <div className="space-y-1.5">
                        <label htmlFor="item-category" className="block text-sm font-medium text-slate-300">
                            Category
                        </label>
                        <select
                            id="item-category"
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                            value={categoryID}
                            onChange={(event) => setCategoryID(event.target.value)}
                        >
                            <option value="">Select category</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
                    <Input label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
                    <MenuImageUploadField file={imageFile} onFileChange={setImageFile} />
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
                title="Edit Item"
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
                    <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
                    <Input label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
                    <MenuImageUploadField
                        file={imageFile}
                        currentImageURL={currentImageURL}
                        removeExisting={removeImage}
                        onFileChange={setImageFile}
                        onRemoveExistingChange={setRemoveImage}
                    />
                </div>
            </Modal>
        </section>
    );
}
