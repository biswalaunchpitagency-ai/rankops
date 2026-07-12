import { z } from "zod/v4";

export const createTimeLogSchema = z.object({
  hours: z.number().min(0.1).max(24),
  date: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
  taskId: z.string().uuid().optional(),
  ticketId: z.number().int().positive().optional(),
});

export type CreateTimeLogInput = z.infer<typeof createTimeLogSchema>;
