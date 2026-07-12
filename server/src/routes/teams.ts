import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import prisma from "../db";

const router = Router({ mergeParams: true });

/** GET / — list all teams in the workspace with their members */
router.get("/", requireAuth, async (req, res) => {
  const teams = await prisma.team.findMany({
    where: { workspaceId: req.workspaceId },
    include: {
      members: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  res.json(teams);
});

/** POST / — create a new team */
router.post("/", requireAuth, async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name || name.trim() === "") {
    res.status(400).json({ error: "Team name is required" });
    return;
  }

  // Only admins/owners may create teams
  if (req.workspaceRole === "member" || req.workspaceRole === "viewer") {
    res.status(403).json({ error: "Only workspace admins or owners can create teams" });
    return;
  }

  const team = await prisma.team.create({
    data: {
      name: name.trim(),
      workspaceId: req.workspaceId,
    },
  });
  res.status(201).json(team);
});

/** DELETE /:teamId — delete a team */
router.delete("/:teamId", requireAuth, async (req, res) => {
  if (req.workspaceRole === "member" || req.workspaceRole === "viewer") {
    res.status(403).json({ error: "Only workspace admins or owners can delete teams" });
    return;
  }

  const teamId = req.params.teamId as string;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team || team.workspaceId !== req.workspaceId) {
    res.status(404).json({ error: "Team not found" });
    return;
  }

  await prisma.team.delete({ where: { id: teamId } });
  res.json({ message: "Team deleted" });
});

/** POST /:teamId/members — add a workspace member to the team */
router.post("/:teamId/members", requireAuth, async (req, res) => {
  if (req.workspaceRole === "member" || req.workspaceRole === "viewer") {
    res.status(403).json({ error: "Only workspace admins or owners can manage team members" });
    return;
  }

  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  // Verify the user is a member of this workspace
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: req.workspaceId, userId },
    },
  });
  if (!membership) {
    res.status(400).json({ error: "User is not a member of this workspace" });
    return;
  }

  const teamId = req.params.teamId as string;

  const team = await prisma.team.update({
    where: { id: teamId },
    data: { members: { connect: { id: userId } } },
    include: { members: { select: { id: true, name: true, email: true } } },
  });
  res.json(team);
});

/** DELETE /:teamId/members/:userId — remove a member from the team */
router.delete("/:teamId/members/:userId", requireAuth, async (req, res) => {
  if (req.workspaceRole === "member" || req.workspaceRole === "viewer") {
    res.status(403).json({ error: "Only workspace admins or owners can manage team members" });
    return;
  }

  const teamId = req.params.teamId as string;
  const userId = req.params.userId as string;

  const team = await prisma.team.update({
    where: { id: teamId },
    data: { members: { disconnect: { id: userId } } },
    include: { members: { select: { id: true, name: true, email: true } } },
  });
  res.json(team);
});

export default router;
