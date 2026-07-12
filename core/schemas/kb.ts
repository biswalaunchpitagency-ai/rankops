import { z } from "zod/v4";

export const createKbArticleSchema = z.object({
  title: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  keywords: z.string().min(1).max(500),
  content: z.string().min(1).max(10000),
});

export const updateKbArticleSchema = createKbArticleSchema.partial();

export type CreateKbArticleInput = z.infer<typeof createKbArticleSchema>;
export type UpdateKbArticleInput = z.infer<typeof updateKbArticleSchema>;
