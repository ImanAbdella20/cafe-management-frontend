import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
    React.ElementRef<typeof CheckboxPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
            "peer h-4 w-4 shrink-0 rounded border border-slate-300 bg-white shadow-sm outline-none ring-offset-white transition-all focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:ring-offset-slate-950 dark:data-[state=checked]:border-sky-400 dark:data-[state=checked]:bg-sky-400",
            className
        )}
        {...props}
    >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
            <Check className="h-3.5 w-3.5 text-white dark:text-slate-900" />
        </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
