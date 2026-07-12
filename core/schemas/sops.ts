import { z } from "zod/v4";

export const createSopStepSchema = z.object({
  text: z.string().min(1),
  position: z.number().int().min(0),
});

export const createSopSchema = z.object({
  title: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  tools: z.string().max(300).optional(),
  steps: z.array(createSopStepSchema).default([]),
});

export type CreateSopInput = z.infer<typeof createSopSchema>;
