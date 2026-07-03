import { AppShell } from "../../components/app-shell";
import { CostingWorkspace } from "../../components/costing-workspace";

export default function ExportsPage() {
  return (
    <AppShell title="Exports" description="Generate quotation, internal costing, PI files, snapshots, and review export history.">
      <CostingWorkspace initialView="exports" />
    </AppShell>
  );
}
