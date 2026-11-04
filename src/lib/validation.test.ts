import { describe, expect, it } from "vitest";
import { credentialsSchema, entrySchema, listSchema, workspaceSchema } from "@/lib/validation";

describe("input validation", () => {
  it("trims and bounds workspace names", () => {
    expect(workspaceSchema.parse({ name: "  Zuhause  " }).name).toBe("Zuhause");
    expect(workspaceSchema.safeParse({ name: " " }).success).toBe(false);
    expect(workspaceSchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
  });

  it("requires a valid list kind and workspace UUID", () => {
    const valid = { workspaceId: "2b4e4e6b-59b7-4d6d-8e53-9b84edc98f10", name: "Einkauf", kind: "shopping" };
    expect(listSchema.safeParse(valid).success).toBe(true);
    expect(listSchema.safeParse({ ...valid, kind: "calendar" }).success).toBe(false);
    expect(listSchema.safeParse({ ...valid, workspaceId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects blank or overlong entries", () => {
    const valid = { listId: "2b4e4e6b-59b7-4d6d-8e53-9b84edc98f10", title: "Milch", kind: "shopping" };
    expect(entrySchema.safeParse(valid).success).toBe(true);
    expect(entrySchema.safeParse({ ...valid, title: " " }).success).toBe(false);
    expect(entrySchema.safeParse({ ...valid, title: "x".repeat(241) }).success).toBe(false);
  });

  it("normalizes email addresses and enforces password length", () => {
    expect(credentialsSchema.parse({ email: "  TEST@EXAMPLE.DE ", password: "12345678" }).email).toBe("test@example.de");
    expect(credentialsSchema.safeParse({ email: "invalid", password: "12345678" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ email: "a@example.de", password: "short" }).success).toBe(false);
  });
});
