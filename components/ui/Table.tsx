type TableColumn<T> = {
    key: keyof T;
    header: string;
    className?: string;
    render?: (value: T[keyof T], row: T, rowIndex: number) => React.ReactNode;
};

type TableProps<T extends Record<string, unknown>> = {
    columns: Array<TableColumn<T>>;
    data: Array<T>;
    rowKey: (row: T, rowIndex: number) => string;
    emptyState?: string;
    className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export default function Table<T extends Record<string, unknown>>({
    columns,
    data,
    rowKey,
    emptyState = "No records found.",
    className
}: TableProps<T>) {
    return (
        <div className={cx("overflow-x-auto rounded-xl border border-white/10 bg-slate-950/45", className)}>
            <table className="min-w-full border-collapse text-left text-sm text-slate-300" aria-label="Data table">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                        {columns.map((column, columnIndex) => (
                            <th key={`${String(column.key)}-${columnIndex}`} scope="col" className={cx("px-4 py-3 font-semibold", column.className)}>
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td className="px-4 py-6 text-center text-slate-500" colSpan={columns.length}>
                                {emptyState}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIndex) => (
                            <tr key={rowKey(row, rowIndex)} className="border-t border-white/10 hover:bg-white/5">
                                {columns.map((column, columnIndex) => {
                                    const value = row[column.key];
                                    return (
                                        <td key={`${String(column.key)}-${columnIndex}-${rowIndex}`} className={cx("px-4 py-3", column.className)}>
                                            {column.render ? column.render(value, row, rowIndex) : String(value ?? "-")}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
