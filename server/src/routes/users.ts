import { Router } from "express";
import { createUserSchema, updateUserSchema } from "core/schemas/users.ts";
import { Role } from "core/constants/role.ts";
import { requireAuth } from "../middleware/require-auth";
import { requireAdmin } from "../middleware/require-admin";
import { validate } from "../lib/validate";
import { sendInvitationEmail, getClientUrl } from "../lib/send-email";
import prisma from "../db";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";

const router = Router();

router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, id: { not: AI_AGENT_ID } },
    select: { id: true, name: true, email: true, role: true, onboardedAt: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const data = validate(createUserSchema, req.body, res);
  if (!data) return;

  const { name, email, role } = data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (!existing.deletedAt) {
      res.status(409).json({ error: "Email already exists" });
      return;
    }

    // User was previously soft-deleted — restore and re-invite
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        role: role || Role.agent,
        deletedAt: null,
        onboardedAt: null,
        emailVerified: false,
        updatedAt: new Date(),
      },
      select: { id: true, name: true, email: true, role: true, onboardedAt: true, createdAt: true },
    });

    // Clean up old linked accounts so Google SSO can re-link cleanly
    await prisma.account.deleteMany({ where: { userId: existing.id } });

    const clientUrl = getClientUrl(req);
    await sendInvitationEmail(user.email, user.name, clientUrl);

    res.status(200).json({ user });
    return;
  }

  const userId = crypto.randomUUID();
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      id: userId,
      name,
      email,
      emailVerified: false,
      role: role || Role.agent,
      onboardedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    select: { id: true, name: true, email: true, role: true, onboardedAt: true, createdAt: true },
  });

  const clientUrl = getClientUrl(req);
  await sendInvitationEmail(user.email, user.name, clientUrl);

  res.status(201).json({ user });
});

router.post("/:id/resend-invite", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id as string;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.onboardedAt !== null) {
    res.status(400).json({ error: "User has already completed onboarding" });
    return;
  }

  const clientUrl = getClientUrl(req);
  await sendInvitationEmail(user.email, user.name, clientUrl);

  res.json({ message: "Invitation email resent successfully" });
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id as string;

  const data = validate(updateUserSchema, req.body, res);
  if (!data) return;

  const { name, email, role } = data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== id && !existing.deletedAt) {
    res.status(409).json({ error: "Email already exists" });
    return;
  }

  const user = await prisma.user.update({
    where: { id: id },
    data: {
      name,
      email,
      ...(role ? { role } : {}),
      updatedAt: new Date(),
    },
    select: { id: true, name: true, email: true, role: true, onboardedAt: true, createdAt: true },
  });

  res.json({ user });
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id as string;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.role === Role.admin) {
    res.status(403).json({ error: "Admin users cannot be deleted" });
    return;
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await prisma.ticket.updateMany({
    where: { assignedToId: id },
    data: { assignedToId: null },
  });

  await prisma.session.deleteMany({ where: { userId: id } });

  res.json({ message: "User deleted" });
});

export default router;
