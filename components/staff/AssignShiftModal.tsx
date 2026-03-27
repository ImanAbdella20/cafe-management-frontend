"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

type AssignShiftModalProps = {
    open: boolean;
    loading?: boolean;
    staffName?: string;
    onClose: () => void;
    onSubmit: (payload: { shift_date: string; start_time: string; end_time: string }) => Promise<void>;
};

export default function AssignShiftModal({ open, loading = false, staffName, onClose, onSubmit }: AssignShiftModalProps) {
    const [shiftDate, setShiftDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    const handleClose = () => {
        setShiftDate("");
        setStartTime("");
        setEndTime("");
        onClose();
    };

    const handleSubmit = async () => {
        await onSubmit({
            shift_date: shiftDate,
            start_time: startTime,
            end_time: endTime
        });
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Assign Shift"
            description={staffName ? `Create and save a shift for ${staffName}.` : "Create and save a shift for this team member."}
            footer={
                <>
                    <Button variant="ghost" onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} loading={loading} disabled={loading}>
                        Save
                    </Button>
                </>
            }
        >
            <div className="space-y-3">
                <Input label="Date" type="date" value={shiftDate} onChange={(event) => setShiftDate(event.target.value)} />
                <Input label="Start Time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                <Input label="End Time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </div>
        </Modal>
    );
}
