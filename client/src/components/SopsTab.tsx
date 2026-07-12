import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, BookOpen } from "lucide-react";
import SopCard from "@/components/SopCard";
import SopForm from "@/components/SopForm";
import KbForm from "@/components/KbForm";
import ErrorAlert from "@/components/ErrorAlert";

export default function SopsTab({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [kbSearch, setKbSearch] = useState("");
  const [activeSection, setActiveSection] = useState<"sops" | "kb">("sops");
  const [sopFormOpen, setSopFormOpen] = useState(false);
  const [kbFormOpen, setKbFormOpen] = useState(false);

  const { data: sops = [], error: sopsError } = useQuery<any[]>({
    queryKey: ["sops", workspaceId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/workspaces/${workspaceId}/sops`);
      return data;
    },
    enabled: !!workspaceId,
  });

  const { data: kbArticles = [], error: kbError } = useQuery<any[]>({
    queryKey: ["kb", workspaceId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/workspaces/${workspaceId}/kb`);
      return data;
    },
    enabled: !!workspaceId,
  });

  const createSopMutation = useMutation({
    mutationFn: async (input: any) => {
      const { data } = await axios.post(`/api/workspaces/${workspaceId}/sops`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sops", workspaceId] });
      setSopFormOpen(false);
    },
  });

  const createKbMutation = useMutation({
    mutationFn: async (input: any) => {
      const { data } = await axios.post(`/api/workspaces/${workspaceId}/kb`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kb", workspaceId] });
      setKbFormOpen(false);
    },
  });

  const deleteSopMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/workspaces/${workspaceId}/sops/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sops", workspaceId] }),
  });

  const deleteKbMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/workspaces/${workspaceId}/kb/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb", workspaceId] }),
  });

  const filteredSops = sops.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );
  const filteredKb = kbArticles.filter(a =>
    a.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
    a.keywords.toLowerCase().includes(kbSearch.toLowerCase()) ||
    a.category.toLowerCase().includes(kbSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex gap-2 border-b border-border">
        {(["sops", "kb"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              activeSection === s
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "sops" ? "SOPs & Templates" : "Knowledge Base"}
          </button>
        ))}
      </div>

      {activeSection === "sops" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SOPs…"
                className="pl-8 rounded-sm h-9 text-[13px] bg-background border-border"
              />
            </div>
            <Button size="sm" onClick={() => setSopFormOpen(true)} className="gap-1.5 rounded-sm">
              <Plus className="h-3.5 w-3.5" /> Add SOP
            </Button>
          </div>
          {sopsError && <ErrorAlert error={sopsError} fallback="Failed to load SOPs" />}
          <div className="space-y-2">
            {filteredSops.map(sop => (
              <SopCard key={sop.id} sop={sop} onDelete={(id) => deleteSopMutation.mutate(id)} />
            ))}
            {filteredSops.length === 0 && (
              <div className="border border-dashed border-border rounded-md p-10 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-[13px]">No SOP templates found. Add one to document standard workflows.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === "kb" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                placeholder="Search articles…"
                className="pl-8 rounded-sm h-9 text-[13px] bg-background border-border"
              />
            </div>
            <Button size="sm" onClick={() => setKbFormOpen(true)} className="gap-1.5 rounded-sm">
              <Plus className="h-3.5 w-3.5" /> Add Article
            </Button>
          </div>
          {kbError && <ErrorAlert error={kbError} fallback="Failed to load Knowledge Base" />}
          <div className="space-y-3">
            {filteredKb.map((a) => (
              <div key={a.id} className="border border-border rounded-md p-4 bg-background">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground">{a.title}</span>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-sm">
                        {a.category}
                      </span>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{a.content}</p>
                    {a.keywords && (
                      <div className="text-[10px] text-muted-foreground font-mono bg-secondary/50 border border-border/40 px-2 py-0.5 rounded-sm w-fit">
                        Keywords: {a.keywords}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete KB Article: "${a.title}"?`)) {
                        deleteKbMutation.mutate(a.id);
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive p-1 rounded-sm transition-colors shrink-0 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {filteredKb.length === 0 && (
              <div className="border border-dashed border-border rounded-md p-10 text-center text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-[13px]">No Knowledge Base articles found. Add articles for AI draft reply assistance.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creation modals */}
      <SopForm open={sopFormOpen} onOpenChange={setSopFormOpen} mutation={createSopMutation} />
      <KbForm open={kbFormOpen} onOpenChange={setKbFormOpen} mutation={createKbMutation} />
    </div>
  );
}
