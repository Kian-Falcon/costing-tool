import { AppShell } from "../../components/app-shell";
import { CostingWorkspace } from "../../components/costing-workspace";

export default function RatesPage() {
  return (
    <AppShell title="Rate Library" description="Search, edit, reset, and add raw-material rate records.">
      <CostingWorkspace initialView="rates" />
    </AppShell>
  );
}
