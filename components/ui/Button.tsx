type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
    primary:
        "bg-linear-to-r from-indigo-500 to-cyan-500 text-white shadow-[0_16px_40px_-20px_rgba(59,130,246,0.95)] hover:from-indigo-400 hover:to-cyan-400 focus-visible:ring-indigo-400",
    secondary:
        "bg-white/5 text-slate-100 ring-1 ring-white/10 hover:bg-white/10 focus-visible:ring-slate-400",
    ghost: "bg-transparent text-slate-300 hover:bg-white/10 hover:text-white focus-visible:ring-slate-400",
    danger:
        "bg-linear-to-r from-rose-500 to-red-500 text-white shadow-[0_16px_36px_-20px_rgba(244,63,94,0.95)] hover:from-rose-400 hover:to-red-400 focus-visible:ring-rose-400"
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-base"
};

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function Button({
    children,
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    className,
    disabled,
    type = "button",
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            aria-busy={loading}
            className={cx(
                "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60",
                variantClasses[variant],
                sizeClasses[size],
                fullWidth && "w-full",
                className
            )}
            {...props}
        >
            {loading ? "Please wait..." : children}
        </button>
    );
}
