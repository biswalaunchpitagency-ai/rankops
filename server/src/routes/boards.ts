import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import { createBoardSchema, moveTaskSchema } from "core/schemas/tasks.ts";
import prisma from "../db";

const DEFAULT_COLUMNS = [
  "Backlog",
  "Todo",
  "In Progress",
  "Review",
  "Done",
] as const;

const router = Router();

/** GET /api/boards?workspaceId= - List boards in a workspace */
router.get("/", requireAuth, async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId || typeof workspaceId !== "string") {
    res.status(400).json({ error: "workspaceId query param is required" });
    return;
  }

  const boards = await prisma.board.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { tasks: true, columns: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  res.json(boards);
});

/** POST /api/boards - Create a board with default columns */
router.post("/", requireAuth, async (req, res) => {
  const data = validate(createBoardSchema, req.body, res);
  if (!data) return;

  // Verify membership
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: data.workspaceId, userId: req.user.id } },
  });
  if (!member) {
    res.status(403).json({ error: "You are not a member of this workspace" });
    return;
  }

  const board = await prisma.board.create({
    data: {
      name: data.name,
      workspaceId: data.workspaceId,
      columns: {
        create: DEFAULT_COLUMNS.map((name, position) => ({ name, position })),
      },
    },
    include: {
      columns: { orderBy: { position: "asc" } },
    },
  });

  res.status(201).json(board);
});

/** GET /api/boards/:id - Fetch a board with its columns and tasks */
router.get("/:id", requireAuth, async (req, res) => {
  const board = await prisma.board.findUnique({
    where: { id: req.params.id as string },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: {
              assignee: { select: { id: true, name: true, email: true } },
              team: { select: { id: true, name: true } },
              linkedTicket: { select: { id: true, subject: true, status: true } },
            },
          },
        },
      },
    },
  });

  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }

  res.json(board);
});

/** PUT /api/boards/tasks/move - Move a task to a different column + position (drag-drop) */
router.put("/tasks/move", requireAuth, async (req, res) => {
  const data = validate(moveTaskSchema, req.body, res);
  if (!data) return;

  const task = await prisma.task.findUnique({ where: { id: data.taskId } });
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  // Verify membership
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: req.user.id } },
  });
  if (!member) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Detect if this is a move to the "Done" column (for auto-resolve trigger)
  const targetColumn = await prisma.boardColumn.findUnique({ where: { id: data.boardColumnId } });
  const movingToDone = targetColumn?.name === "Done";

  const updated = await prisma.task.update({
    where: { id: data.taskId },
    data: {
      boardColumnId: data.boardColumnId,
      position: data.position,
    },
    include: {
      linkedTicket: { select: { id: true, status: true } },
    },
  });

  // If task moved to Done and it has a linked ticket, auto-resolve via bg job
  if (movingToDone && updated.linkedTicket && updated.linkedTicket.status !== "resolved") {
    const { sendResolveLinkedTicketJob } = await import("../lib/resolve-linked-ticket");
    await sendResolveLinkedTicketJob({
      ticketId: updated.linkedTicket.id,
      taskId: updated.id,
      taskTitle: updated.title,
    });
  }

  res.json(updated);
});

export default router;
