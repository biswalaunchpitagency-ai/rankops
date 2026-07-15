import { useActiveWorkspace } from "../lib/workspace-context";
import ClientsTab from "../components/ClientsTab";

export default function ClientsPage() {
  const { activeWorkspaceId } = useActiveWorkspace();

  if (!activeWorkspaceId) {
    return (
      <div className="text-muted-foreground text-[13px] p-6">
        Select a workspace to view clients.
      </div>
    );
  }

  return <ClientsTab workspaceId={activeWorkspaceId} />;
}
