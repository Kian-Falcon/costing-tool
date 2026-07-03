import { AppShell } from "../../components/app-shell";
import { CostingWorkspace } from "../../components/costing-workspace";

export default function TrainingPage() {
  return (
    <AppShell title="Training Data" description="Inspect imported corpus products, material coverage, and training statistics.">
      <CostingWorkspace initialView="training" />
    </AppShell>
  );
}
