import { useId } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    hint?: string;
    error?: string;
    containerClassName?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function Input({
    label,
    hint,
    error,
    id,
    className,
    containerClassName,
    ...props
}: InputProps) {
    const generatedId = useId();
    const inputId = id ?? props.name ?? generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
        <div className={cx("space-y-1.5", containerClassName)}>
            {label ? (
                <label htmlFor={inputId} className="block text-sm font-medium text-slate-300">
                    {label}
                </label>
            ) : null}
            <input
                id={inputId}
                className={cx(
                    "w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/25",
                    error && "border-rose-400/60 focus:border-rose-400 focus:ring-rose-500/25",
                    className
                )}
                aria-invalid={Boolean(error)}
                aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
                {...props}
            />
            {hint ? (
                <p id={hintId} className="text-xs text-slate-500">
                    {hint}
                </p>
            ) : null}
            {error ? (
                <p id={errorId} role="alert" className="text-xs text-rose-300">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
