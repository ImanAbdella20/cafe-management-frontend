import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
    <section
        ref={ref}
        className={cn(
            "rounded-2xl border border-white/60 bg-white/75 text-slate-900 shadow-[0_20px_70px_-30px_rgba(2,6,23,0.45)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100",
            className
        )}
        {...props}
    />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("space-y-1.5 p-6", className)} {...props} />
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h2 ref={ref} className={cn("text-2xl font-semibold tracking-tight", className)} {...props} />
    )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p ref={ref} className={cn("text-sm text-slate-600 dark:text-slate-300", className)} {...props} />
    )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
);
CardFooter.displayName = "CardFooter";

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
