import { AppShell } from "../../components/app-shell";
import { CostingWorkspace } from "../../components/costing-workspace";

export default function DashboardPage() {
  return (
    <AppShell title="BOQ Workspace" description="Upload, map, cost, correct, and export furniture items.">
      <CostingWorkspace initialView="workspace" />
    </AppShell>
  );
}
