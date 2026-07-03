import { AppShell } from "../../components/app-shell";
import { CostingWorkspace } from "../../components/costing-workspace";

export default function ModelsPage() {
  return (
    <AppShell title="Dimension Models" description="Review model buckets, ratio norms, samples, confidence, and predictors.">
      <CostingWorkspace initialView="models" />
    </AppShell>
  );
}
