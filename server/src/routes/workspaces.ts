import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import { createWorkspaceSchema, inviteMemberSchema, updateWorkspaceSchema, updateMemberRoleSchema } from "core/schemas/tasks.ts";
import prisma from "../db";
import { sendEmailJob, getClientUrl } from "../lib/send-email";
import { seedWorkspaceDefaults } from "../lib/workspace-defaults";

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
      description: data.description,
      logoUrl: data.logoUrl,
      isPrivate: data.isPrivate,
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

  // Seed default SOPs and Knowledge Base articles for the workspace
  try {
    await seedWorkspaceDefaults(workspace.id);
  } catch (err) {
    console.error("Failed to seed workspace defaults:", err);
  }

  const clientUrl = getClientUrl(req);
  // Send welcome email (re-uses existing Nodemailer queue job)
  await sendEmailJob({
    to: req.user.email,
    subject: `Welcome to ${workspace.name} workspace!`,
    body:
      `Hi ${req.user.name},\n\n` +
      `Your workspace "${workspace.name}" has been created successfully.\n` +
      `Slug: ${workspace.slug}\n\n` +
      `You can access and manage your workspace here:\n` +
      `${clientUrl}/workspaces/${workspace.id}\n\n` +
      `You can now create boards, invite teammates, and start managing tasks.\n\n` +
      `— Launchpit Agency Team`,
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
      boards: {
        orderBy: { createdAt: "asc" },
        include: {
          pinnedBy: {
            where: { userId: req.user.id },
            select: { id: true },
          },
        },
      },
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

  const clientUrl = getClientUrl(req);
  // Notify invitee via email
  await sendEmailJob({
    to: invitee.email,
    subject: `You've been added to ${workspace.name}`,
    body:
      `Hi ${invitee.name},\n\n` +
      `${req.user.name} has added you to the workspace "${workspace.name}" as a ${data.role}.\n\n` +
      `You can access the workspace here:\n` +
      `${clientUrl}/workspaces/${workspace.id}\n\n` +
      `Log in to Launchpit Agency to get started.\n\n` +
      `— Launchpit Agency Team`,
  });

  res.json({ message: "Member added successfully" });
});

/** PUT /api/workspaces/:id - Update workspace settings (name, description, logoUrl, isPrivate) */
router.put("/:id", requireAuth, async (req, res) => {
  const data = validate(updateWorkspaceSchema, req.body, res);
  if (!data) return;

  const workspaceId = req.params.id as string;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  // Verify that the caller is the owner or an admin of the workspace
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
  });

  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    res.status(403).json({ error: "Only workspace owners or admins can modify settings" });
    return;
  }

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      name: data.name,
      description: data.description,
      logoUrl: data.logoUrl,
      isPrivate: data.isPrivate,
    },
  });

  res.json(updated);
});

/** DELETE /api/workspaces/:id - Delete a workspace entirely */
router.delete("/:id", requireAuth, async (req, res) => {
  const workspaceId = req.params.id as string;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  // Only the workspace owner can delete it
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
  });

  if (!member || member.role !== "owner") {
    res.status(403).json({ error: "Only the workspace owner can delete the workspace" });
    return;
  }

  await prisma.workspace.delete({
    where: { id: workspaceId },
  });

  res.json({ success: true, message: "Workspace deleted successfully" });
});

/** PUT /api/workspaces/:id/members/:userId - Update member role */
router.put("/:id/members/:userId", requireAuth, async (req, res) => {
  const data = validate(updateMemberRoleSchema, req.body, res);
  if (!data) return;

  const workspaceId = req.params.id as string;
  const targetUserId = req.params.userId as string;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  // Verify caller membership and role
  const caller = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
  });

  if (!caller || (caller.role !== "owner" && caller.role !== "admin")) {
    res.status(403).json({ error: "Forbidden: You must be an owner or admin" });
    return;
  }

  // Target member
  const targetMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });

  if (!targetMember) {
    res.status(404).json({ error: "Member not found in workspace" });
    return;
  }

  // Check permissions:
  // 1. Only the owner can promote/demote to/from admin or owner
  if (data.role === "owner" || targetMember.role === "owner" || targetMember.role === "admin" || data.role === "admin") {
    if (caller.role !== "owner") {
      res.status(403).json({ error: "Only the workspace owner can modify admin/owner roles" });
      return;
    }
  }

  // If changing owner: we need to update the Workspace ownerId as well
  if (data.role === "owner") {
    await prisma.$transaction([
      prisma.workspace.update({
        where: { id: workspaceId },
        data: { ownerId: targetUserId },
      }),
      prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
        data: { role: "admin" }, // demote previous owner to admin
      }),
      prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
        data: { role: "owner" },
      }),
    ]);
  } else {
    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      data: { role: data.role as any },
    });
  }

  res.json({ success: true, message: "Member role updated successfully" });
});

/** DELETE /api/workspaces/:id/members/:userId - Remove a member from the workspace */
router.delete("/:id/members/:userId", requireAuth, async (req, res) => {
  const workspaceId = req.params.id as string;
  const targetUserId = req.params.userId as string;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  // Verify caller membership and role
  const caller = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
  });

  if (!caller) {
    res.status(403).json({ error: "Forbidden: You are not a member of this workspace" });
    return;
  }

  // Check authorization:
  // - A user can remove themselves (leave workspace)
  // - Otherwise, only owner/admin can remove other members
  const isRemovingSelf = targetUserId === req.user.id;
  if (!isRemovingSelf && caller.role !== "owner" && caller.role !== "admin") {
    res.status(403).json({ error: "Only owners or admins can remove other members" });
    return;
  }

  // Find target membership
  const targetMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });

  if (!targetMember) {
    res.status(404).json({ error: "Member not found in workspace" });
    return;
  }

  // Ensure owner cannot be removed (must delete workspace or transfer ownership)
  if (targetMember.role === "owner") {
    res.status(400).json({ error: "The workspace owner cannot be removed. Transfer ownership first." });
    return;
  }

  // Admins cannot remove other admins (only owner can)
  if (!isRemovingSelf && targetMember.role === "admin" && caller.role !== "owner") {
    res.status(403).json({ error: "Only the workspace owner can remove admins" });
    return;
  }

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });

  res.json({ success: true, message: "Member removed successfully" });
});

/** POST /api/workspaces/:id/boards/:boardId/pin - Star/Pin a board */
router.post("/:id/boards/:boardId/pin", requireAuth, async (req, res) => {
  const workspaceId = req.params.id as string;
  const boardId = req.params.boardId as string;

  // Verify board belongs to workspace and user is a member
  const board = await prisma.board.findFirst({
    where: { id: boardId, workspaceId },
  });

  if (!board) {
    res.status(404).json({ error: "Board not found in this workspace" });
    return;
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user.id } },
  });

  if (!member) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const pinned = await prisma.pinnedBoard.upsert({
    where: { userId_boardId: { userId: req.user.id, boardId } },
    create: { userId: req.user.id, boardId },
    update: {},
  });

  res.status(201).json(pinned);
});

/** DELETE /api/workspaces/:id/boards/:boardId/pin - Unstar/Unpin a board */
router.delete("/:id/boards/:boardId/pin", requireAuth, async (req, res) => {
  const workspaceId = req.params.id as string;
  const boardId = req.params.boardId as string;

  await prisma.pinnedBoard.deleteMany({
    where: { userId: req.user.id, boardId },
  });

  res.json({ success: true, message: "Board unpinned successfully" });
});

export default router;
