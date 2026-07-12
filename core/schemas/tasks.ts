import { z } from "zod/v4";

export const taskPriorities = [
  "no_priority",
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export type TaskPriority = (typeof taskPriorities)[number];

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required").max(80),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().trim().max(500).optional().nullable(),
  logoUrl: z.string().url("Invalid logo URL").or(z.string().length(0)).optional().nullable(),
  isPrivate: z.boolean().default(false),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const createTeamSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(80),
  workspaceId: z.string().uuid(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const createBoardSchema = z.object({
  name: z.string().trim().min(1, "Board name is required").max(80),
  workspaceId: z.string().uuid(),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(255),
  description: z.string().trim().default(""),
  priority: z.enum(taskPriorities).default("no_priority"),
  boardId: z.string().uuid(),
  boardColumnId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  assigneeId: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().optional(),
  priority: z.enum(taskPriorities).optional(),
  teamId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  checklist: z.array(z.object({ text: z.string(), done: z.boolean() })).optional(),
  impact: z.string().trim().max(500).optional().nullable(),
  phase: z.string().trim().max(50).optional().nullable(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const moveTaskSchema = z.object({
  taskId: z.string().uuid(),
  boardColumnId: z.string().uuid(),
  position: z.number().int().min(0),
});

export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

export const escalateTicketSchema = z.object({
  ticketId: z.number().int().positive(),
  boardId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export type EscalateTicketInput = z.infer<typeof escalateTicketSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  workspaceId: z.string().uuid(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required").max(80).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  logoUrl: z.string().url("Invalid logo URL").or(z.string().length(0)).optional().nullable(),
  isPrivate: z.boolean().optional(),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(["owner", "admin", "member", "viewer"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const createColumnSchema = z.object({
  name: z.string().trim().min(1, "Column name is required").max(50),
});

export type CreateColumnInput = z.infer<typeof createColumnSchema>;

export const reorderColumnsSchema = z.object({
  columnIds: z.array(z.string().uuid()).min(1, "At least one column is required"),
});

export type ReorderColumnsInput = z.infer<typeof reorderColumnsSchema>;

export const deleteColumnSchema = z.object({
  targetColumnId: z.string().uuid().optional(),
});

export type DeleteColumnInput = z.infer<typeof deleteColumnSchema>;

