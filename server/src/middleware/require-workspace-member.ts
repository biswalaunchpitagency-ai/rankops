import type { RequestHandler } from "express";
import prisma from "../db";

declare global {
  namespace Express {
    interface Request {
      workspaceId: string;
      workspaceRole: string;
    }
  }
}

export const requireWorkspaceMember: RequestHandler = async (req, res, next) => {
  const workspaceId = req.params.workspaceId as string;

  if (!workspaceId) {
    res.status(400).json({ error: "Workspace ID is required" });
    return;
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: req.user.id,
      },
    },
  });

  if (!membership) {
    res.status(403).json({ error: "Forbidden: You are not a member of this workspace" });
    return;
  }

  req.workspaceId = workspaceId;
  req.workspaceRole = membership.role;
  next();
};
