type CardProps = {
    title?: string;
    description?: string;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
    contentClassName?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function Card({ title, description, children, footer, className, contentClassName }: CardProps) {
    return (
        <section
            className={cx(
                "overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 text-slate-100 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.95)] backdrop-blur-xl transition duration-200",
                className
            )}
        >
            {(title || description) && (
                <header className="border-b border-white/10 px-5 py-4">
                    {title ? <h2 className="text-base font-semibold text-slate-100">{title}</h2> : null}
                    {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
                </header>
            )}
            <div className={cx("p-5", contentClassName)}>{children}</div>
            {footer ? <footer className="border-t border-white/10 px-5 py-4">{footer}</footer> : null}
        </section>
    );
}
