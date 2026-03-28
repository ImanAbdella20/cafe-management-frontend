"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar, { type DashboardRole } from "@/components/layout/Sidebar";
import { Menu } from "lucide-react";
import BusinessProfilePanel from "@/components/dashboard/BusinessProfilePanel";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
    role: DashboardRole;
    children?: React.ReactNode;
};

const roleDisplay: Record<DashboardRole, string> = {
    admin: "Admin",
    manager: "Manager",
    cashier: "Cashier",
    barista: "Barista",
    staff: "Staff"
};

export default function DashboardLayout({ role, children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
    const [currentHash, setCurrentHash] = useState("");
    const router = useRouter();

    useEffect(() => {
        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
        document.title = `AMIDOS Cafe | ${roleLabel}`;
    }, [role]);

    useEffect(() => {
        const syncHash = () => {
            setCurrentHash(window.location.hash);
        };

        syncHash();
        window.addEventListener("hashchange", syncHash);

        return () => {
            window.removeEventListener("hashchange", syncHash);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        localStorage.removeItem("auth:user-email");
        sessionStorage.removeItem("auth:user-email");
        localStorage.removeItem("auth:user-password");
        sessionStorage.removeItem("auth:user-password");
        localStorage.removeItem("auth:login-at");
        sessionStorage.removeItem("auth:login-at");
        router.push("/login");
    };

    const handleLogoutRequest = () => {
        setLogoutConfirmOpen(true);
    };

    const handleCancelLogout = () => {
        setLogoutConfirmOpen(false);
    };

    const handleConfirmLogout = () => {
        setLogoutConfirmOpen(false);
        handleLogout();
    };

    const showProfilePanel = currentHash === "#profile";

    return (
        <div className="min-h-screen overflow-x-clip bg-slate-950 text-slate-100">
            <Sidebar
                role={role}
                open={sidebarOpen}
                collapsed={sidebarCollapsed}
                onClose={() => setSidebarOpen(false)}
                onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
                onLogout={handleLogoutRequest}
                userName="Cafe User"
            />
            <div
                className={cn(
                    "min-h-screen transition-[padding-left] duration-300 ease-out",
                    sidebarCollapsed ? "lg:pl-20" : "lg:pl-65"
                )}
            >
                <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur md:hidden">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
                        <button
                            type="button"
                            aria-label="Open navigation menu"
                            onClick={() => setSidebarOpen(true)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
                        >
                            <Menu className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <div className="min-w-0 flex-1 text-right">
                            <p className="truncate text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">Dashboard</p>
                            <p className="truncate text-sm font-semibold text-slate-100">{roleDisplay[role]}</p>
                        </div>
                    </div>
                </header>

                <main className="p-4 pb-6 sm:p-6 sm:pb-8">
                    <div className="mx-auto max-w-7xl">
                        {showProfilePanel ? (
                            <div className="flex justify-end">
                                <div className="w-full max-w-[360px]">
                                    <BusinessProfilePanel />
                                </div>
                            </div>
                        ) : (
                            children
                        )}
                    </div>
                </main>
            </div>
            <Modal
                open={logoutConfirmOpen}
                onClose={handleCancelLogout}
                title="Confirm logout"
                description="Are you sure you want to log out? You will need to sign in again to continue."
                footer={
                    <>
                        <Button variant="secondary" onClick={handleCancelLogout}>
                            Stay Signed In
                        </Button>
                        <Button variant="danger" onClick={handleConfirmLogout}>
                            Logout
                        </Button>
                    </>
                }
            >
                <p className="text-sm leading-6 text-zinc-600">Your current dashboard session will end immediately.</p>
            </Modal>
        </div>
    );
}
