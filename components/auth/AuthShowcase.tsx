"use client";

import { motion } from "framer-motion";
import { BarChart3, ShieldCheck, Sparkles } from "lucide-react";

const floatingShapes = [
    { size: "h-72 w-72", top: "-10%", left: "-8%", delay: 0, duration: 12 },
    { size: "h-52 w-52", top: "28%", left: "62%", delay: 0.3, duration: 15 },
    { size: "h-64 w-64", top: "66%", left: "12%", delay: 0.6, duration: 14 }
];

export function AuthShowcase() {
    return (
        <aside className="relative hidden min-h-screen overflow-hidden border-r border-slate-200/40 bg-[linear-gradient(160deg,#062235_0%,#0f4f6f_45%,#0f766e_100%)] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between dark:border-slate-700/40">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                {floatingShapes.map((shape) => (
                    <motion.div
                        key={`${shape.top}-${shape.left}`}
                        className={`absolute ${shape.size} rounded-full bg-white/10 blur-3xl`}
                        style={{ top: shape.top, left: shape.left }}
                        initial={{ opacity: 0.25, scale: 0.9 }}
                        animate={{
                            opacity: [0.22, 0.42, 0.25],
                            scale: [0.95, 1.08, 0.95],
                            y: [0, -18, 0]
                        }}
                        transition={{
                            duration: shape.duration,
                            delay: shape.delay,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>

            <motion.div
                className="relative z-10"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
            >
                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] backdrop-blur">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    AMIDOS Cafe Cloud
                </div>

                <h1 className="mt-8 max-w-lg text-4xl font-semibold leading-tight text-white/95 xl:text-5xl">
                    Operate every shift with speed, clarity, and confidence.
                </h1>
                <p className="mt-5 max-w-md text-base text-slate-100/85">
                    The command center for staff, orders, menu pricing, and payments. Built for modern teams that move fast.
                </p>
            </motion.div>

            <motion.div
                className="relative z-10 grid gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            >
                <div className="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    <p className="text-sm text-white/90">Role-based access with secure token authentication.</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur">
                    <BarChart3 className="h-5 w-5" aria-hidden="true" />
                    <p className="text-sm text-white/90">Real-time operations dashboard for every department.</p>
                </div>
            </motion.div>
        </aside>
    );
}
