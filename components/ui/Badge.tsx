type BadgeVariant = "neutral" | "success" | "danger" | "warning" | "primary";

type BadgeProps = {
    label: string;
    variant?: BadgeVariant;
    className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
    neutral: "border border-slate-300/20 bg-slate-500/15 text-slate-200",
    success: "border border-emerald-300/20 bg-emerald-500/15 text-emerald-200",
    danger: "border border-rose-300/20 bg-rose-500/15 text-rose-200",
    warning: "border border-amber-300/20 bg-amber-500/15 text-amber-200",
    primary: "border border-indigo-300/20 bg-indigo-500/15 text-indigo-200"
};

function cx(...classes: Array<string | null | false | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function Badge({ label, variant = "neutral", className }: BadgeProps) {
    return <span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", variantClasses[variant], className)}>{label}</span>;
}
