"use client";

import { motion } from "framer-motion";
import { AuthShowcase } from "@/components/auth/AuthShowcase";
import { LoginForm } from "@/components/auth/LoginForm";

export function LoginPage() {
    return (
        <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.15),transparent_42%),radial-gradient(circle_at_80%_0%,rgba(20,184,166,0.18),transparent_38%),linear-gradient(180deg,#f7fbff_0%,#f8fafc_55%,#eef6ff_100%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.16),transparent_42%),radial-gradient(circle_at_80%_0%,rgba(13,148,136,0.22),transparent_38%),linear-gradient(180deg,#020617_0%,#020617_60%,#0b1120_100%)]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 lg:hidden">
                <motion.div
                    className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-sky-300/35 blur-3xl dark:bg-sky-500/20"
                    animate={{ x: [0, 16, 0], y: [0, 12, 0], opacity: [0.35, 0.55, 0.35] }}
                    transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute -right-16 top-36 h-48 w-48 rounded-full bg-teal-300/30 blur-3xl dark:bg-teal-500/20"
                    animate={{ x: [0, -14, 0], y: [0, -10, 0], opacity: [0.32, 0.5, 0.32] }}
                    transition={{ duration: 11, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.4 }}
                />
            </div>

            <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
                <AuthShowcase />

                <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
                    <motion.div
                        className="w-full max-w-md"
                        initial={{ opacity: 0, y: 24, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.55, ease: "easeOut" }}
                    >
                        <LoginForm />
                    </motion.div>
                </section>
            </div>
        </main>
    );
}
