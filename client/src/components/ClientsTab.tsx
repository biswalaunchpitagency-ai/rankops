import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import ClientCard from "@/components/ClientCard";
import type { Client } from "@/components/ClientCard";
import ClientDetail from "@/components/ClientDetail";
import ClientForm from "@/components/ClientForm";
import ErrorAlert from "@/components/ErrorAlert";

export default function ClientsTab({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client & { hoursUsedThisMonth: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data: clients = [], isLoading, error } = useQuery<(Client & { hoursUsedThisMonth: number })[]>({
    queryKey: ["clients", workspaceId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/workspaces/${workspaceId}/clients`);
      return data;
    },
    enabled: !!workspaceId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: any) => {
      const { data } = await axios.post(`/api/workspaces/${workspaceId}/clients`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients", workspaceId] });
      setAddOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: any) => {
      const { data } = await axios.patch(`/api/workspaces/${workspaceId}/clients/${selectedClient?.id}`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients", workspaceId] });
      setEditOpen(false);
      setSelectedClient(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/workspaces/${workspaceId}/clients/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients", workspaceId] });
      setSelectedClient(null);
    },
  });

  const generatePackMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { data } = await axios.post(`/api/workspaces/${workspaceId}/clients/${clientId}/generate-pack`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });

  const totalHours = clients.reduce((s, c) => s + c.hoursUsedThisMonth, 0);
  const totalRevenue = clients.reduce((s, c) => s + c.hoursUsedThisMonth * c.rate, 0);

  const handleDelete = () => {
    if (selectedClient && confirm(`Are you sure you want to delete ${selectedClient.name}?`)) {
      deleteMutation.mutate(selectedClient.id);
    }
  };

  if (isLoading) return <div className="text-muted-foreground text-[13px]">Loading clients…</div>;
  if (error) return <ErrorAlert error={error} fallback="Failed to load clients" />;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Clients", value: clients.filter(c => c.status === "Active").length },
          { label: "Hours Logged (Month)", value: totalHours.toFixed(1) + "h" },
          { label: "Est. Revenue (Month)", value: "$" + totalRevenue.toFixed(0) },
        ].map((kpi) => (
          <div key={kpi.label} className="border border-border rounded-md p-4 bg-background">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-normal text-foreground">Clients</h2>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 rounded-sm">
          <Plus className="h-3.5 w-3.5" /> Add Client
        </Button>
      </div>

      {/* Grid */}
      {clients.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-10 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-[13px]">No clients yet. Add your first client to start tracking retainers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((c) => (
            <ClientCard key={c.id} client={c} onClick={() => setSelectedClient(c)} />
          ))}
        </div>
      )}

      {/* Add dialog */}
      <ClientForm open={addOpen} onOpenChange={setAddOpen} mutation={createMutation} title="Add Client" />

      {/* Detail dialog */}
      {selectedClient && (
        <ClientDetail
          open={!!selectedClient && !editOpen}
          onOpenChange={(v) => { if (!v) setSelectedClient(null); }}
          client={selectedClient}
          onEdit={() => setEditOpen(true)}
          onDelete={handleDelete}
          generatePackMutation={generatePackMutation}
        />
      )}

      {/* Edit dialog */}
      {selectedClient && editOpen && (
        <ClientForm
          open={editOpen}
          onOpenChange={(v) => { if (!v) setEditOpen(false); }}
          defaultValues={selectedClient as any}
          mutation={updateMutation}
          title={`Edit — ${selectedClient.name}`}
        />
      )}
    </div>
  );
}
