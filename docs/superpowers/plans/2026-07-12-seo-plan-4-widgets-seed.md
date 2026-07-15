# SEO Agency Integration — Plan 4: Time Logging, Checklists & Impact Notes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the Time Log widget, interactive SOP Checklist, and mandatory Impact Note into the existing Ticket detail and Task detail side-sheet panels.

**Architecture:** These are panel-level enhancements: small focused components inserted into the right-side metadata column of `TicketDetailPage` and the `KanbanBoardPage` task side-sheet. The Impact Note enforcement blocks the status change API call on the frontend before submitting.

**Tech Stack:** React, TanStack Query, Axios, shadcn/ui, Zod

## Global Constraints
- Use `text-[13px]` for body text, `text-[10px] font-mono uppercase tracking-wider` for labels
- Time log `hours` must be between 0.1 and 24 (enforced by Zod schema from Plan 2)
- Impact note is required when status changes to `resolved` / `closed` (tickets) or when moving a task to the `Done` column
- Checklist state is stored as `Json` on the Ticket/Task — update it via `PATCH /api/tickets/:id` with `{ checklist: [...] }` or `PATCH /api/workspaces/:workspaceId/tasks/:taskKey`
- The workspace ID for task mutations must come from `useParams()` or passed as prop

---

### Task 1: TimeLogWidget component

**Files:**
- Create: `client/src/components/TimeLogWidget.tsx`

**Interfaces:**
- Props: `{ workspaceId: string; ticketId?: number; taskId?: string; }`
- Consumes: `GET /api/workspaces/:workspaceId/timelogs?ticketId=X` or `?taskId=Y`
- Consumes: `POST /api/workspaces/:workspaceId/timelogs`
- Produces: Inline time log list + form to add a new log

- [ ] **Step 1: Create `client/src/components/TimeLogWidget.tsx`**

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Plus } from "lucide-react";
import ErrorAlert from "@/components/ErrorAlert";

interface TimeLog {
  id: string;
  hours: number;
  date: string;
  note?: string;
  user: { id: string; name: string };
}

interface Props {
  workspaceId: string;
  ticketId?: number;
  taskId?: string;
}

export default function TimeLogWidget({ workspaceId, ticketId, taskId }: Props) {
  const qc = useQueryClient();
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const queryParams = ticketId ? `?ticketId=${ticketId}` : `?taskId=${taskId}`;
  const queryKey = ["timelogs", workspaceId, ticketId ?? taskId];

  const { data: logs = [] } = useQuery<TimeLog[]>({
    queryKey,
    queryFn: async () => {
      const { data } = await axios.get(`/api/workspaces/${workspaceId}/timelogs${queryParams}`);
      return data;
    },
    enabled: !!(ticketId || taskId),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post(`/api/workspaces/${workspaceId}/timelogs`, {
        hours: parseFloat(hours),
        note: note || undefined,
        ticketId,
        taskId,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setHours("");
      setNote("");
      setAddOpen(false);
    },
  });

  const totalHours = logs.reduce((s, l) => s + l.hours, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <Clock className="h-3 w-3" />
          Time Logged
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-foreground font-semibold">{totalHours.toFixed(1)}h total</span>
          <button
            onClick={() => setAddOpen(!addOpen)}
            className="text-primary hover:opacity-70 transition-opacity"
            title="Log time"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {addOpen && (
        <div className="border border-border rounded-sm p-3 bg-secondary/20 space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              min={0.1}
              max={24}
              step={0.25}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Hours (e.g. 1.5)"
              className="rounded-sm h-7 text-[12px] flex-1"
            />
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="rounded-sm h-7 text-[12px] flex-1"
            />
          </div>
          <ErrorAlert error={addMutation.error} fallback="Failed to log time" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddOpen(false)} className="h-6 text-[11px] rounded-sm px-2">Cancel</Button>
            <Button
              size="sm"
              onClick={() => addMutation.mutate()}
              disabled={!hours || isNaN(parseFloat(hours)) || addMutation.isPending}
              className="h-6 text-[11px] rounded-sm px-2"
            >
              {addMutation.isPending ? "Logging…" : "Log"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {logs.slice(0, 5).map((log) => (
          <div key={log.id} className="flex items-start justify-between text-[12px] py-1 border-b border-border last:border-0">
            <span className="text-muted-foreground">{log.user.name}</span>
            <div className="text-right">
              <span className="font-mono font-semibold text-foreground">{log.hours}h</span>
              {log.note && <span className="text-muted-foreground ml-2">{log.note}</span>}
            </div>
          </div>
        ))}
        {logs.length === 0 && <p className="text-[11px] text-muted-foreground">No time logged yet.</p>}
      </div>
    </div>
  );
}
```

---

### Task 2: ChecklistWidget component

**Files:**
- Create: `client/src/components/ChecklistWidget.tsx`

**Interfaces:**
- Props: `{ checklist: { text: string; done: boolean }[]; onUpdate: (updated: { text: string; done: boolean }[]) => void; }`
- Produces: Interactive checkbox list that calls `onUpdate` on each check/uncheck

- [ ] **Step 1: Create `client/src/components/ChecklistWidget.tsx`**

```tsx
import { CheckSquare, Square } from "lucide-react";

interface CheckItem { text: string; done: boolean; }

interface Props {
  checklist: CheckItem[];
  onUpdate: (updated: CheckItem[]) => void;
  disabled?: boolean;
}

export default function ChecklistWidget({ checklist, onUpdate, disabled }: Props) {
  const toggle = (index: number) => {
    const updated = checklist.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    );
    onUpdate(updated);
  };

  const doneCount = checklist.filter((i) => i.done).length;
  const pct = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

  if (checklist.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Checklist</span>
        <span className="text-[10px] font-mono text-muted-foreground">{doneCount}/{checklist.length} · {pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1">
        {checklist.map((item, i) => (
          <button
            key={i}
            onClick={() => !disabled && toggle(i)}
            disabled={disabled}
            className={`flex items-start gap-2 w-full text-left py-1 px-1 rounded-sm hover:bg-secondary/40 transition-colors ${disabled ? "cursor-default" : "cursor-pointer"}`}
          >
            {item.done
              ? <CheckSquare className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
              : <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
            <span className={`text-[12px] ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {item.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

### Task 3: ImpactNoteModal component

**Files:**
- Create: `client/src/components/ImpactNoteModal.tsx`

**Interfaces:**
- Props: `{ open: boolean; onConfirm: (impact: string) => void; onCancel: () => void; isPending: boolean; }`
- Produces: Modal dialog that gates status change to resolved/closed/Done, requiring non-empty impact note text

- [ ] **Step 1: Create `client/src/components/ImpactNoteModal.tsx`**

```tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onConfirm: (impact: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

export default function ImpactNoteModal({ open, onConfirm, onCancel, isPending }: Props) {
  const [impact, setImpact] = useState("");

  const handleConfirm = () => {
    if (!impact.trim()) return;
    onConfirm(impact.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-md rounded-md border border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal">Add Impact Note</DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Describe the measurable outcome of this work before marking it complete. This feeds the monthly client report.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Impact Note <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="e.g. Organic sessions increased 18% MoM; fixed 47 broken redirect chains."
              rows={4}
              className="rounded-sm resize-none text-[13px]"
              autoFocus
            />
            {impact.trim() === "" && <p className="text-[11px] text-muted-foreground">Required to mark as complete.</p>}
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-border">
            <Button variant="outline" onClick={onCancel} className="rounded-sm" disabled={isPending}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={!impact.trim() || isPending}
              className="rounded-sm"
            >
              {isPending ? "Saving…" : "Mark Complete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Task 4: Wire TimeLogWidget + ChecklistWidget into Ticket Detail

**Files:**
- Modify: `client/src/components/UpdateTicket.tsx` (or wherever the ticket right-panel metadata is rendered)

**Interfaces:**
- Consumes: `TimeLogWidget`, `ChecklistWidget`, `ImpactNoteModal`
- Consumes: `ticket.checklist` (Json array from API), `ticket.workspaceId`
- The ticket `PATCH` endpoint already accepts `checklist` and `impact` fields (added in Plan 1 schema)

- [ ] **Step 1: View `UpdateTicket.tsx` to find the metadata panel structure**

```bash
cat client/src/components/UpdateTicket.tsx
```

- [ ] **Step 2: Add imports**

```tsx
import TimeLogWidget from "@/components/TimeLogWidget";
import ChecklistWidget from "@/components/ChecklistWidget";
import ImpactNoteModal from "@/components/ImpactNoteModal";
```

- [ ] **Step 3: Add state for impact modal**

Inside the component:
```tsx
const [impactModalOpen, setImpactModalOpen] = useState(false);
const [pendingStatus, setPendingStatus] = useState<string | null>(null);
```

- [ ] **Step 4: Intercept status change to resolved/closed**

When the agent tries to change ticket status to `resolved` or `closed`, intercept and show the impact modal instead:

```tsx
const handleStatusChange = (newStatus: string) => {
  if ((newStatus === "resolved" || newStatus === "closed") && !ticket.impact) {
    setPendingStatus(newStatus);
    setImpactModalOpen(true);
  } else {
    updateMutation.mutate({ status: newStatus });
  }
};

const handleImpactConfirm = (impact: string) => {
  updateMutation.mutate({ status: pendingStatus!, impact }, {
    onSuccess: () => { setImpactModalOpen(false); setPendingStatus(null); }
  });
};
```

- [ ] **Step 5: Add widgets to the right-panel JSX** (in the metadata sidebar section):

```tsx
{/* Time Logging */}
<div className="border-t border-border pt-4">
  <TimeLogWidget
    workspaceId={ticket.workspaceId}
    ticketId={ticket.id}
  />
</div>

{/* Checklist (if present) */}
{ticket.checklist && Array.isArray(ticket.checklist) && ticket.checklist.length > 0 && (
  <div className="border-t border-border pt-4">
    <ChecklistWidget
      checklist={ticket.checklist as { text: string; done: boolean }[]}
      onUpdate={(updated) => updateMutation.mutate({ checklist: updated })}
    />
  </div>
)}

{/* Impact Note (if set) */}
{ticket.impact && (
  <div className="border-t border-border pt-4">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Impact</p>
    <p className="text-[12px] text-foreground">{ticket.impact}</p>
  </div>
)}

{/* Impact Modal */}
<ImpactNoteModal
  open={impactModalOpen}
  onConfirm={handleImpactConfirm}
  onCancel={() => { setImpactModalOpen(false); setPendingStatus(null); }}
  isPending={updateMutation.isPending}
/>
```

- [ ] **Step 6: Test the flow**

1. Open a ticket. Log some time — verify it appears in the widget.
2. Try to change status to "resolved" — impact note modal should appear.
3. Enter impact note and confirm — ticket should update with status and impact saved.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/TimeLogWidget.tsx client/src/components/ChecklistWidget.tsx client/src/components/ImpactNoteModal.tsx client/src/components/UpdateTicket.tsx
git commit -m "feat(ui): add TimeLog widget, SOP checklist, and Impact Note gate to ticket detail"
```

---

### Task 5: Wire TimeLogWidget + Checklist into Task side-sheet (KanbanBoardPage)

**Files:**
- Modify: `client/src/pages/KanbanBoardPage.tsx`

**Interfaces:**
- Consumes: `TimeLogWidget`, `ChecklistWidget`, `ImpactNoteModal`
- The task side-sheet already shows task details; we add widgets to it

- [ ] **Step 1: Add the same 3 imports to KanbanBoardPage.tsx**

```tsx
import TimeLogWidget from "@/components/TimeLogWidget";
import ChecklistWidget from "@/components/ChecklistWidget";
import ImpactNoteModal from "@/components/ImpactNoteModal";
```

- [ ] **Step 2: Add impact modal state alongside the existing task mutation state**

```tsx
const [impactModalOpen, setImpactModalOpen] = useState(false);
const [pendingColumnId, setPendingColumnId] = useState<string | null>(null);
```

- [ ] **Step 3: Find the column drag/drop handler or the status update for tasks** and intercept moves to "Done" column:

```tsx
// When moving a task to a column named "Done", check for impact note first
const handleTaskMove = (taskId: string, targetColumnId: string) => {
  const targetColumn = columns.find(c => c.id === targetColumnId);
  const selectedTask = tasks.find(t => t.id === taskId);
  if (targetColumn?.name === "Done" && !selectedTask?.impact) {
    setPendingColumnId(targetColumnId);
    setImpactModalOpen(true);
  } else {
    moveTask(taskId, targetColumnId);
  }
};

const handleTaskImpactConfirm = (impact: string) => {
  // Update task with impact + move to done column
  updateTaskMutation.mutate({ impact }, {
    onSuccess: () => {
      moveTask(selectedTask!.id, pendingColumnId!);
      setImpactModalOpen(false);
      setPendingColumnId(null);
    }
  });
};
```

- [ ] **Step 4: In the task side-sheet panel, add widgets below existing metadata**

```tsx
{/* Time Logging */}
{selectedTask && (
  <div className="border-t border-border pt-4 mt-4">
    <TimeLogWidget workspaceId={workspaceId} taskId={selectedTask.id} />
  </div>
)}

{/* Checklist */}
{selectedTask?.checklist && Array.isArray(selectedTask.checklist) && (
  <div className="border-t border-border pt-4">
    <ChecklistWidget
      checklist={selectedTask.checklist as { text: string; done: boolean }[]}
      onUpdate={(updated) => updateTaskMutation.mutate({ checklist: updated })}
    />
  </div>
)}

<ImpactNoteModal
  open={impactModalOpen}
  onConfirm={handleTaskImpactConfirm}
  onCancel={() => { setImpactModalOpen(false); setPendingColumnId(null); }}
  isPending={updateTaskMutation.isPending}
/>
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/KanbanBoardPage.tsx
git commit -m "feat(ui): add TimeLog widget, checklist, and Impact Note gate to Kanban task side-sheet"
```

---

### Task 6: Seed default SOPs and KB articles for new workspaces

**Files:**
- Modify: `server/prisma/reset-db.ts`

**Interfaces:**
- Produces: New workspaces get 6 default SOP entries and 6 KB articles seeded automatically

- [ ] **Step 1: Add default SOP data to the seed in `server/prisma/reset-db.ts`**

After the workspace is created, add:

```typescript
// Seed default SOPs for each workspace
const defaultSops = [
  { title: "On-Page Optimization", category: "Delivery", tools: "Surfer, GSC, Screaming Frog",
    steps: ["Validate target keyword & search intent", "Keyword in title, meta, H1, first 100 words", "Title tag ≤ 60 characters", "Meta description ≤ 160 characters", "Heading structure H1–H6 correct", "Image alt texts optimized", "3–5 internal links added", "Schema markup added/validated", "Page speed & mobile check", "Request indexing in GSC"] },
  { title: "Technical SEO Audit", category: "Delivery", tools: "Screaming Frog, GSC, Ahrefs",
    steps: ["Full crawl (Screaming Frog)", "Index coverage & canonical review", "Core Web Vitals check", "Robots.txt & XML sitemap validation", "Broken links / redirect chains", "Schema validation", "Mobile usability check", "Prioritized fix list delivered"] },
  { title: "Monthly Reporting", category: "Process", tools: "GSC, GA4, Looker Studio",
    steps: ["Data pull on 1st working day", "Rankings + traffic + conversions vs last month", "Completed work summary", "Wins, losses, and why", "Next month plan (3–5 priorities)", "PM review before sending", "Send by the 5th"] },
  { title: "Client Onboarding", category: "Process", tools: "GSC, GA4, Ahrefs",
    steps: ["Send access checklist (GSC, GA4, CMS)", "Kickoff call: goals, KPIs, history", "Document SOW, retainer hours, report dates", "Baseline audit + keyword landscape", "Share 90-day roadmap within 10 business days"] },
  { title: "Content Production", category: "Delivery", tools: "Ahrefs, Surfer, Google Docs",
    steps: ["Brief from keyword cluster", "Strategist approves brief before writing", "Writer drafts in template doc", "SEO QA against on-page checklist", "Publish + index request"] },
  { title: "Link Building Outreach", category: "Delivery", tools: "Ahrefs, Hunter, Pitchbox",
    steps: ["Prospect: relevance first, DR 30+ preferred", "Verify traffic is real", "Personalize first line of every email", "Max 2 follow-ups, 3–4 days apart", "Log every acquired link: URL, DR, anchor"] },
];

for (const sop of defaultSops) {
  await prisma.sOP.create({
    data: {
      title: sop.title,
      category: sop.category,
      tools: sop.tools,
      workspaceId: workspace.id,
      steps: {
        create: sop.steps.map((text, position) => ({ text, position })),
      },
    },
  });
}
```

- [ ] **Step 2: Add default KB articles**

```typescript
const defaultKb = [
  { title: "Traffic drop triage playbook", category: "Technical", keywords: "traffic,drop,rankings,decline,lost", content: "We are sorry to see the drop — here is what we do first: 1) check Search Console coverage and manual actions, 2) compare before/after crawls to catch noindex or redirect issues, 3) review recent Google updates. We run this triage within one business day and send findings." },
  { title: "404 / crawl error handling", category: "Technical", keywords: "404,error,crawl,search console,index,broken,redirect", content: "404 spikes usually come from changed URLs without redirects. We map the broken URLs, add 301 redirects to the closest match, and request a re-crawl. Most errors clear from the report within 1–2 weeks after fixing." },
  { title: "Billing & refund policy", category: "Billing", keywords: "refund,invoice,charged,billing,credit,payment,extra hours", content: "Our policy: hours beyond the retainer are only billed with prior written approval. If extra hours were billed without approval, we credit them on the next invoice or refund on request within 5 business days." },
  { title: "Reporting schedule", category: "Process", keywords: "report,monthly report,dashboard,numbers,metrics", content: "Monthly reports are delivered by the 5th working day and cover rankings, traffic, conversions, completed work and next month priorities." },
  { title: "Site speed / Core Web Vitals", category: "Technical", keywords: "speed,slow,core web vitals,theme,performance,vitals", content: "Theme or plugin changes are the most common cause of CWV regressions. We profile the templates, defer non-critical scripts, compress media and re-test. Expect a fix plan within 2 business days." },
  { title: "Services & pricing overview", category: "Sales", keywords: "services,pricing,offer,local seo,retainer,cost,quote", content: "Yes — we cover technical SEO, content, link building and local SEO. Retainers start at 20 hours/month; we will send a tailored proposal after a short discovery call." },
];

for (const article of defaultKb) {
  await prisma.knowledgeBase.create({
    data: { ...article, workspaceId: workspace.id },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add server/prisma/reset-db.ts
git commit -m "feat(seed): add default SOPs and Knowledge Base articles for new workspaces"
```
