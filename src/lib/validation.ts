import { z } from "zod";

export const workspaceSchema = z.object({ name: z.string().trim().min(1).max(100) });
export const listSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["tasks", "shopping", "mixed"])
});
export const entrySchema = z.object({
  listId: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  kind: z.enum(["tasks", "shopping", "mixed"])
});
export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(128)
});
