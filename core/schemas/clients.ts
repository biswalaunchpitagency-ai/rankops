import { z } from "zod/v4";

export type ClientStatus = "Active" | "Onboarding" | "Paused";

export const createClientSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().max(80).optional(),
  retainerHours: z.number().min(0).default(0),
  rate: z.number().min(0).default(0),
  status: z.enum(["Active", "Onboarding", "Paused"]).default("Active"),
  notes: z.string().max(2000).optional(),
  emailDomains: z.array(z.string().min(1)).default([]),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
