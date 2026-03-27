import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-60",
    {
        variants: {
            variant: {
                default:
                    "bg-slate-900 text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.65)] hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400",
                secondary:
                    "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
                outline:
                    "border border-slate-200/80 bg-white/70 text-slate-800 shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-900",
                ghost: "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            },
            size: {
                default: "h-11 px-4 py-2",
                sm: "h-9 rounded-xl px-3 text-xs",
                lg: "h-12 px-6 text-base"
            }
        },
        defaultVariants: {
            variant: "default",
            size: "default"
        }
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";

        return (
            <Comp
                ref={ref}
                className={cn(buttonVariants({ variant, size, className }))}
                aria-busy={loading}
                disabled={props.disabled || loading}
                {...props}
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                <span>{children}</span>
            </Comp>
        );
    }
);
Button.displayName = "Button";

export { buttonVariants };
