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

  // Aggregate logged hours this month per client via their tasks/tickets
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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

  const logs = await prisma.timeLog.findMany({
    where: { workspaceId, date: { gte: monthStart } },
    select: { hours: true, taskId: true, ticketId: true },
  });

  const hoursThisMonth: Record<string, number> = {};
  for (const log of logs) {
    const clientId =
      (log.taskId ? taskClientMap.get(log.taskId) : undefined) ??
      (log.ticketId ? ticketClientMap.get(log.ticketId) : undefined);
    if (clientId) {
      hoursThisMonth[clientId] = (hoursThisMonth[clientId] ?? 0) + log.hours;
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
  const id = req.params.id as string;
  const data = validate(updateClientSchema, req.body, res);
  if (!data) return;

  const existing = await prisma.client.findUnique({
    where: { id, workspaceId: req.workspaceId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const updated = await prisma.client.update({ where: { id }, data });
  res.json(updated);
});

// DELETE /api/workspaces/:workspaceId/clients/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const existing = await prisma.client.findUnique({
    where: { id, workspaceId: req.workspaceId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  await prisma.client.delete({ where: { id } });
  res.status(204).end();
});

// POST /api/workspaces/:workspaceId/clients/:id/generate-pack
// Creates 4 standard monthly retainer tasks for the client
router.post("/:id/generate-pack", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const workspaceId = req.workspaceId!;

  const client = await prisma.client.findUnique({ where: { id, workspaceId } });
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const TEMPLATES = [
    {
      title: `Technical SEO Audit — ${client.name}`,
      phase: "Technical",
      estHours: 8,
      checklist: [
        "Full crawl (Screaming Frog)",
        "Index coverage & canonical review",
        "Core Web Vitals check",
        "Robots.txt & XML sitemap validation"
      ]
    },
    {
      title: `Content Brief + Article — ${client.name}`,
      phase: "Content",
      estHours: 6,
      checklist: [
        "Keyword cluster & intent confirmed",
        "Content brief written",
        "Draft written",
        "SEO QA & publishes"
      ]
    },
    {
      title: `Link Building Campaign — ${client.name}`,
      phase: "Link Building",
      estHours: 10,
      checklist: [
        "Prospect list built (50+ targets)",
        "Outreach templates personalized",
        "Batch 1 outreach sent"
      ]
    },
    {
      title: `Monthly Performance Report — ${client.name}`,
      phase: "Reporting",
      estHours: 3,
      checklist: [
        "Pull GSC & GA4 data",
        "Update ranking tracker",
        "Summarize completed work",
        "Send performance metrics"
      ]
    }
  ];

  const board = await prisma.board.findFirst({
    where: { workspaceId },
    include: { columns: { orderBy: { position: "asc" }, take: 1 } },
  });

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  const taskKeyPrefix = workspace?.slug?.toUpperCase().slice(0, 4) ?? "TASK";

  const existingCount = await prisma.task.count({ where: { workspaceId } });

  const createdTasks = await Promise.all(
    TEMPLATES.map(async (tpl, i) => {
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
          checklist: tpl.checklist.map((text) => ({ text, done: false })),
        },
      });
    })
  );

  res.status(201).json({ tasks: createdTasks, count: createdTasks.length });
});

export default router;
