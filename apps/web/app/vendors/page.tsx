import { AppShell } from "../../components/app-shell";
import { CostingWorkspace } from "../../components/costing-workspace";

export default function VendorsPage() {
  return (
    <AppShell title="Vendor Directory" description="Search parsed vendor and material links from RM imports.">
      <CostingWorkspace initialView="vendors" />
    </AppShell>
  );
}
