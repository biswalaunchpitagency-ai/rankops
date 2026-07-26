import { useActiveWorkspace } from "../lib/workspace-context";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export default function ReportsPage() {
  const { activeWorkspaceId } = useActiveWorkspace();

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["clients", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const { data } = await axios.get(`/api/workspaces/${activeWorkspaceId}/clients`);
      return data;
    },
    enabled: !!activeWorkspaceId
  });

  const { data: ticketsData = { tickets: [] } } = useQuery<any>({
    queryKey: ["tickets", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return { tickets: [] };
      const { data } = await axios.get(`/api/workspaces/${activeWorkspaceId}/tickets`);
      return data;
    },
    enabled: !!activeWorkspaceId
  });

  // Calculate completed tasks that have impact logs (Done tickets)
  const completedTickets = (ticketsData.tickets || []).filter(
    (t: any) => t.status === "resolved" || t.status === "closed"
  );

  if (!activeWorkspaceId) {
    return (
      <div className="text-muted-foreground text-[13px] p-6 font-sans">
        Select a workspace to view reports.
      </div>
    );
  }

  // Compute metrics
  const totalHoursBurned = clients.reduce((acc, c) => acc + c.hoursUsedThisMonth, 0);
  const totalRetainerHours = clients.reduce((acc, c) => acc + c.retainerHours, 0);
  const activeClientsCount = clients.length;
  const completedCount = completedTickets.length;

  const getCategoryBadge = (category: string) => {
    const cleanCat = (category || "general").toLowerCase();
    if (cleanCat.includes("refund")) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-medium bg-[#fdebec] text-[#9f2f2d] border border-[#eaeaea]">Refund</span>;
    } else if (cleanCat.includes("technical") || cleanCat.includes("speed")) {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-medium bg-[#fbf3db] text-[#956400] border border-[#eaeaea]">Technical</span>;
    } else {
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-medium bg-[#edf3ec] text-[#346538] border border-[#eaeaea]">General</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b border-border pb-4">
        <h1 className="font-display text-4xl font-light tracking-tight text-foreground leading-none">Reports</h1>
        <p className="text-[13px] text-muted-foreground mt-2">Generate client reports and estimate comparisons</p>
      </div>

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-in-page">
        <div className="border border-border rounded-md bg-card p-5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all">
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground block">Hours Burned</span>
          <span className="font-display text-3xl font-light text-foreground mt-1.5 block">
            {totalHoursBurned} <span className="text-sm font-sans font-normal text-muted-foreground">/ {totalRetainerHours} hrs</span>
          </span>
        </div>
        <div className="border border-border rounded-md bg-card p-5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all">
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground block">Active Clients</span>
          <span className="font-display text-3xl font-light text-foreground mt-1.5 block">{activeClientsCount}</span>
        </div>
        <div className="border border-border rounded-md bg-card p-5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all">
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground block">Done Deliverables</span>
          <span className="font-display text-3xl font-light text-foreground mt-1.5 block">{completedCount}</span>
        </div>
      </div>

      <div className="animate-in-page">
        {/* Table 2: Impact Log */}
        <div className="border border-border rounded-md bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/10">
            <h3 className="text-xs font-semibold font-mono uppercase tracking-wider text-foreground">Completed Work & Deliverables</h3>
          </div>
          <table className="min-w-full divide-y divide-border text-xs">
            <thead className="bg-muted/30 text-muted-foreground font-mono text-[9px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Ticket / Deliverable</th>
                <th className="px-5 py-3 text-left font-semibold">Category</th>
                <th className="px-5 py-3 text-right font-semibold">Resolved Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {completedTickets.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center text-muted-foreground">No completed work found for this period.</td>
                </tr>
              ) : (
                completedTickets.map((t: any) => (
                  <tr key={t.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground truncate max-w-[200px]">{t.subject}</td>
                    <td className="px-5 py-3.5">{getCategoryBadge(t.category)}</td>
                    <td className="px-5 py-3.5 text-right text-muted-foreground font-mono">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
