import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import prisma from "../db";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const resources = await prisma.resource.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" }
  });
  res.json(resources);
});

router.post("/", requireAuth, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const { name, url, note } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });

  const resource = await prisma.resource.create({
    data: { name, url: url || "#", note: note || "", workspaceId }
  });
  res.status(201).json(resource);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const workspaceId = req.workspaceId!;
  const { id } = req.params;

  await prisma.resource.deleteMany({
    where: { id: id as string, workspaceId }
  });
  res.status(204).end();
});

export default router;
