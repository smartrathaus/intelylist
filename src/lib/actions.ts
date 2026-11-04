"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const workspaceSchema = z.object({ name: z.string().trim().min(1).max(100) });
const listSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["tasks", "shopping", "mixed"])
});
const entrySchema = z.object({
  listId: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  kind: z.enum(["tasks", "shopping", "mixed"])
});

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!z.email().safeParse(email).success || password.length < 8) {
    redirect("/login?error=Bitte+E-Mail+und+ein+Passwort+mit+mindestens+8+Zeichen+eingeben.");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=Anmeldung+nicht+moeglich.+Bitte+Daten+pruefen.");
  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!z.email().safeParse(email).success || password.length < 10) {
    redirect("/login?error=Bitte+eine+gueltige+E-Mail+und+mindestens+10+Zeichen+verwenden.");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` : undefined }
  });
  if (error) redirect("/login?error=Registrierung+nicht+moeglich.+Bitte+spaeter+erneut+versuchen.");
  redirect("/login?message=Bitte+pruefe+dein+Postfach+und+bestaetige+deine+E-Mail.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createWorkspace(formData: FormData) {
  const parsed = workspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) redirect("/?error=Bitte+einen+gueltigen+Bereichsnamen+eingeben.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.from("workspaces")
    .insert({ name: parsed.data.name, created_by: user.id })
    .select("id").single();
  if (error || !data) redirect("/?error=Der+Bereich+konnte+nicht+angelegt+werden.");
  revalidatePath("/");
  redirect(`/w/${data.id}`);
}

export async function createList(formData: FormData) {
  const parsed = listSchema.safeParse({
    workspaceId: formData.get("workspaceId"), name: formData.get("name"), kind: formData.get("kind")
  });
  if (!parsed.success) redirect("/?error=Bitte+alle+Listenfelder+pruefen.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.from("lists").insert({
    workspace_id: parsed.data.workspaceId, name: parsed.data.name, kind: parsed.data.kind, created_by: user.id
  }).select("id").single();
  if (error || !data) redirect(`/w/${parsed.data.workspaceId}?error=Die+Liste+konnte+nicht+angelegt+werden.`);
  revalidatePath(`/w/${parsed.data.workspaceId}`);
  redirect(`/w/${parsed.data.workspaceId}/lists/${data.id}`);
}

export async function createEntry(formData: FormData) {
  const parsed = entrySchema.safeParse({
    listId: formData.get("listId"), title: formData.get("title"), kind: formData.get("kind")
  });
  if (!parsed.success) redirect("/?error=Bitte+einen+gueltigen+Eintrag+eingeben.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: list } = await supabase.from("lists").select("id,workspace_id,kind").eq("id", parsed.data.listId).single();
  if (!list || list.kind !== parsed.data.kind) redirect("/");
  const { error } = await supabase.from("list_entries").insert({
    list_id: list.id, title: parsed.data.title, created_by: user.id
  });
  if (error) redirect(`/w/${list.workspace_id}/lists/${list.id}?error=Eintrag+konnte+nicht+gespeichert+werden.`);
  revalidatePath(`/w/${list.workspace_id}/lists/${list.id}`);
  redirect(`/w/${list.workspace_id}/lists/${list.id}`);
}

export async function toggleEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const completed = String(formData.get("completed") ?? "") === "true";
  if (!z.uuid().safeParse(id).success) redirect("/");
  const supabase = await createClient();
  const { data: entry } = await supabase.from("list_entries").select("id,list_id,lists!inner(workspace_id)").eq("id", id).single();
  if (!entry) redirect("/");
  const { error } = await supabase.from("list_entries").update({
    is_completed: completed, completed_at: completed ? new Date().toISOString() : null
  }).eq("id", id);
  if (error) redirect("/");
  const workspaceId = (entry.lists as unknown as { workspace_id: string }).workspace_id;
  revalidatePath(`/w/${workspaceId}/lists/${entry.list_id}`);
}

export async function deleteEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) redirect("/");
  const supabase = await createClient();
  const { data: entry } = await supabase.from("list_entries").select("id,list_id,lists!inner(workspace_id)").eq("id", id).single();
  if (!entry) redirect("/");
  const workspaceId = (entry.lists as unknown as { workspace_id: string }).workspace_id;
  const { error } = await supabase.from("list_entries").delete().eq("id", id);
  if (!error) revalidatePath(`/w/${workspaceId}/lists/${entry.list_id}`);
}