import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import {
  createTaskSchema,
  updateTaskSchema,
  escalateTicketSchema,
} from "core/schemas/tasks.ts";
import prisma from "../db";
import { generateText } from "ai";
import { aiModel } from "../lib/ai";
import Sentry from "../lib/sentry";

const router = Router();

/** GET /api/tasks?workspaceId= - List all tasks in a workspace */
router.get("/", requireAuth, async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId || typeof workspaceId !== "string") {
    res.status(400).json({ error: "workspaceId query param is required" });
    return;
  }

  const tasks = await prisma.task.findMany({
    where: { workspaceId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
      boardColumn: { select: { id: true, name: true } },
      linkedTicket: { select: { id: true, subject: true, status: true } },
    },
    orderBy: [{ boardColumnId: "asc" }, { position: "asc" }],
  });

  res.json(tasks);
});

/** POST /api/tasks - Create a task */
router.post("/", requireAuth, async (req, res) => {
  const data = validate(createTaskSchema, req.body, res);
  if (!data) return;

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: data.workspaceId, userId: req.user.id } },
  });
  if (!member) {
    res.status(403).json({ error: "You are not a member of this workspace" });
    return;
  }

  // Generate sequential task key: count existing tasks + 1
  const count = await prisma.task.count({ where: { workspaceId: data.workspaceId } });
  const workspace = await prisma.workspace.findUnique({ where: { id: data.workspaceId } });
  const taskKey = `${workspace!.slug.toUpperCase().slice(0, 4)}-${count + 1}`;

  // Position at end of column
  const lastTask = await prisma.task.findFirst({
    where: { boardColumnId: data.boardColumnId },
    orderBy: { position: "desc" },
  });
  const position = (lastTask?.position ?? -1) + 1;

  const task = await prisma.task.create({
    data: {
      taskKey,
      title: data.title,
      description: data.description,
      priority: data.priority,
      position,
      workspaceId: data.workspaceId,
      boardId: data.boardId,
      boardColumnId: data.boardColumnId,
      teamId: data.teamId ?? null,
      assigneeId: data.assigneeId ?? null,
      creatorId: req.user.id,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
    },
  });

  // Notify assignee if set
  if (task.assigneeId && task.assignee?.email) {
    const { sendEmailJob, getClientUrl } = await import("../lib/send-email");
    const clientUrl = getClientUrl(req);
    await sendEmailJob({
      to: task.assignee.email,
      subject: `[${taskKey}] Task assigned to you`,
      body:
        `Hi ${task.assignee.name},\n\n` +
        `${req.user.name} assigned you a task:\n\n` +
        `${task.title}\n\n` +
        `Priority: ${task.priority.replace("_", " ")}\n\n` +
        `View Sprint Board and details here:\n` +
        `${clientUrl}/boards/${task.boardId}\n\n` +
        `— Launchpit Agency Team`,
    });
  }

  res.status(201).json(task);
});

/** PUT /api/tasks/:id - Update a task */
router.put("/:id", requireAuth, async (req, res) => {
  const data = validate(updateTaskSchema, req.body, res);
  if (!data) return;

  const existing = await prisma.task.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: existing.workspaceId, userId: req.user.id } },
  });
  if (!member) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const updated = await prisma.task.update({
    where: { id: req.params.id as string },
    data: {
      ...("title" in data && { title: data.title }),
      ...("description" in data && { description: data.description }),
      ...("priority" in data && { priority: data.priority }),
      ...("teamId" in data && { teamId: data.teamId }),
      ...("assigneeId" in data && { assigneeId: data.assigneeId }),
      ...("checklist" in data && { checklist: data.checklist }),
      ...("impact" in data && { impact: data.impact }),
      ...("phase" in data && { phase: data.phase }),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      team: { select: { id: true, name: true } },
    },
  });

  // Notify new assignee if changed
  const assigneeChanged = "assigneeId" in data && data.assigneeId !== existing.assigneeId;
  const updatedAssignee = (updated as typeof updated & { assignee: { id: string; name: string; email: string } | null }).assignee;
  if (assigneeChanged && updatedAssignee?.email) {
    const { sendEmailJob, getClientUrl } = await import("../lib/send-email");
    const clientUrl = getClientUrl(req);
    await sendEmailJob({
      to: updatedAssignee.email,
      subject: `[${updated.taskKey}] Task assigned to you`,
      body:
        `Hi ${updatedAssignee.name},\n\n` +
        `${req.user.name} assigned you the task:\n\n` +
        `${updated.title}\n\n` +
        `Priority: ${updated.priority.replace("_", " ")}\n\n` +
        `View Sprint Board and details here:\n` +
        `${clientUrl}/boards/${updated.boardId}\n\n` +
        `— Launchpit Agency Team`,
    });
  }

  res.json(updated);
});

/** DELETE /api/tasks/:id */
router.delete("/:id", requireAuth, async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id as string } });
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: req.user.id } },
  });
  if (!member) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await prisma.task.delete({ where: { id: req.params.id as string } });
  res.status(204).send();
});

/** POST /api/tasks/escalate - AI-powered ticket-to-task escalation */
router.post("/escalate", requireAuth, async (req, res) => {
  const data = validate(escalateTicketSchema, req.body, res);
  if (!data) return;

  // Verify membership
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: data.workspaceId, userId: req.user.id } },
  });
  if (!member) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Check ticket exists and isn't already escalated
  const ticket = await prisma.ticket.findUnique({
    where: { id: data.ticketId },
    include: { linkedTask: true },
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  if (ticket.linkedTask) {
    res.status(409).json({ error: "Ticket already has a linked task" });
    return;
  }

  // Fetch board + first column (Backlog)
  const board = await prisma.board.findUnique({
    where: { id: data.boardId },
    include: { columns: { orderBy: { position: "asc" } } },
  });
  if (!board || !board.columns[0]) {
    res.status(404).json({ error: "Board not found or has no columns" });
    return;
  }
  const backlogColumn = board.columns[0];

  // Fetch available teams in workspace for AI classification/assignment
  const teams = await prisma.team.findMany({
    where: { workspaceId: data.workspaceId },
    select: { id: true, name: true },
  });

  // Call Nvidia AI to generate structured task data from ticket
  let aiTitle = ticket.subject;
  let aiDescription = ticket.body;
  let aiPriority: "no_priority" | "low" | "medium" | "high" | "urgent" = "medium";
  let aiTeamId: string | null = null;

  try {
    const { text } = await generateText({
      model: aiModel,
      system:
        "You are a product engineering task generator. " +
        "Given a support ticket, generate a concise engineering task. " +
        "Return ONLY a JSON object with four keys: " +
        '"title" (concise task title, max 80 chars), ' +
        '"description" (detailed task description for engineers, max 500 chars), ' +
        '"priority" (one of: no_priority, low, medium, high, urgent), ' +
        '"teamId" (the ID of the most appropriate team from the list provided, or null if none fit). ' +
        "Do not include any other text.",
      prompt: `Support ticket subject: ${ticket.subject}\n\nBody:\n${ticket.body}\n\nAvailable Teams to assign to:\n${JSON.stringify(teams)}`,
    });

    const parsed = JSON.parse(text.trim());
    if (parsed.title) aiTitle = parsed.title;
    if (parsed.description) aiDescription = parsed.description;
    if (["no_priority", "low", "medium", "high", "urgent"].includes(parsed.priority)) {
      aiPriority = parsed.priority;
    }
    if (parsed.teamId && teams.some((t) => t.id === parsed.teamId)) {
      aiTeamId = parsed.teamId;
    }
  } catch (err) {
    Sentry.captureException(err);
    // Fall through with ticket data as default
    console.warn("[Escalate] AI generation failed, using ticket data as fallback:", err);
  }

  // Generate task key
  const count = await prisma.task.count({ where: { workspaceId: data.workspaceId } });
  const workspace = await prisma.workspace.findUnique({ where: { id: data.workspaceId } });
  const taskKey = `${workspace!.slug.toUpperCase().slice(0, 4)}-${count + 1}`;

  const lastTask = await prisma.task.findFirst({
    where: { boardColumnId: backlogColumn.id },
    orderBy: { position: "desc" },
  });
  const position = (lastTask?.position ?? -1) + 1;

  const task = await prisma.task.create({
    data: {
      taskKey,
      title: aiTitle,
      description: aiDescription,
      priority: aiPriority,
      position,
      workspaceId: data.workspaceId,
      boardId: data.boardId,
      boardColumnId: backlogColumn.id,
      creatorId: req.user.id,
      linkedTicketId: data.ticketId,
      teamId: aiTeamId,
    },
    include: {
      boardColumn: { select: { id: true, name: true } },
      linkedTicket: { select: { id: true, subject: true } },
      team: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(task);
});

export default router;
