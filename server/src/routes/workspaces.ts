import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import { createWorkspaceSchema, inviteMemberSchema } from "core/schemas/tasks.ts";
import prisma from "../db";
import { sendEmailJob } from "../lib/send-email";

const router = Router();

/** POST /api/workspaces - Create a new workspace; caller becomes owner */
router.post("/", requireAuth, async (req, res) => {
  const data = validate(createWorkspaceSchema, req.body, res);
  if (!data) return;

  // Check slug uniqueness
  const existing = await prisma.workspace.findUnique({ where: { slug: data.slug } });
  if (existing) {
    res.status(409).json({ error: "Workspace slug is already taken" });
    return;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: data.name,
      slug: data.slug,
      ownerId: req.user.id,
      members: {
        create: {
          userId: req.user.id,
          role: "owner",
        },
      },
    },
    include: { members: true },
  });

  // Send welcome email (re-uses existing Nodemailer queue job)
  await sendEmailJob({
    to: req.user.email,
    subject: `Welcome to ${workspace.name} workspace!`,
    body:
      `Hi ${req.user.name},\n\n` +
      `Your workspace "${workspace.name}" has been created successfully.\n` +
      `Slug: ${workspace.slug}\n\n` +
      `You can now create boards, invite teammates, and start managing tasks.\n\n` +
      `— Helpdesk Team`,
  });

  res.status(201).json(workspace);
});

/** GET /api/workspaces - List all workspaces the user belongs to */
router.get("/", requireAuth, async (req, res) => {
  const workspaces = await prisma.workspace.findMany({
    where: {
      members: { some: { userId: req.user.id } },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { boards: true, tasks: true, teams: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(workspaces);
});

/** GET /api/workspaces/:id - Get workspace details */
router.get("/:id", requireAuth, async (req, res) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: req.params.id as string },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
      teams: true,
      boards: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!workspace) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  // Only workspace members can see it
  const isMember = workspace.members.some((m: { userId: string }) => m.userId === req.user.id);
  if (!isMember) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(workspace);
});

/** GET /api/workspaces/:id/members - List workspace members */
router.get("/:id/members", requireAuth, async (req, res) => {
  const workspace = await prisma.workspace.findUnique({ where: { id: req.params.id as string } });
  if (!workspace) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: req.params.id as string },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  res.json(members);
});

/** POST /api/workspaces/invite - Invite a user by email */
router.post("/invite", requireAuth, async (req, res) => {
  const data = validate(inviteMemberSchema, req.body, res);
  if (!data) return;

  const workspace = await prisma.workspace.findUnique({ where: { id: data.workspaceId } });
  if (!workspace) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  // Only admin/owner can invite
  const callerMembership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: data.workspaceId, userId: req.user.id } },
  });
  if (!callerMembership || callerMembership.role === "member") {
    res.status(403).json({ error: "Only workspace admins or owners can invite members" });
    return;
  }

  // Find user by email
  const invitee = await prisma.user.findUnique({
    where: { email: data.email, deletedAt: null },
  });

  if (!invitee) {
    res.status(404).json({ error: "No user found with that email address" });
    return;
  }

  // Add member (upsert to avoid duplicate error)
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: data.workspaceId, userId: invitee.id } },
    create: { workspaceId: data.workspaceId, userId: invitee.id, role: data.role },
    update: { role: data.role },
  });

  // Notify invitee via email
  await sendEmailJob({
    to: invitee.email,
    subject: `You've been added to ${workspace.name}`,
    body:
      `Hi ${invitee.name},\n\n` +
      `${req.user.name} has added you to the workspace "${workspace.name}" as a ${data.role}.\n\n` +
      `Log in to Helpdesk to get started.\n\n` +
      `— Helpdesk Team`,
  });

  res.json({ message: "Member added successfully" });
});

export default router;
