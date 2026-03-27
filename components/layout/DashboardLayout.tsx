"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar, { type DashboardRole } from "@/components/layout/Sidebar";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
    role: DashboardRole;
    children?: React.ReactNode;
};

export default function DashboardLayout({ role, children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
        document.title = `AMIDOS Cafe | ${roleLabel}`;
    }, [role]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
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

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
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
                
                <main className="p-4 sm:p-6">
                    <div className="mx-auto max-w-7xl">{children}</div>
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
