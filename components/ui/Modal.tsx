"use client";

import { useEffect } from "react";

type ModalProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children?: React.ReactNode;
    footer?: React.ReactNode;
};

export default function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
    useEffect(() => {
        if (!open) {
            return;
        }

        const onEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", onEscape);
        return () => window.removeEventListener("keydown", onEscape);
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center" role="presentation">
            <button
                type="button"
                aria-label="Close dialog"
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
                onClick={onClose}
            />
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                aria-describedby={description ? "modal-description" : undefined}
                className="relative z-10 my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-lg min-h-0 flex-col rounded-2xl border border-white/10 bg-slate-900/95 text-slate-100 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.95)] transition-all duration-200"
            >
                <header className="shrink-0 border-b border-white/10 px-5 py-4">
                    <h2 id="modal-title" className="text-lg font-semibold text-slate-100">
                        {title}
                    </h2>
                    {description ? (
                        <p id="modal-description" className="mt-1 text-sm text-slate-400">
                            {description}
                        </p>
                    ) : null}
                </header>
                <div className="min-h-0 overflow-y-auto p-5">{children}</div>
                <footer className="shrink-0 flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
                    {footer}
                </footer>
            </section>
        </div>
    );
}
