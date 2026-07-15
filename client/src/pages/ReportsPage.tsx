import { useActiveWorkspace } from "../lib/workspace-context";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
      <div className="text-muted-foreground text-[13px] p-6">
        Select a workspace to view reports.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-normal tracking-tight text-foreground">Reports & Billing</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Generate client billing summaries and estimate comparisons</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Table 1: Time & Billing */}
        <Card className="shadow-none border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Time & Billing by Client</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="min-w-full divide-y divide-border text-xs">
              <thead className="bg-secondary/40 font-mono text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Client</th>
                  <th className="px-4 py-2 text-left">Hours Burned</th>
                  <th className="px-4 py-2 text-left">Monthly Rate</th>
                  <th className="px-4 py-2 text-right">Estimated Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.hoursUsedThisMonth} / {c.retainerHours} hrs</td>
                    <td className="px-4 py-3">${c.rate}/hr</td>
                    <td className="px-4 py-3 text-right font-semibold">${(c.hoursUsedThisMonth * c.rate).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Table 2: Impact Log */}
        <Card className="shadow-none border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Completed Work & Deliverables</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="min-w-full divide-y divide-border text-xs">
              <thead className="bg-secondary/40 font-mono text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Ticket / Deliverable</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-right">Resolved Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {completedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">No completed work found for this period.</td>
                  </tr>
                ) : (
                  completedTickets.map((t: any) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 font-medium">{t.subject}</td>
                      <td className="px-4 py-3 capitalize">{t.category.replace("_", " ")}</td>
                      <td className="px-4 py-3 text-right">{new Date(t.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
