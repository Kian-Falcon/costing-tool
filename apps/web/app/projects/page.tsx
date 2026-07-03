import { AppShell } from "../../components/app-shell";
import { CostingWorkspace } from "../../components/costing-workspace";

export default function ProjectsPage() {
  return (
    <AppShell title="Projects" description="Save, load, delete, and export archived costing projects.">
      <CostingWorkspace initialView="projects" />
    </AppShell>
  );
}
