"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { loginAdmin } from "@/lib/api";
import { getRoleFromToken } from "@/lib/auth";
import { Button } from "@/components/shadcn/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Checkbox } from "@/components/shadcn/checkbox";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";

const loginSchema = z.object({
    email: z.string().trim().email("Please enter a valid email address."),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters.")
        .max(72, "Password must be 72 characters or less."),
    remember: z.boolean()
});

type LoginSchema = z.infer<typeof loginSchema>;

function getRedirectPathFromRole(role: string) {
    switch (role) {
        case "admin":
            return "/dashboard/admin";
        case "manager":
            return "/dashboard/manager";
        case "cashier":
            return "/dashboard/cashier";
        case "barista":
            return "/dashboard/barista";
        default:
            return "/login";
    }
}

export function LoginForm() {
    const router = useRouter();
    const { setToken } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isValid, isSubmitting }
    } = useForm<LoginSchema>({
        resolver: zodResolver(loginSchema),
        mode: "onChange",
        defaultValues: {
            email: "",
            password: "",
            remember: true
        }
    });

    const onSubmit = handleSubmit(async (values) => {
        setSubmitError("");

        try {
            const data = await loginAdmin(values.email, values.password);
            setToken(data.token, values.remember ? "local" : "session");

            const email = values.email.trim().toLowerCase();
            const password = values.password;
            const loginAt = new Date().toISOString();
            if (values.remember) {
                localStorage.setItem("auth:user-email", email);
                localStorage.setItem("auth:user-password", password);
                localStorage.setItem("auth:login-at", loginAt);
                sessionStorage.removeItem("auth:user-email");
                sessionStorage.removeItem("auth:user-password");
                sessionStorage.removeItem("auth:login-at");
            } else {
                sessionStorage.setItem("auth:user-email", email);
                sessionStorage.setItem("auth:user-password", password);
                sessionStorage.setItem("auth:login-at", loginAt);
                localStorage.removeItem("auth:user-email");
                localStorage.removeItem("auth:user-password");
                localStorage.removeItem("auth:login-at");
            }

            const role = getRoleFromToken(data.token).toLowerCase();
            router.push(getRedirectPathFromRole(role));
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to reach server. Please verify backend is running.";
            setSubmitError(message);
        }
    });

    return (
        <Card className="overflow-hidden rounded-2xl border-white/70 bg-white/70 dark:border-slate-700/70 dark:bg-slate-950/65">
            <CardHeader className="space-y-5 pb-4">
                <div className="relative inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-sky-500/25 dark:border-slate-700 dark:bg-slate-900">
                    <Image
                        src="/Amidos-logo.png"
                        alt="Amidos logo"
                        fill
                        className="object-cover"
                        sizes="56px"
                        priority
                    />
                </div>

                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">AMIDOS Cafe</p>
                    <CardTitle className="text-3xl text-slate-900 dark:text-slate-100">Welcome back</CardTitle>
                    <CardDescription>Sign in to continue to your dashboard</CardDescription>
                </div>
            </CardHeader>

            <CardContent>
                <form onSubmit={onSubmit} className="space-y-5" noValidate>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email address</Label>
                        <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="you@company.com"
                                className="pl-10"
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? "email-error" : undefined}
                                {...register("email")}
                            />
                        </div>
                        {errors.email ? (
                            <p id="email-error" role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                                {errors.email.message}
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                className="pl-10 pr-10"
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={errors.password ? "password-error" : undefined}
                                {...register("password")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                aria-pressed={showPassword}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                            </button>
                        </div>
                        {errors.password ? (
                            <p id="password-error" role="alert" className="text-sm text-rose-600 dark:text-rose-400">
                                {errors.password.message}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <Controller
                            control={control}
                            name="remember"
                            render={({ field }) => (
                                <div className="flex items-center gap-2">
                                    <Checkbox id="remember" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                                    <Label htmlFor="remember" className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                        Remember me
                                    </Label>
                                </div>
                            )}
                        />

                        <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-sky-700 transition hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 dark:text-sky-300 dark:hover:text-sky-200"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    {submitError ? (
                        <p aria-live="polite" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                            {submitError}
                        </p>
                    ) : null}

                    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.995 }}>
                        <Button type="submit" className="w-full" loading={isSubmitting} disabled={!isValid || isSubmitting}>
                            {isSubmitting ? "Signing in..." : "Sign in"}
                        </Button>
                    </motion.div>

                    <div className="relative py-1">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                        </div>
                        <p className="relative mx-auto w-fit bg-white/75 px-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                            Or continue with
                        </p>
                    </div>
                </form>
            </CardContent>

            <CardFooter className="border-t border-slate-200/70 pt-5 dark:border-slate-700/70">
                <div className="w-full space-y-3 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        By continuing, you agree to our{" "}
                        <Link href="/terms" className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-500 dark:hover:decoration-slate-300">
                            Terms
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:decoration-slate-500 dark:hover:decoration-slate-300">
                            Privacy
                        </Link>
                        .
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Secure login powered by AMIDOS Cafe Cloud</p>
                </div>
            </CardFooter>
        </Card>
    );
}
