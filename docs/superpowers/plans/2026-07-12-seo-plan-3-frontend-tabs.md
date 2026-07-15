# SEO Agency Integration — Plan 3: Frontend Workspace Tabs (Clients & SOPs)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "Clients & Reports" and "SOPs & Library" tabs to `WorkspaceDetailPage.tsx`. Build the Client grid with retainer burn bars, client detail view, and the SOP accordion + Knowledge Base management UI.

**Architecture:** Extend the existing tab navigation inside `WorkspaceDetailPage.tsx`. Each tab is a self-contained component in `client/src/components/`. Uses React Query for data fetching, shadcn/ui components, and follows the Launchpit Agency DESIGN.md token system.

**Tech Stack:** React, TypeScript, TanStack React Query, Axios, shadcn/ui, Lucide icons

## Global Constraints
- Use shadcn semantic color tokens (`bg-background`, `text-muted-foreground`, `border-border`) — no hardcoded hex colors
- Use `@/components/ui/*` imports for all UI primitives
- All API calls via Axios, all server state via `useQuery`/`useMutation`
- Follow font-size conventions: `text-[13px]` for body, `text-[11px] font-mono uppercase tracking-wider` for labels, `font-display` for serif headings
- Workspace ID comes from route params: `const { id: workspaceId } = useParams()`
- Error display via `<ErrorAlert error={...} fallback="..." />`

---

### Task 1: Add tab navigation to WorkspaceDetailPage

**Files:**
- Modify: `client/src/pages/WorkspaceDetailPage.tsx`

**Interfaces:**
- Produces: tabs state `"boards" | "clients" | "sops" | "members"` with URL hash sync
- Produces: tab rendering slots for `<ClientsTab />` and `<SopsTab />` (placeholders for now)

- [ ] **Step 1: Read the current WorkspaceDetailPage to understand its structure**

```bash
cat client/src/pages/WorkspaceDetailPage.tsx | head -100
```

- [ ] **Step 2: Add tab state and navigation UI** inside the page component, below the workspace header section:

```tsx
const [activeTab, setActiveTab] = useState<"boards" | "clients" | "sops" | "members">("boards");

// Tab nav bar (add between header and content):
<div className="flex items-center gap-1 border-b border-border mb-6 -mx-8 px-8">
  {(["boards", "clients", "sops", "members"] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors capitalize ${
        activeTab === tab
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {tab === "sops" ? "SOPs & Library" : tab === "clients" ? "Clients & Reports" : tab === "members" ? "Members" : "Boards & Tasks"}
    </button>
  ))}
</div>

// Conditional rendering in content area:
{activeTab === "boards" && <BoardsSection workspaceId={workspaceId} />}
{activeTab === "clients" && <ClientsTab workspaceId={workspaceId} />}
{activeTab === "sops" && <SopsTab workspaceId={workspaceId} />}
{activeTab === "members" && <MembersSection workspaceId={workspaceId} />}
```

Note: wrap the existing boards/members content in `<BoardsSection>` and `<MembersSection>` sub-components or just render conditionally with `{activeTab === "boards" && <existing JSX />}`.

- [ ] **Step 3: Add stub components so the page compiles**

Create `client/src/components/ClientsTab.tsx`:
```tsx
export default function ClientsTab({ workspaceId }: { workspaceId: string }) {
  return <div className="text-muted-foreground text-[13px]">Clients coming soon…</div>;
}
```

Create `client/src/components/SopsTab.tsx`:
```tsx
export default function SopsTab({ workspaceId }: { workspaceId: string }) {
  return <div className="text-muted-foreground text-[13px]">SOPs coming soon…</div>;
}
```

- [ ] **Step 4: Verify page loads with tabs visible**

Open `http://localhost:5173/workspaces/SOME_ID`, confirm 4 tabs render and clicking switches content.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/WorkspaceDetailPage.tsx client/src/components/ClientsTab.tsx client/src/components/SopsTab.tsx
git commit -m "feat(ui): add workspace tab navigation (boards, clients, sops, members)"
```

---

### Task 2: Build ClientsTab component

**Files:**
- Modify: `client/src/components/ClientsTab.tsx`
- Create: `client/src/components/ClientCard.tsx`
- Create: `client/src/components/ClientDetail.tsx`
- Create: `client/src/components/ClientForm.tsx`

**Interfaces:**
- Consumes: `GET /api/workspaces/:workspaceId/clients` → `Client & { hoursUsedThisMonth: number }[]`
- Consumes: `POST /`, `PATCH /:id`, `DELETE /:id` from clients router
- Produces: Client grid with burn bars, add/edit modal, client detail view

- [ ] **Step 1: Build `ClientCard.tsx`**

```tsx
import { Client } from "@/types/client";

interface Props {
  client: Client & { hoursUsedThisMonth: number };
  onClick: () => void;
}

export default function ClientCard({ client, onClick }: Props) {
  const pct = client.retainerHours > 0
    ? Math.min(100, (client.hoursUsedThisMonth / client.retainerHours) * 100)
    : 0;
  const burnColor = pct > 95 ? "bg-[#fdebec]" : pct > 75 ? "bg-[#fbf3db]" : "bg-[#edf3ec]";
  const burnBarColor = pct > 95 ? "bg-red-500" : pct > 75 ? "bg-yellow-500" : "bg-green-600";

  const statusColors: Record<string, string> = {
    Active: "bg-[#edf3ec] text-[#346538]",
    Onboarding: "bg-[#fbf3db] text-[#956400]",
    Paused: "bg-secondary text-muted-foreground",
  };

  return (
    <div
      onClick={onClick}
      className="bg-background border border-border rounded-md p-5 cursor-pointer hover:border-primary/40 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all"
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-[15px] font-semibold text-foreground">{client.name}</h3>
        <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-sm ${statusColors[client.status] ?? "bg-secondary text-muted-foreground"}`}>
          {client.status}
        </span>
      </div>
      {client.type && <p className="text-[12px] text-muted-foreground mb-3">{client.type}</p>}

      <div className="text-[11px] text-muted-foreground mb-1 font-mono">
        Retainer burn — {client.hoursUsedThisMonth.toFixed(1)} / {client.retainerHours}h ({Math.round(pct)}%)
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${burnBarColor}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>${client.rate}/h</span>
        <span>Est. ${(client.hoursUsedThisMonth * client.rate).toFixed(0)} billed</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build `ClientForm.tsx`** (add/edit dialog)

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClientSchema, type CreateClientInput } from "core/schemas/clients.ts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ErrorAlert from "@/components/ErrorAlert";
import { UseMutationResult } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: Partial<CreateClientInput>;
  mutation: UseMutationResult<any, Error, CreateClientInput>;
  title: string;
}

export default function ClientForm({ open, onOpenChange, defaultValues, mutation, title }: Props) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: { retainerHours: 0, rate: 0, status: "Active", emailDomains: [], ...defaultValues },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg rounded-md border border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Client Name *</Label>
            <Input {...register("name")} className="rounded-sm" />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Type</Label>
              <Input {...register("type")} placeholder="E-commerce, SaaS…" className="rounded-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Status</Label>
              <select {...register("status")} className="w-full border border-border rounded-sm px-3 py-2 text-[13px] bg-background">
                <option value="Active">Active</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Retainer Hours / Month</Label>
              <Input type="number" min={0} step={0.5} {...register("retainerHours", { valueAsNumber: true })} className="rounded-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Hourly Rate ($)</Label>
              <Input type="number" min={0} step={1} {...register("rate", { valueAsNumber: true })} className="rounded-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Email Domains (comma-separated)</Label>
            <Input placeholder="acmestore.com, acme.io" className="rounded-sm"
              onChange={(e) => {
                // Handled via controller — simpler approach: use a hidden input approach or Controller
              }}
              {...register("emailDomains", {
                setValueAs: (v: string) => typeof v === "string" ? v.split(",").map(d => d.trim()).filter(Boolean) : v,
              })}
            />
            <p className="text-[10px] text-muted-foreground">Used to auto-match inbound support emails to this client.</p>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea {...register("notes")} rows={3} className="rounded-sm resize-none" />
          </div>
          <ErrorAlert error={mutation.error} fallback="Failed to save client" />
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-sm">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="rounded-sm">
              {mutation.isPending ? "Saving…" : "Save Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Build the full `ClientsTab.tsx`**

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import ClientCard from "@/components/ClientCard";
import ClientForm from "@/components/ClientForm";
import ErrorAlert from "@/components/ErrorAlert";

interface Client { id: string; name: string; type?: string; status: string; retainerHours: number; rate: number; notes?: string; emailDomains: string[]; hoursUsedThisMonth: number; }

export default function ClientsTab({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data: clients = [], isLoading, error } = useQuery<Client[]>({
    queryKey: ["clients", workspaceId],
    queryFn: async () => { const { data } = await axios.get(`/api/workspaces/${workspaceId}/clients`); return data; },
  });

  const createMutation = useMutation({
    mutationFn: async (input: any) => { const { data } = await axios.post(`/api/workspaces/${workspaceId}/clients`, input); return data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients", workspaceId] }); setAddOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: any) => { const { data } = await axios.patch(`/api/workspaces/${workspaceId}/clients/${selectedClient?.id}`, input); return data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients", workspaceId] }); setSelectedClient(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await axios.delete(`/api/workspaces/${workspaceId}/clients/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients", workspaceId] }); setSelectedClient(null); },
  });

  const generatePackMutation = useMutation({
    mutationFn: async (clientId: string) => { const { data } = await axios.post(`/api/workspaces/${workspaceId}/clients/${clientId}/generate-pack`); return data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks", workspaceId] }); },
  });

  const totalHours = clients.reduce((s, c) => s + c.hoursUsedThisMonth, 0);
  const totalRevenue = clients.reduce((s, c) => s + c.hoursUsedThisMonth * c.rate, 0);

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

      {/* Edit dialog */}
      {selectedClient && (
        <ClientForm
          open={!!selectedClient}
          onOpenChange={(v) => { if (!v) setSelectedClient(null); }}
          defaultValues={selectedClient}
          mutation={updateMutation}
          title={`Edit — ${selectedClient.name}`}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify clients tab loads and shows KPIs and the Add Client button**

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ClientsTab.tsx client/src/components/ClientCard.tsx client/src/components/ClientForm.tsx
git commit -m "feat(ui): implement Clients tab with retainer burn metrics and CRUD"
```

---

### Task 3: Build SopsTab component

**Files:**
- Modify: `client/src/components/SopsTab.tsx`
- Create: `client/src/components/SopCard.tsx`
- Create: `client/src/components/KbArticleList.tsx`

**Interfaces:**
- Consumes: `GET /api/workspaces/:workspaceId/sops` → `SOP & { steps: SOPStep[] }[]`
- Consumes: `GET /api/workspaces/:workspaceId/kb` → `KnowledgeBase[]`
- Produces: Accordion SOP list + KB article management

- [ ] **Step 1: Build `SopCard.tsx`**

```tsx
import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";

interface SOPStep { id: string; text: string; position: number; }
interface SOP { id: string; title: string; category: string; tools?: string; steps: SOPStep[]; }

interface Props { sop: SOP; onDelete: (id: string) => void; }

export default function SopCard({ sop, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-md bg-background">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-[13px] font-semibold text-foreground">{sop.title}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-sm">{sop.category}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(sop.id); }}
          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-sm"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-1.5">
          {sop.tools && <p className="text-[11px] text-muted-foreground mb-2 font-mono">Tools: {sop.tools}</p>}
          {sop.steps.map((step, i) => (
            <div key={step.id} className="flex items-start gap-2 text-[13px] text-foreground">
              <span className="text-[10px] font-mono text-muted-foreground w-5 shrink-0 mt-0.5">{i + 1}.</span>
              <span>{step.text}</span>
            </div>
          ))}
          {sop.steps.length === 0 && <p className="text-[12px] text-muted-foreground">No steps defined.</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build the full `SopsTab.tsx`**

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import SopCard from "@/components/SopCard";
import ErrorAlert from "@/components/ErrorAlert";

export default function SopsTab({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [kbSearch, setKbSearch] = useState("");
  const [activeSection, setActiveSection] = useState<"sops" | "kb">("sops");

  const { data: sops = [], error: sopsError } = useQuery<any[]>({
    queryKey: ["sops", workspaceId],
    queryFn: async () => { const { data } = await axios.get(`/api/workspaces/${workspaceId}/sops`); return data; },
  });

  const { data: kbArticles = [], error: kbError } = useQuery<any[]>({
    queryKey: ["kb", workspaceId],
    queryFn: async () => { const { data } = await axios.get(`/api/workspaces/${workspaceId}/kb`); return data; },
  });

  const deleteSopMutation = useMutation({
    mutationFn: async (id: string) => { await axios.delete(`/api/workspaces/${workspaceId}/sops/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sops", workspaceId] }),
  });

  const deleteKbMutation = useMutation({
    mutationFn: async (id: string) => { await axios.delete(`/api/workspaces/${workspaceId}/kb/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb", workspaceId] }),
  });

  const filteredSops = sops.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()));
  const filteredKb = kbArticles.filter(a => a.title.toLowerCase().includes(kbSearch.toLowerCase()) || a.keywords.toLowerCase().includes(kbSearch.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border">
        {(["sops", "kb"] as const).map((s) => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${activeSection === s ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {s === "sops" ? "SOPs & Templates" : "Knowledge Base"}
          </button>
        ))}
      </div>

      {activeSection === "sops" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SOPs…" className="pl-8 rounded-sm h-8 text-[13px]" />
            </div>
          </div>
          {sopsError && <ErrorAlert error={sopsError} fallback="Failed to load SOPs" />}
          <div className="space-y-2">
            {filteredSops.map(sop => (
              <SopCard key={sop.id} sop={sop} onDelete={(id) => deleteSopMutation.mutate(id)} />
            ))}
            {filteredSops.length === 0 && <p className="text-[13px] text-muted-foreground py-6 text-center">No SOPs found.</p>}
          </div>
        </div>
      )}

      {activeSection === "kb" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={kbSearch} onChange={(e) => setKbSearch(e.target.value)} placeholder="Search articles…" className="pl-8 rounded-sm h-8 text-[13px]" />
            </div>
          </div>
          {kbError && <ErrorAlert error={kbError} fallback="Failed to load Knowledge Base" />}
          <div className="space-y-2">
            {filteredKb.map((a) => (
              <div key={a.id} className="border border-border rounded-md p-4 bg-background">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{a.title}</p>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-primary mt-0.5">{a.category}</p>
                    <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">Keywords: {a.keywords}</p>
                  </div>
                  <button onClick={() => deleteKbMutation.mutate(a.id)} className="text-muted-foreground hover:text-destructive p-1 rounded-sm transition-colors shrink-0">
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {filteredKb.length === 0 && <p className="text-[13px] text-muted-foreground py-6 text-center">No KB articles yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify SOPs tab loads with sub-tabs**

- [ ] **Step 4: Commit**

```bash
git add client/src/components/SopsTab.tsx client/src/components/SopCard.tsx
git commit -m "feat(ui): implement SOPs & KB Library tab"
```
