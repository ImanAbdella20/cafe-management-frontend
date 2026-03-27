"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createPrice, getItemPrices } from "@/lib/api";
import type { AppRole, MenuItemWithPrice, Price } from "@/types/menu";

type ToastNotify = (type: "success" | "error", message: string) => void;

type PricesPanelProps = {
    role: AppRole;
    items: MenuItemWithPrice[];
    notify: ToastNotify;
};

function canManagePrices(role: AppRole) {
    return role === "admin" || role === "manager";
}

export default function PricesPanel({ role, items, notify }: PricesPanelProps) {
    const [selectedItemId, setSelectedItemId] = useState("");
    const [prices, setPrices] = useState<Price[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("ETB");

    const canManage = canManagePrices(role);

    useEffect(() => {
        if (!selectedItemId || !canManage) {
            setPrices([]);
            return;
        }

        const loadPrices = async () => {
            setLoading(true);
            try {
                const data = await getItemPrices(Number(selectedItemId));
                setPrices(data);
            } catch (error) {
                notify("error", error instanceof Error ? error.message : "Failed to load item prices.");
                setPrices([]);
            } finally {
                setLoading(false);
            }
        };

        void loadPrices();
    }, [canManage, notify, selectedItemId]);

    const sortedPrices = useMemo(() => {
        const safePrices = Array.isArray(prices) ? prices : [];
        return [...safePrices].sort(
            (a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
        );
    }, [prices]);

    const handleSubmit = async () => {
        const parsedAmount = Number(amount);
        if (!selectedItemId) {
            notify("error", "Please select an item.");
            return;
        }
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            notify("error", "Amount must be greater than zero.");
            return;
        }

        setSubmitting(true);
        try {
            await createPrice(Number(selectedItemId), {
                amount: parsedAmount,
                currency: currency.trim() || "ETB"
            });
            notify("success", "Price added. Previous active price is now inactive.");
            setAmount("");
            const refreshed = await getItemPrices(Number(selectedItemId));
            setPrices(refreshed);
        } catch (error) {
            notify("error", error instanceof Error ? error.message : "Failed to add price.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="space-y-4">
            <header>
                <h2 className="text-xl font-semibold text-slate-100">Prices</h2>
                <p className="text-sm text-slate-400">Track historical price changes and add new active prices.</p>
            </header>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="price-item" className="block text-sm font-medium text-slate-300">
                        Select Item
                    </label>
                    <select
                        id="price-item"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25"
                        value={selectedItemId}
                        onChange={(event) => setSelectedItemId(event.target.value)}
                    >
                        <option value="">Choose item</option>
                        {items.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!canManage ? (
                <p className="rounded-xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-400">
                    Prices are restricted to admin and manager roles.
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <Input
                        label="Amount"
                        type="number"
                        min="0"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        containerClassName="md:col-span-2"
                    />
                    <Input
                        label="Currency"
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                    />
                    <div className="flex items-end">
                        <Button fullWidth loading={submitting} onClick={handleSubmit}>
                            Add Price
                        </Button>
                    </div>
                </div>
            )}

            {loading ? <p className="text-sm text-slate-500">Loading prices...</p> : null}

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/45">
                <table className="min-w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                        <tr>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Currency</th>
                            <th className="px-4 py-3">Effective From</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedPrices.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                                    {selectedItemId ? "No prices found for this item." : "Select item to view prices."}
                                </td>
                            </tr>
                        ) : (
                            sortedPrices.map((price) => (
                                <tr key={price.id} className="border-t border-white/10 hover:bg-white/5">
                                    <td className="px-4 py-3">{price.amount.toLocaleString()}</td>
                                    <td className="px-4 py-3">{price.currency === "USD" ? "ETB" : price.currency}</td>
                                    <td className="px-4 py-3">{new Date(price.effective_from).toLocaleString()}</td>
                                    <td className="px-4 py-3">{price.is_active ? "Active" : "Inactive"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
