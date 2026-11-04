import { z } from "zod";

export const workspaceSchema = z.object({ name: z.string().trim().min(1).max(100) });
export const listSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["tasks", "shopping", "mixed"])
});
const emptyToUndefined = (value: unknown) => value === "" || value === null || value === undefined ? undefined : value;

export const entrySchema = z.object({
  listId: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  kind: z.enum(["tasks", "shopping", "mixed"]),
  priority: z.preprocess(emptyToUndefined, z.enum(["low", "normal", "high", "urgent"]).default("normal")),
  dueAt: z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => { const date = new Date(value + "T00:00:00.000Z"); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value; }).optional()),
  assignedTo: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  quantity: z.preprocess(emptyToUndefined, z.coerce.number().positive().max(100000).optional()),
  unit: z.preprocess(emptyToUndefined, z.string().trim().max(32).optional()),
  category: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional())
});
export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(128)
});
