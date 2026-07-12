import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import prisma from "../db";
import { createTimeLogSchema } from "core/schemas/timelogs.ts";

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/timelogs
router.get("/", requireAuth, async (req, res) => {
  const { clientId, taskId, ticketId } = req.query as Record<string, string>;
  const workspaceId = req.workspaceId!;

  const where: Record<string, unknown> = { workspaceId };
  if (taskId) where.taskId = taskId;
  if (ticketId) where.ticketId = Number(ticketId);

  const logs = await prisma.timeLog.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  // Filter by clientId through task/ticket relations if needed
  if (clientId) {
    const clientTasks = await prisma.task.findMany({
      where: { workspaceId, clientId },
      select: { id: true },
    });
    const clientTickets = await prisma.ticket.findMany({
      where: { workspaceId, clientId },
      select: { id: true },
    });
    const taskIds = new Set(clientTasks.map((t) => t.id));
    const ticketIds = new Set(clientTickets.map((t) => t.id));
    const filtered = logs.filter(
      (l) =>
        (l.taskId && taskIds.has(l.taskId)) ||
        (l.ticketId && ticketIds.has(l.ticketId))
    );
    res.json(filtered);
    return;
  }

  res.json(logs);
});

// POST /api/workspaces/:workspaceId/timelogs
router.post("/", requireAuth, async (req, res) => {
  const data = validate(createTimeLogSchema, req.body, res);
  if (!data) return;

  const log = await prisma.timeLog.create({
    data: {
      hours: data.hours,
      date: data.date ? new Date(data.date) : new Date(),
      note: data.note,
      taskId: data.taskId,
      ticketId: data.ticketId,
      userId: req.user!.id,
      workspaceId: req.workspaceId!,
    },
    include: { user: { select: { id: true, name: true } } },
  });
  res.status(201).json(log);
});

// DELETE /api/workspaces/:workspaceId/timelogs/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const existing = await prisma.timeLog.findUnique({
    where: { id, workspaceId: req.workspaceId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Time log not found" });
    return;
  }
  if (
    existing.userId !== req.user!.id &&
    req.workspaceRole !== "owner" &&
    req.workspaceRole !== "admin"
  ) {
    res.status(403).json({ error: "Not authorized" });
    return;
  }

  await prisma.timeLog.delete({ where: { id } });
  res.status(204).end();
});

export default router;
