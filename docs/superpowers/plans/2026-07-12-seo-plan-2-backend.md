# SEO Agency Integration — Plan 2: Backend API Routers

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement four new Express routers for Clients, SOPs, TimeLogs, and KnowledgeBase; extend existing webhooks handler for client-domain matching and KB-powered AI draft replies.

**Architecture:** All routers mount under `/api/workspaces/:workspaceId/` and use the existing `requireAuth` + `requireWorkspaceMember` middleware chain. Zod schemas live in `core/schemas/`. Handlers follow the no-try-catch pattern (Express 5).

**Tech Stack:** Express 5, Prisma, Zod (v4), Vercel AI SDK (`@ai-sdk/openai`), pg-boss

## Global Constraints
- Import `requireAuth` from `../middleware/require-auth`
- Import `requireWorkspaceMember` from `../middleware/require-workspace-member`
- Import `validate` from `../lib/validate`
- Import `parseId` from `../lib/parse-id` (for integer IDs only; string UUIDs need no parsing)
- Use `Router({ mergeParams: true })` on every new router
- No try/catch — Express 5 catches rejected promises
- Zod schemas go in `core/schemas/` and are imported in both client and server
- Mount all new routers in `server/src/index.ts` under `requireAuth, requireWorkspaceMember`

---

### Task 1: Zod schemas for Clients

**Files:**
- Create: `core/schemas/clients.ts`

**Interfaces:**
- Produces: `createClientSchema`, `updateClientSchema`, `ClientStatus` type

- [ ] **Step 1: Create `core/schemas/clients.ts`**

```typescript
import { z } from "zod/v4";

export type ClientStatus = "Active" | "Onboarding" | "Paused";

export const createClientSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().max(80).optional(),
  retainerHours: z.number().min(0).default(0),
  rate: z.number().min(0).default(0),
  status: z.enum(["Active", "Onboarding", "Paused"]).default("Active"),
  notes: z.string().max(2000).optional(),
  emailDomains: z.array(z.string().min(1)).default([]),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
```

---

### Task 2: Zod schemas for SOPs, TimeLogs, KnowledgeBase

**Files:**
- Create: `core/schemas/sops.ts`
- Create: `core/schemas/timelogs.ts`
- Create: `core/schemas/kb.ts`

**Interfaces:**
- Produces: `createSopSchema`, `createTimeLogSchema`, `createKbArticleSchema`, Zod types

- [ ] **Step 1: Create `core/schemas/sops.ts`**

```typescript
import { z } from "zod/v4";

export const createSopStepSchema = z.object({
  text: z.string().min(1),
  position: z.number().int().min(0),
});

export const createSopSchema = z.object({
  title: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  tools: z.string().max(300).optional(),
  steps: z.array(createSopStepSchema).default([]),
});

export type CreateSopInput = z.infer<typeof createSopSchema>;
```

- [ ] **Step 2: Create `core/schemas/timelogs.ts`**

```typescript
import { z } from "zod/v4";

export const createTimeLogSchema = z.object({
  hours: z.number().min(0.1).max(24),
  date: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
  taskId: z.string().uuid().optional(),
  ticketId: z.number().int().positive().optional(),
});

export type CreateTimeLogInput = z.infer<typeof createTimeLogSchema>;
```

- [ ] **Step 3: Create `core/schemas/kb.ts`**

```typescript
import { z } from "zod/v4";

export const createKbArticleSchema = z.object({
  title: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  keywords: z.string().min(1).max(500),
  content: z.string().min(1).max(10000),
});

export const updateKbArticleSchema = createKbArticleSchema.partial();

export type CreateKbArticleInput = z.infer<typeof createKbArticleSchema>;
export type UpdateKbArticleInput = z.infer<typeof updateKbArticleSchema>;
```

---

### Task 3: Clients router

**Files:**
- Create: `server/src/routes/clients.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: `createClientSchema`, `updateClientSchema` from `core/schemas/clients.ts`
- Consumes: `req.workspaceId` (set by `requireWorkspaceMember`)
- Produces: REST endpoints for CRUD + generate-pack

- [ ] **Step 1: Create `server/src/routes/clients.ts`**

```typescript
import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import prisma from "../db";
import { createClientSchema, updateClientSchema } from "core/schemas/clients.ts";

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/clients
router.get("/", requireAuth, async (req, res) => {
  const workspaceId = req.workspaceId!;

  const clients = await prisma.client.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { tickets: true, tasks: true } },
    },
  });

  // Aggregate logged hours this month per client
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const timeLogTotals = await prisma.timeLog.groupBy({
    by: ["ticketId", "taskId"],
    where: {
      workspaceId,
      date: { gte: monthStart },
    },
    _sum: { hours: true },
  });

  // Map clientId to hours (via task.clientId or ticket.clientId)
  const tasks = await prisma.task.findMany({
    where: { workspaceId, clientId: { not: null } },
    select: { id: true, clientId: true },
  });
  const tickets = await prisma.ticket.findMany({
    where: { workspaceId, clientId: { not: null } },
    select: { id: true, clientId: true },
  });

  const taskClientMap = new Map(tasks.map((t) => [t.id, t.clientId!]));
  const ticketClientMap = new Map(tickets.map((t) => [t.id, t.clientId!]));

  const hoursThisMonth: Record<string, number> = {};
  for (const log of timeLogTotals) {
    const clientId =
      (log.taskId ? taskClientMap.get(log.taskId) : undefined) ??
      (log.ticketId ? ticketClientMap.get(log.ticketId) : undefined);
    if (clientId) {
      hoursThisMonth[clientId] = (hoursThisMonth[clientId] ?? 0) + (log._sum.hours ?? 0);
    }
  }

  res.json(
    clients.map((c) => ({
      ...c,
      hoursUsedThisMonth: hoursThisMonth[c.id] ?? 0,
    }))
  );
});

// POST /api/workspaces/:workspaceId/clients
router.post("/", requireAuth, async (req, res) => {
  const data = validate(createClientSchema, req.body, res);
  if (!data) return;

  const client = await prisma.client.create({
    data: { ...data, workspaceId: req.workspaceId! },
  });
  res.status(201).json(client);
});

// PATCH /api/workspaces/:workspaceId/clients/:id
router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const data = validate(updateClientSchema, req.body, res);
  if (!data) return;

  const existing = await prisma.client.findUnique({
    where: { id, workspaceId: req.workspaceId! },
  });
  if (!existing) { res.status(404).json({ error: "Client not found" }); return; }

  const updated = await prisma.client.update({ where: { id }, data });
  res.json(updated);
});

// DELETE /api/workspaces/:workspaceId/clients/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.client.findUnique({
    where: { id, workspaceId: req.workspaceId! },
  });
  if (!existing) { res.status(404).json({ error: "Client not found" }); return; }

  await prisma.client.delete({ where: { id } });
  res.status(204).end();
});

// POST /api/workspaces/:workspaceId/clients/:id/generate-pack
// Creates 4 standard monthly retainer tickets for the client
router.post("/:id/generate-pack", requireAuth, async (req, res) => {
  const { id } = req.params;
  const workspaceId = req.workspaceId!;

  const client = await prisma.client.findUnique({ where: { id, workspaceId } });
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  const PACK_TEMPLATES = [
    { title: `Technical SEO Audit — ${client.name}`, phase: "Technical", estHours: 8 },
    { title: `Content Brief + Article — ${client.name}`, phase: "Content", estHours: 6 },
    { title: `Link Building Campaign — ${client.name}`, phase: "Link Building", estHours: 10 },
    { title: `Monthly Performance Report — ${client.name}`, phase: "Reporting", estHours: 3 },
  ];

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  // Find or use the first board in the workspace for task creation
  const board = await prisma.board.findFirst({ where: { workspaceId }, include: { columns: { orderBy: { position: "asc" }, take: 1 } } });

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  const taskKeyPrefix = workspace?.slug?.toUpperCase().slice(0, 4) ?? "TASK";

  const existingCount = await prisma.task.count({ where: { workspaceId } });

  const tasks = await Promise.all(
    PACK_TEMPLATES.map(async (tpl, i) => {
      const taskKey = `${taskKeyPrefix}-${existingCount + i + 1}`;
      return prisma.task.create({
        data: {
          taskKey,
          title: tpl.title,
          description: "",
          workspaceId,
          clientId: id,
          phase: tpl.phase,
          estHours: tpl.estHours,
          priority: "medium",
          position: existingCount + i,
          creatorId: req.user!.id,
          boardId: board?.id ?? null,
          boardColumnId: board?.columns[0]?.id ?? null,
        },
      });
    })
  );

  res.status(201).json({ tasks, count: tasks.length });
});

export default router;
```

- [ ] **Step 2: Mount the router in `server/src/index.ts`**

Add import at the top of index.ts:
```typescript
import clientsRouter from "./routes/clients";
```

Add mount line with the other workspace-scoped routes:
```typescript
app.use("/api/workspaces/:workspaceId/clients", requireAuth, requireWorkspaceMember, clientsRouter);
```

- [ ] **Step 3: Start the server and verify**

```bash
cd server && bun run dev
```

Then test:
```bash
curl -s http://localhost:3000/api/workspaces/SOME_WS_ID/clients -H "Cookie: YOUR_SESSION"
```

Expected: `[]` (empty array, no error)

- [ ] **Step 4: Commit**

```bash
git add core/schemas/clients.ts server/src/routes/clients.ts server/src/index.ts
git commit -m "feat(api): add Clients router with CRUD and generate-pack endpoint"
```

---

### Task 4: SOPs router

**Files:**
- Create: `server/src/routes/sops.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: `createSopSchema` from `core/schemas/sops.ts`
- Produces: `GET /`, `POST /`, `DELETE /:id`

- [ ] **Step 1: Create `server/src/routes/sops.ts`**

```typescript
import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import prisma from "../db";
import { createSopSchema } from "core/schemas/sops.ts";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, async (req, res) => {
  const sops = await prisma.sOP.findMany({
    where: { workspaceId: req.workspaceId! },
    include: { steps: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(sops);
});

router.post("/", requireAuth, async (req, res) => {
  const data = validate(createSopSchema, req.body, res);
  if (!data) return;

  const { steps, ...sopData } = data;
  const sop = await prisma.sOP.create({
    data: {
      ...sopData,
      workspaceId: req.workspaceId!,
      steps: { create: steps.map((s) => ({ text: s.text, position: s.position })) },
    },
    include: { steps: { orderBy: { position: "asc" } } },
  });
  res.status(201).json(sop);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.sOP.findUnique({ where: { id, workspaceId: req.workspaceId! } });
  if (!existing) { res.status(404).json({ error: "SOP not found" }); return; }

  await prisma.sOP.delete({ where: { id } });
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Mount in `server/src/index.ts`**

```typescript
import sopsRouter from "./routes/sops";
// ...
app.use("/api/workspaces/:workspaceId/sops", requireAuth, requireWorkspaceMember, sopsRouter);
```

- [ ] **Step 3: Commit**

```bash
git add core/schemas/sops.ts server/src/routes/sops.ts server/src/index.ts
git commit -m "feat(api): add SOPs router"
```

---

### Task 5: TimeLogs router

**Files:**
- Create: `server/src/routes/timelogs.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: `createTimeLogSchema` from `core/schemas/timelogs.ts`
- Produces: `GET /`, `POST /`, `DELETE /:id`

- [ ] **Step 1: Create `server/src/routes/timelogs.ts`**

```typescript
import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import prisma from "../db";
import { createTimeLogSchema } from "core/schemas/timelogs.ts";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, async (req, res) => {
  const { clientId, taskId, ticketId } = req.query as Record<string, string>;

  // Build filter
  const where: any = { workspaceId: req.workspaceId! };
  if (taskId) where.taskId = taskId;
  if (ticketId) where.ticketId = Number(ticketId);

  const logs = await prisma.timeLog.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  // If filtering by clientId, filter via task/ticket relations
  if (clientId) {
    const clientTasks = await prisma.task.findMany({ where: { workspaceId: req.workspaceId!, clientId }, select: { id: true } });
    const clientTickets = await prisma.ticket.findMany({ where: { workspaceId: req.workspaceId!, clientId }, select: { id: true } });
    const taskIds = new Set(clientTasks.map((t) => t.id));
    const ticketIds = new Set(clientTickets.map((t) => t.id));
    const filtered = logs.filter((l) => (l.taskId && taskIds.has(l.taskId)) || (l.ticketId && ticketIds.has(l.ticketId)));
    return res.json(filtered);
  }

  res.json(logs);
});

router.post("/", requireAuth, async (req, res) => {
  const data = validate(createTimeLogSchema, req.body, res);
  if (!data) return;

  const log = await prisma.timeLog.create({
    data: {
      ...data,
      date: data.date ? new Date(data.date) : new Date(),
      userId: req.user!.id,
      workspaceId: req.workspaceId!,
    },
    include: { user: { select: { id: true, name: true } } },
  });
  res.status(201).json(log);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.timeLog.findUnique({ where: { id, workspaceId: req.workspaceId! } });
  if (!existing) { res.status(404).json({ error: "Time log not found" }); return; }
  if (existing.userId !== req.user!.id && req.workspaceRole !== "owner" && req.workspaceRole !== "admin") {
    res.status(403).json({ error: "Not authorized" }); return;
  }

  await prisma.timeLog.delete({ where: { id } });
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Mount in `server/src/index.ts`**

```typescript
import timeLogsRouter from "./routes/timelogs";
// ...
app.use("/api/workspaces/:workspaceId/timelogs", requireAuth, requireWorkspaceMember, timeLogsRouter);
```

- [ ] **Step 3: Commit**

```bash
git add core/schemas/timelogs.ts server/src/routes/timelogs.ts server/src/index.ts
git commit -m "feat(api): add TimeLogs router"
```

---

### Task 6: KnowledgeBase router

**Files:**
- Create: `server/src/routes/kb.ts`
- Modify: `server/src/index.ts`

**Interfaces:**
- Consumes: `createKbArticleSchema`, `updateKbArticleSchema` from `core/schemas/kb.ts`
- Produces: `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id`

- [ ] **Step 1: Create `server/src/routes/kb.ts`**

```typescript
import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import prisma from "../db";
import { createKbArticleSchema, updateKbArticleSchema } from "core/schemas/kb.ts";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, async (req, res) => {
  const articles = await prisma.knowledgeBase.findMany({
    where: { workspaceId: req.workspaceId! },
    orderBy: { createdAt: "desc" },
  });
  res.json(articles);
});

router.post("/", requireAuth, async (req, res) => {
  const data = validate(createKbArticleSchema, req.body, res);
  if (!data) return;

  const article = await prisma.knowledgeBase.create({
    data: { ...data, workspaceId: req.workspaceId! },
  });
  res.status(201).json(article);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const data = validate(updateKbArticleSchema, req.body, res);
  if (!data) return;

  const existing = await prisma.knowledgeBase.findUnique({ where: { id, workspaceId: req.workspaceId! } });
  if (!existing) { res.status(404).json({ error: "Article not found" }); return; }

  const updated = await prisma.knowledgeBase.update({ where: { id }, data });
  res.json(updated);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.knowledgeBase.findUnique({ where: { id, workspaceId: req.workspaceId! } });
  if (!existing) { res.status(404).json({ error: "Article not found" }); return; }

  await prisma.knowledgeBase.delete({ where: { id } });
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Mount in `server/src/index.ts`**

```typescript
import kbRouter from "./routes/kb";
// ...
app.use("/api/workspaces/:workspaceId/kb", requireAuth, requireWorkspaceMember, kbRouter);
```

- [ ] **Step 3: Commit**

```bash
git add core/schemas/kb.ts server/src/routes/kb.ts server/src/index.ts
git commit -m "feat(api): add KnowledgeBase router"
```

---

### Task 7: Update inbound email webhook for client matching + KB draft reply

**Files:**
- Modify: `server/src/routes/webhooks.ts`
- Modify: `server/src/lib/auto-resolve-ticket.ts` (or wherever the AI draft generation runs)

**Interfaces:**
- Consumes: `Client.emailDomains[]` from DB, `KnowledgeBase.keywords` from DB
- Produces: Ticket created with `clientId` set; AI draft reply using KB content as context

- [ ] **Step 1: View current webhooks handler to understand where ticket is created**

Read `server/src/routes/webhooks.ts` top to bottom before making changes.

- [ ] **Step 2: After ticket creation, add client-domain matching**

In the inbound email handler, after `const ticket = await prisma.ticket.create(...)`, add:

```typescript
// Auto-match client by sender email domain
const senderDomain = ticket.senderEmail.split("@")[1]?.toLowerCase();
if (senderDomain) {
  const matchedClient = await prisma.client.findFirst({
    where: {
      workspaceId: ticket.workspaceId,
      emailDomains: { has: senderDomain },
    },
  });
  if (matchedClient) {
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { clientId: matchedClient.id },
    });
  }
}
```

- [ ] **Step 3: Update AI reply draft generation to include KB context**

In the auto-resolve job (or wherever `isDraft: true` replies are created), fetch KB articles for the workspace and prepend them as context to the AI prompt:

```typescript
// Fetch workspace KB articles for context
const kbArticles = await prisma.knowledgeBase.findMany({
  where: { workspaceId: ticket.workspaceId },
  select: { title: true, keywords: true, content: true },
});

const kbContext = kbArticles.length > 0
  ? `\n\nKnowledge Base Articles for reference:\n` +
    kbArticles.map((a) => `## ${a.title}\n${a.content}`).join("\n\n")
  : "";

// Add kbContext to the system prompt before the AI call
const systemPrompt = `You are a helpful support agent...${kbContext}`;
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/webhooks.ts
git commit -m "feat(ai): auto-match client by email domain and inject KB context into draft replies"
```
