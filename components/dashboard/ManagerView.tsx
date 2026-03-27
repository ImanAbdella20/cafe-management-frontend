import Card from "@/components/ui/Card";

export default function ManagerView() {
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Shift Overview" description="Coverage and staffing status for the day.">
                <p className="text-sm text-zinc-700">All scheduled team members are checked in for the morning shift.</p>
            </Card>
            <Card title="Operations Note" description="Quick management message board.">
                <p className="text-sm text-zinc-700">Prioritize prep for lunch rush and monitor milk inventory.</p>
            </Card>
        </div>
    );
}
