import Card from "@/components/ui/Card";

type OverviewProps = {
    totalCategories: number;
    totalItems: number;
};

export default function Overview({ totalCategories, totalItems }: OverviewProps) {
    return (
        <section className="space-y-4">
            <header>
                <h2 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Menu / Items Management</h2>
                <p className="mt-1 text-sm text-slate-400">Monitor catalog structure and pricing at a glance.</p>
            </header>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card title="Total Categories">
                    <p className="text-2xl font-semibold text-slate-100">{totalCategories}</p>
                </Card>
                <Card title="Total Items">
                    <p className="text-2xl font-semibold text-slate-100">{totalItems}</p>
                </Card>
                <Card title="Catalog Health">
                    <p className="text-sm text-slate-300">{totalItems > 0 ? "Active catalog data available" : "No items configured yet"}</p>
                </Card>
                <Card title="Quick Action">
                    <p className="text-sm text-slate-300">Use tabs to manage categories, items, and prices.</p>
                </Card>
            </div>
        </section>
    );
}
