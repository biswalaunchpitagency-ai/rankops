import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import prisma from "../db";
import { createKbArticleSchema, updateKbArticleSchema } from "core/schemas/kb.ts";

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/kb
router.get("/", requireAuth, async (req, res) => {
  const articles = await prisma.knowledgeBase.findMany({
    where: { workspaceId: req.workspaceId! },
    orderBy: { createdAt: "desc" },
  });
  res.json(articles);
});

// POST /api/workspaces/:workspaceId/kb
router.post("/", requireAuth, async (req, res) => {
  const data = validate(createKbArticleSchema, req.body, res);
  if (!data) return;

  const article = await prisma.knowledgeBase.create({
    data: { ...data, workspaceId: req.workspaceId! },
  });
  res.status(201).json(article);
});

// PATCH /api/workspaces/:workspaceId/kb/:id
router.patch("/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const data = validate(updateKbArticleSchema, req.body, res);
  if (!data) return;

  const existing = await prisma.knowledgeBase.findUnique({
    where: { id, workspaceId: req.workspaceId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const updated = await prisma.knowledgeBase.update({ where: { id }, data });
  res.json(updated);
});

// DELETE /api/workspaces/:workspaceId/kb/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const existing = await prisma.knowledgeBase.findUnique({
    where: { id, workspaceId: req.workspaceId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  await prisma.knowledgeBase.delete({ where: { id } });
  res.status(204).end();
});

export default router;
