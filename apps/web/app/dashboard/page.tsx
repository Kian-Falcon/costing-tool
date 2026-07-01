import { Calculator, FileUp, Library, Users } from "lucide-react";
import { CostingWorkspace } from "../../components/costing-workspace";

const nav = [
  { label: "BOQ", icon: FileUp },
  { label: "Rates", icon: Library },
  { label: "Vendors", icon: Users },
  { label: "Costing", icon: Calculator }
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-cloud">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-ink">BOQ Workspace</h1>
            <p className="text-sm text-slate-600">Upload, map, cost, correct, and export furniture items.</p>
          </div>
          <button className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white">New BOQ</button>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-2">
          {nav.map((item) => (
            <button key={item.label} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100">
              <item.icon size={17} />
              {item.label}
            </button>
          ))}
        </aside>
        <CostingWorkspace />
      </div>
    </main>
  );
}
