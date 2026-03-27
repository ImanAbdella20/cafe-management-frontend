"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";

type TicketRow = {
    id: string;
    orderNo: string;
    items: string;
    total: string;
};

const queue: Array<TicketRow> = [
    { id: "T1", orderNo: "#1001", items: "2 Latte, 1 Muffin", total: "ETB 16.50" },
    { id: "T2", orderNo: "#1002", items: "1 Americano", total: "ETB 4.50" },
    { id: "T3", orderNo: "#1003", items: "1 Cappuccino, 1 Croissant", total: "ETB 11.00" }
];

export default function CashierView() {
    const [open, setOpen] = useState(false);
    const [customer, setCustomer] = useState("");

    const ticketCount = useMemo(() => queue.length, []);

    return (
        <div className="space-y-6">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card title="Open Tickets">
                    <p className="text-2xl font-semibold text-zinc-900">{ticketCount}</p>
                </Card>
                <Card title="Cash Drawer">
                    <p className="text-2xl font-semibold text-zinc-900">ETB 532.00</p>
                </Card>
                <Card title="Avg Checkout Time">
                    <p className="text-2xl font-semibold text-zinc-900">1m 42s</p>
                </Card>
            </section>

            <Card
                title="Live Queue"
                description="Current orders waiting for payment"
                footer={
                    <Button onClick={() => setOpen(true)} size="sm">
                        New Order
                    </Button>
                }
            >
                <Table<TicketRow>
                    columns={[
                        { key: "orderNo", header: "Order" },
                        { key: "items", header: "Items" },
                        { key: "total", header: "Total" }
                    ]}
                    data={queue}
                    rowKey={(row) => row.id}
                />
            </Card>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title="Create New Ticket"
                description="Capture basic payment details before sending order to the barista queue."
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => setOpen(false)}>Save Ticket</Button>
                    </>
                }
            >
                <div className="space-y-3">
                    <Input
                        label="Customer Name"
                        placeholder="Walk-in customer"
                        value={customer}
                        onChange={(event) => setCustomer(event.target.value)}
                    />
                    <Input label="Order Note" placeholder="No sugar, extra foam..." />
                </div>
            </Modal>
        </div>
    );
}
