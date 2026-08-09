import { z } from "zod/v4";
import { Role } from "../constants/role.ts";

export const createUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.email("Invalid email address"),
  role: z.enum([Role.admin, Role.agent]).optional().default(Role.agent),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.email("Invalid email address"),
  role: z.enum([Role.admin, Role.agent]).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
