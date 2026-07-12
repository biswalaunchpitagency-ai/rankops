import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import prisma from "../db";
import { createSopSchema } from "core/schemas/sops.ts";

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/sops
router.get("/", requireAuth, async (req, res) => {
  const sops = await prisma.sOP.findMany({
    where: { workspaceId: req.workspaceId! },
    include: { steps: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(sops);
});

// POST /api/workspaces/:workspaceId/sops
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

// DELETE /api/workspaces/:workspaceId/sops/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const existing = await prisma.sOP.findUnique({
    where: { id, workspaceId: req.workspaceId! },
  });
  if (!existing) {
    res.status(404).json({ error: "SOP not found" });
    return;
  }

  await prisma.sOP.delete({ where: { id } });
  res.status(204).end();
});

export default router;
