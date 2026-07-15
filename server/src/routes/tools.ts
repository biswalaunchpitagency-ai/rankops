import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import prisma from "../db";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const tools = await prisma.tool.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" }
  });
  res.json(tools);
});

router.post("/", requireAuth, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const { name, url, purpose, owner } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });

  const tool = await prisma.tool.create({
    data: { name, url: url || "", purpose: purpose || "", owner: owner || "All", workspaceId }
  });
  res.status(201).json(tool);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const { id } = req.params;

  await prisma.tool.deleteMany({
    where: { id: id as string, workspaceId }
  });
  res.status(204).end();
});

export default router;
