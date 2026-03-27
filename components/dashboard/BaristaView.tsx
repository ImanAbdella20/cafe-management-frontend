import Card from "@/components/ui/Card";

export default function BaristaView() {
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Drink Queue" description="Orders currently in preparation.">
                <ul className="space-y-2 text-sm text-zinc-700">
                    <li>#1004 - Iced Mocha</li>
                    <li>#1005 - Flat White</li>
                    <li>#1006 - Caramel Latte</li>
                </ul>
            </Card>
            <Card title="Station Status" description="Machine and bean stock health.">
                <p className="text-sm text-zinc-700">Espresso station operating normally. Beans at 46% capacity.</p>
            </Card>
        </div>
    );
}
