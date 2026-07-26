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
    <div className="space-y-6 font-sans">
      <div className="border-b border-border pb-4">
        <h1 className="font-display text-4xl font-light tracking-tight text-foreground leading-none">SOPs & Library</h1>
        <p className="text-[13px] text-muted-foreground mt-2">Workspace templates, playbooks, tools, and resource references</p>
      </div>

      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab("sops")}
          className={`pb-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 -mb-px transition-colors duration-200 cursor-pointer ${
            activeTab === "sops" ? "border-primary text-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          SOPs & KB
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={`pb-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 -mb-px transition-colors duration-200 cursor-pointer ${
            activeTab === "tools" ? "border-primary text-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Tool Stack
        </button>
        <button
          onClick={() => setActiveTab("resources")}
          className={`pb-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 -mb-px transition-colors duration-200 cursor-pointer ${
            activeTab === "resources" ? "border-primary text-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Resources
        </button>
      </div>

      {activeTab === "sops" && <SopsTab workspaceId={activeWorkspaceId} />}

      {activeTab === "tools" && (
        <div className="space-y-4 animate-in-page">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">Active Tool Stack</h3>
            <Button size="sm" onClick={() => setShowAddTool(true)} className="gap-1.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs cursor-pointer">
              <Plus size={13} /> Add Tool
            </Button>
          </div>

          <div className="border border-border rounded-md overflow-hidden bg-card">
            <table className="min-w-full divide-y divide-border text-xs">
              <thead className="bg-muted/35 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Tool Name</th>
                  <th className="px-5 py-3 text-left font-semibold">Purpose</th>
                  <th className="px-5 py-3 text-left font-semibold">Owner / Seat</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tools.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">
                      No tools added to this workspace yet.
                    </td>
                  </tr>
                ) : (
                  tools.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-foreground">
                        <a href={t.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline font-semibold">
                          {t.name} <ExternalLink size={11} className="opacity-70" />
                        </a>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{t.purpose}</td>
                      <td className="px-5 py-3.5 text-muted-foreground font-mono text-[11px]">{t.owner}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={() => deleteToolMutation.mutate(t.id)} className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "resources" && (
        <div className="space-y-4 animate-in-page">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">Workspace Resources</h3>
            <Button size="sm" onClick={() => setShowAddResource(true)} className="gap-1.5 rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs cursor-pointer">
              <Plus size={13} /> Add Resource
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resources.length === 0 ? (
              <div className="md:col-span-2 border border-border border-dashed rounded-md py-16 text-center text-muted-foreground text-xs">
                No resources registered for this workspace.
              </div>
            ) : (
              resources.map((r) => (
                <div key={r.id} className="border border-border rounded-md p-6 bg-card flex flex-col justify-between hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-primary/20 transition-all duration-200">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm leading-snug">{r.name}</h4>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-[65ch]">{r.note}</p>
                  </div>
                  <div className="flex justify-between items-center border-t border-border mt-4 pt-4">
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1.5">
                      Open File <ExternalLink size={11} />
                    </a>
                    <button onClick={() => deleteResourceMutation.mutate(r.id)} className="text-muted-foreground hover:text-destructive cursor-pointer transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Tool Dialog */}
      <Dialog open={showAddTool} onOpenChange={setShowAddTool}>
        <DialogContent className="rounded-md max-w-sm border-border bg-popover shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold font-mono uppercase tracking-wider text-foreground">Add Tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            <Input placeholder="Tool Name" value={toolName} onChange={(e) => setToolName(e.target.value)} className="rounded-sm border-border bg-card text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary" />
            <Input placeholder="URL" value={toolUrl} onChange={(e) => setToolUrl(e.target.value)} className="rounded-sm border-border bg-card text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary" />
            <Input placeholder="Purpose" value={toolPurpose} onChange={(e) => setToolPurpose(e.target.value)} className="rounded-sm border-border bg-card text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary" />
            <Input placeholder="Owner / Audience" value={toolOwner} onChange={(e) => setToolOwner(e.target.value)} className="rounded-sm border-border bg-card text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary" />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowAddTool(false)} className="rounded-sm border border-border bg-muted hover:bg-muted/85 text-xs h-8 cursor-pointer">Cancel</Button>
              <Button size="sm" onClick={() => addToolMutation.mutate({ name: toolName, url: toolUrl, purpose: toolPurpose, owner: toolOwner })} className="rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 cursor-pointer">Save Tool</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Resource Dialog */}
      <Dialog open={showAddResource} onOpenChange={setShowAddResource}>
        <DialogContent className="rounded-md max-w-sm border-border bg-popover shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold font-mono uppercase tracking-wider text-foreground">Add Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            <Input placeholder="Resource Name" value={resName} onChange={(e) => setResName(e.target.value)} className="rounded-sm border-border bg-card text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary" />
            <Input placeholder="URL" value={resUrl} onChange={(e) => setResUrl(e.target.value)} className="rounded-sm border-border bg-card text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary" />
            <Input placeholder="Notes / Description" value={resNote} onChange={(e) => setResNote(e.target.value)} className="rounded-sm border-border bg-card text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary" />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowAddResource(false)} className="rounded-sm border border-border bg-muted hover:bg-muted/85 text-xs h-8 cursor-pointer">Cancel</Button>
              <Button size="sm" onClick={() => addResourceMutation.mutate({ name: resName, url: resUrl, note: resNote })} className="rounded-sm bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 cursor-pointer">Save Resource</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
