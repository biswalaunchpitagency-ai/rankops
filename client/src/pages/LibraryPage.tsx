import { useState } from "react";
import { useActiveWorkspace } from "../lib/workspace-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import SopsTab from "../components/SopsTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useActiveWorkspace();
  const [activeTab, setActiveTab] = useState<"sops" | "tools" | "resources">("sops");
  const [showAddTool, setShowAddTool] = useState(false);
  const [showAddResource, setShowAddResource] = useState(false);

  // Forms states
  const [toolName, setToolName] = useState("");
  const [toolUrl, setToolUrl] = useState("");
  const [toolPurpose, setToolPurpose] = useState("");
  const [toolOwner, setToolOwner] = useState("All");

  const [resName, setResName] = useState("");
  const [resUrl, setResUrl] = useState("");
  const [resNote, setResNote] = useState("");

  const { data: tools = [] } = useQuery<any[]>({
    queryKey: ["tools", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const { data } = await axios.get(`/api/workspaces/${activeWorkspaceId}/tools`);
      return data;
    },
    enabled: !!activeWorkspaceId
  });

  const { data: resources = [] } = useQuery<any[]>({
    queryKey: ["resources", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const { data } = await axios.get(`/api/workspaces/${activeWorkspaceId}/resources`);
      return data;
    },
    enabled: !!activeWorkspaceId
  });

  const addToolMutation = useMutation({
    mutationFn: async (tool: any) => {
      await axios.post(`/api/workspaces/${activeWorkspaceId}/tools`, tool);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools", activeWorkspaceId] });
      setShowAddTool(false);
      setToolName("");
      setToolUrl("");
      setToolPurpose("");
    }
  });

  const addResourceMutation = useMutation({
    mutationFn: async (res: any) => {
      await axios.post(`/api/workspaces/${activeWorkspaceId}/resources`, res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources", activeWorkspaceId] });
      setShowAddResource(false);
      setResName("");
      setResUrl("");
      setResNote("");
    }
  });

  const deleteToolMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/workspaces/${activeWorkspaceId}/tools/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tools", activeWorkspaceId] })
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/workspaces/${activeWorkspaceId}/resources/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resources", activeWorkspaceId] })
  });

  if (!activeWorkspaceId) {
    return (
      <div className="text-muted-foreground text-[13px] p-6">
        Select a workspace to view the Library.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-normal tracking-tight text-foreground">SOPs & Library</h1>
        <p className="text-[13px] text-muted-foreground mt-1">Workspace templates, playbooks, tools, and resource references</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("sops")}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "sops" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
          }`}
        >
          SOPs & Knowledge Base
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "tools" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
          }`}
        >
          Tool Stack
        </button>
        <button
          onClick={() => setActiveTab("resources")}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "resources" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
          }`}
        >
          Resources
        </button>
      </div>

      {activeTab === "sops" && <SopsTab workspaceId={activeWorkspaceId} />}

      {activeTab === "tools" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold">Active Tool Stack</h3>
            <Button size="sm" onClick={() => setShowAddTool(true)} className="gap-1.5">
              <Plus size={14} /> Add Tool
            </Button>
          </div>

          <div className="border border-border rounded-sm overflow-hidden bg-card">
            <table className="min-w-full divide-y divide-border text-[13px]">
              <thead className="bg-secondary/40 text-muted-foreground font-mono text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left">Tool Name</th>
                  <th className="px-4 py-2.5 text-left">Purpose</th>
                  <th className="px-4 py-2.5 text-left">Owner / Seat</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tools.map((t) => (
                  <tr key={t.id} className="hover:bg-secondary/10">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <a href={t.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        {t.name} <ExternalLink size={12} />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.purpose}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.owner}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteToolMutation.mutate(t.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "resources" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold">Workspace Resources</h3>
            <Button size="sm" onClick={() => setShowAddResource(true)} className="gap-1.5">
              <Plus size={14} /> Add Resource
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((r) => (
              <div key={r.id} className="border border-border rounded-sm p-4 bg-card flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{r.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{r.note}</p>
                </div>
                <div className="flex justify-between items-center border-t border-border mt-3 pt-3">
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                    Open File <ExternalLink size={12} />
                  </a>
                  <button onClick={() => deleteResourceMutation.mutate(r.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Tool Dialog */}
      <Dialog open={showAddTool} onOpenChange={setShowAddTool}>
        <DialogContent className="rounded-sm max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Tool Name" value={toolName} onChange={(e) => setToolName(e.target.value)} />
            <Input placeholder="URL" value={toolUrl} onChange={(e) => setToolUrl(e.target.value)} />
            <Input placeholder="Purpose" value={toolPurpose} onChange={(e) => setToolPurpose(e.target.value)} />
            <Input placeholder="Owner" value={toolOwner} onChange={(e) => setToolOwner(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddTool(false)}>Cancel</Button>
              <Button size="sm" onClick={() => addToolMutation.mutate({ name: toolName, url: toolUrl, purpose: toolPurpose, owner: toolOwner })}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Resource Dialog */}
      <Dialog open={showAddResource} onOpenChange={setShowAddResource}>
        <DialogContent className="rounded-sm max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Resource Name" value={resName} onChange={(e) => setResName(e.target.value)} />
            <Input placeholder="URL" value={resUrl} onChange={(e) => setResUrl(e.target.value)} />
            <Input placeholder="Notes / Description" value={resNote} onChange={(e) => setResNote(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddResource(false)}>Cancel</Button>
              <Button size="sm" onClick={() => addResourceMutation.mutate({ name: resName, url: resUrl, note: resNote })}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
