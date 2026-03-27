import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
    return (
        <input
            ref={ref}
            className={cn(
                "flex h-11 w-full rounded-xl border border-slate-200/90 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-[0_0_0_0_rgba(14,165,233,0)] backdrop-blur transition-all duration-200 placeholder:text-slate-400 focus-visible:border-sky-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/30 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus-visible:border-sky-400 dark:focus-visible:ring-sky-500/25",
                className
            )}
            {...props}
        />
    );
});
Input.displayName = "Input";
