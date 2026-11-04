"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { workspaceSchema, listSchema, entrySchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

function safeInternalPath(value: string) { return value.startsWith("/") && !value.startsWith("//") ? value : "/"; }

export async function signIn(formData: FormData) {
  const next = safeInternalPath(String(formData.get("next") ?? "/"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!z.email().safeParse(email).success || password.length < 8) {
    redirect("/login?error=Bitte+E-Mail+und+ein+Passwort+mit+mindestens+8+Zeichen+eingeben.");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=Anmeldung+nicht+moeglich.+Bitte+Daten+pruefen.");
  redirect(next);
}

export async function signUp(formData: FormData) {\n  const next = safeInternalPath(String(formData.get("next") ?? "/"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!z.email().safeParse(email).success || password.length < 10) {
    redirect("/login?error=Bitte+eine+gueltige+E-Mail+und+mindestens+10+Zeichen+verwenden.");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` : undefined }
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

export type InvitationActionState = { error?: string; inviteUrl?: string };

export async function createInvitation(_previous: InvitationActionState, formData: FormData): Promise<InvitationActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const requestedRole = String(formData.get("role") ?? "member");
  if (!z.email().safeParse(email).success || !z.uuid().safeParse(workspaceId).success || !["member", "admin"].includes(requestedRole)) {
    return { error: "Bitte E-Mail-Adresse und Rolle prüfen." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return { error: "Die öffentliche App-Adresse ist noch nicht konfiguriert." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Bitte zuerst anmelden." };

  const { data: membership } = await supabase.from("workspace_members")
    .select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { error: "Du darfst für diesen Bereich keine Einladungen erstellen." };
  }
  if (requestedRole === "admin" && membership.role !== "owner") {
    return { error: "Nur der Bereichsinhaber kann Admin-Rechte vergeben." };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("workspace_invitations").insert({
    workspace_id: workspaceId, email, role: requestedRole, token_hash: tokenHash,
    invited_by: user.id, expires_at: expiresAt
  });
  if (error) return { error: "Die Einladung konnte nicht erstellt werden. Bitte erneut versuchen." };

  const inviteUrl = new URL(`/invite/${token}`, siteUrl).toString();
  revalidatePath(`/w/${workspaceId}`);
  return { inviteUrl };
}

export async function acceptInvitation(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) redirect("/login?error=Der+Einladungslink+ist+ungueltig.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: workspaceId, error } = await supabase.rpc("accept_workspace_invitation", { token_hash: tokenHash });
  if (error || !workspaceId) redirect(`/invite/${token}?error=Einladung+nicht+gueltig.+Bitte+E-Mail+und+Frist+pruefen.`);
  revalidatePath("/");
  redirect(`/w/${workspaceId}`);
}
