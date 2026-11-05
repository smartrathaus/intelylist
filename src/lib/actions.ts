"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { workspaceSchema, listSchema, entrySchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

function safeInternalPath(value: string) { return value.startsWith("/") && !value.startsWith("//") && !value.includes(String.fromCharCode(92)) && !value.includes(String.fromCharCode(10)) && !value.includes(String.fromCharCode(13)) ? value : "/"; }

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

export async function signUp(formData: FormData) {
  const next = safeInternalPath(String(formData.get("next") ?? "/"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 80);
  if (!z.email().safeParse(email).success || password.length < 10) {
    redirect("/login?error=Bitte+eine+gueltige+E-Mail+und+mindestens+10+Zeichen+verwenden.");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { data: { display_name: displayName || undefined }, emailRedirectTo: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` : undefined }
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

  // Generate the ID client-side so the insert does not need a RLS-filtered
  // INSERT ... RETURNING read before the AFTER INSERT owner-membership trigger
  // becomes visible to the SELECT policy.
  const workspaceId = randomUUID();
  const { error } = await supabase.from("workspaces").insert({
    id: workspaceId, name: parsed.data.name, created_by: user.id
  });
  if (error) {
    console.error("[createWorkspace] insert failed", {
      code: error.code, message: error.message, hint: error.hint
    });
    redirect("/?error=Der+Bereich+konnte+nicht+angelegt+werden.");
  }
  revalidatePath("/");
  redirect(`/w/${workspaceId}`);
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
    listId: formData.get("listId"), title: formData.get("title"), kind: formData.get("kind"),
    notes: formData.get("notes"), priority: formData.get("priority"), dueAt: formData.get("dueAt"), assignedTo: formData.get("assignedTo"),
    quantity: formData.get("quantity"), unit: formData.get("unit"), category: formData.get("category"), supermarket: formData.get("supermarket")
  });
  if (!parsed.success) redirect("/?error=Bitte+einen+gueltigen+Eintrag+eingeben.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: list } = await supabase.from("lists").select("id,workspace_id,kind").eq("id", parsed.data.listId).single();
  if (!list || list.kind !== parsed.data.kind) redirect("/");
  const { error } = await supabase.from("list_entries").insert({
    list_id: list.id, title: parsed.data.title, notes: parsed.data.notes || null, created_by: user.id,
    priority: parsed.data.priority,
    due_at: parsed.data.dueAt ? new Date(`${parsed.data.dueAt}T12:00:00.000Z`).toISOString() : null,
    assigned_to: parsed.data.assignedTo ?? null,
    quantity: parsed.data.quantity ?? null,
    unit: parsed.data.unit || null,
    category: parsed.data.category || null,
    supermarket: parsed.data.supermarket || null
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: entry } = await supabase.from("list_entries").select("id,list_id,title,notes,priority,due_at,assigned_to,created_by,position,is_completed,lists!inner(workspace_id,kind)").eq("id", id).single();
  if (!entry) redirect("/");
  const listInfo = entry.lists as unknown as { workspace_id: string; kind: string };
  const { data: recurrence } = completed && !entry.is_completed
    ? await supabase.from("recurring_tasks").select("frequency,interval_count,next_due_at").eq("source_entry_id", id).eq("is_active", true).maybeSingle()
    : { data: null };
  const { error } = listInfo.kind === "shopping" || listInfo.kind === "mixed"
    ? await supabase.rpc("set_list_entry_completion", { target_entry: id, target_list: entry.list_id, completed })
    : await supabase.from("list_entries").update({
        is_completed: completed, completed_at: completed ? new Date().toISOString() : null
      }).eq("id", id);
  if (error) redirect("/");
  if (recurrence && completed && !entry.is_completed) {
    const nextDue = new Date(recurrence.next_due_at);
    const base = nextDue > new Date() ? nextDue : new Date();
    const interval = recurrence.interval_count ?? 1;
    if (recurrence.frequency === "daily") base.setDate(base.getDate() + interval);
    if (recurrence.frequency === "weekly") base.setDate(base.getDate() + interval * 7);
    if (recurrence.frequency === "monthly") base.setMonth(base.getMonth() + interval);
    if (recurrence.frequency === "yearly") base.setFullYear(base.getFullYear() + interval);
    const { data: last } = await supabase.from("list_entries").select("position").eq("list_id", entry.list_id).order("position", { ascending: false }).limit(1).maybeSingle();
    const { data: nextEntry, error: nextError } = await supabase.from("list_entries").insert({
      list_id: entry.list_id, title: entry.title, notes: entry.notes, priority: entry.priority,
      due_at: base.toISOString(), assigned_to: entry.assigned_to, created_by: user.id,
      position: (last?.position ?? entry.position ?? 0) + 1
    }).select("id").single();
    if (!nextError && nextEntry) {
      const following = new Date(base);
      if (recurrence.frequency === "daily") following.setDate(following.getDate() + interval);
      if (recurrence.frequency === "weekly") following.setDate(following.getDate() + interval * 7);
      if (recurrence.frequency === "monthly") following.setMonth(following.getMonth() + interval);
      if (recurrence.frequency === "yearly") following.setFullYear(following.getFullYear() + interval);
      await supabase.from("recurring_tasks").insert({
        list_id: entry.list_id, source_entry_id: nextEntry.id, created_by: user.id,
        frequency: recurrence.frequency, interval_count: interval, next_due_at: following.toISOString(), is_active: true
      });
    }
  }
  const workspaceId = listInfo.workspace_id;
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


export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(email).success) redirect("/login/reset?error=Bitte+eine+gueltige+E-Mail-Adresse+eingeben.");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) redirect("/login/reset?error=Die+App-Adresse+ist+nicht+konfiguriert.");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/account/update-password`
  });
  redirect("/login/reset?message=Wenn+ein+Konto+existiert,+wurde+eine+E-Mail+zum+Zuruecksetzen+versendet.");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (password.length < 10 || password.length > 128 || password !== confirmation) {
    redirect("/account/update-password?error=Passwoerter+muessen+uebereinstimmen+und+mindestens+10+Zeichen+haben.");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/account/update-password?error=Das+Passwort+konnte+nicht+geaendert+werden.");
  redirect("/?message=Passwort+erfolgreich+geaendert.");
}


export async function updateEntry(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) redirect("/");
  const parsed = entrySchema.safeParse({
    listId: formData.get("listId"), title: formData.get("title"), notes: formData.get("notes"),
    kind: formData.get("kind"), priority: formData.get("priority"), dueAt: formData.get("dueAt"),
    assignedTo: formData.get("assignedTo"), quantity: formData.get("quantity"),
    unit: formData.get("unit"), category: formData.get("category"), supermarket: formData.get("supermarket")
  });
  if (!parsed.success) redirect("/?error=Bitte+die+Eintragsdaten+pruefen.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: list } = await supabase.from("lists").select("id,workspace_id,kind").eq("id", parsed.data.listId).single();
  if (!list || list.kind !== parsed.data.kind) redirect("/");
  const { error } = await supabase.from("list_entries").update({
    title: parsed.data.title,
    notes: parsed.data.notes || null,
    priority: parsed.data.priority,
    due_at: parsed.data.dueAt ? new Date(`${parsed.data.dueAt}T12:00:00.000Z`).toISOString() : null,
    assigned_to: parsed.data.assignedTo ?? null,
    quantity: parsed.data.quantity ?? null,
    unit: parsed.data.unit || null,
    category: parsed.data.category || null,
    supermarket: parsed.data.supermarket || null
  }).eq("id", id).eq("list_id", list.id);
  if (error) redirect(`/w/${list.workspace_id}/lists/${list.id}?error=Eintrag+konnte+nicht+aktualisiert+werden.`);
  revalidatePath(`/w/${list.workspace_id}/lists/${list.id}`);
}


export async function changeMemberRole(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const targetUser = String(formData.get("targetUser") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!z.uuid().safeParse(workspaceId).success || !z.uuid().safeParse(targetUser).success || !["member", "admin"].includes(role)) {
    redirect("/");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("change_workspace_member_role", {
    target_workspace: workspaceId, target_user: targetUser, new_role: role
  });
  if (error) redirect(`/w/${workspaceId}?error=Die+Rolle+konnte+nicht+geaendert+werden.`);
  revalidatePath(`/w/${workspaceId}`);
  redirect(`/w/${workspaceId}?message=Mitgliedsrolle+aktualisiert.`);
}

export async function removeWorkspaceMember(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const targetUser = String(formData.get("targetUser") ?? "");
  if (!z.uuid().safeParse(workspaceId).success || !z.uuid().safeParse(targetUser).success) redirect("/");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("remove_workspace_member", {
    target_workspace: workspaceId, target_user: targetUser
  });
  if (error) redirect(`/w/${workspaceId}?error=Mitglied+konnte+nicht+entfernt+werden.`);
  revalidatePath(`/w/${workspaceId}`);
  redirect(`/w/${workspaceId}?message=Mitglied+aus+dem+Bereich+entfernt.`);
}


export async function leaveWorkspace(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (!z.uuid().safeParse(workspaceId).success || confirmation !== "VERLASSEN") {
    redirect(`/w/${workspaceId}?error=Bitte+den+Austritt+bestaetigen.`);
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("leave_workspace", { target_workspace: workspaceId });
  if (error) redirect(`/w/${workspaceId}?error=Du+kannst+diesen+Bereich+nicht+verlassen.`);
  revalidatePath("/");
  redirect("/?message=Du+hast+den+Bereich+verlassen.");
}

export async function deleteWorkspace(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (!z.uuid().safeParse(workspaceId).success) redirect("/");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: workspace } = await supabase.from("workspaces").select("id,name").eq("id", workspaceId).single();
  if (!workspace || confirmation !== workspace.name) {
    redirect(`/w/${workspaceId}?error=Bitte+den+Bereichsnamen+exakt+zur+Bestaetigung+eingeben.`);
  }
  const { error } = await supabase.from("workspaces").delete().eq("id", workspaceId);
  if (error) redirect(`/w/${workspaceId}?error=Der+Bereich+konnte+nicht+geloescht+werden.`);
  revalidatePath("/");
  redirect("/?message=Der+Bereich+wurde+geloescht.");
}


export async function deleteOwnAccount(formData: FormData) {
  if (String(formData.get("confirmation") ?? "") !== "KONTO LÖSCHEN") {
    redirect("/account?error=Bitte+KONTO+LÖSCHEN+zur+Bestaetigung+eingeben.");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");
  const currentPassword = String(formData.get("currentPassword") ?? "");
  if (currentPassword.length < 8 || currentPassword.length > 128) {
    redirect("/account?error=Bitte+dein+aktuelles+Passwort+eingeben.");
  }
  const { data: verified, error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email, password: currentPassword
  });
  if (verifyError || verified.user?.id !== user.id) {
    redirect("/account?error=Das+aktuelle+Passwort+ist+nicht+korrekt.");
  }

  const { data: memberships } = await supabase.from("workspace_members")
    .select("workspace_id,role").eq("user_id", user.id);
  if ((memberships ?? []).some((membership) => membership.role === "owner")) {
    redirect("/account?error=Bitte+loesche+zuerst+alle+Bereiche,+deren+Inhaber+du+bist.");
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    redirect("/account?error=Die+serverseitige+Kontoloeschung+ist+noch+nicht+konfiguriert.");
  }

  if (user.email) {
    const { error: inviteError } = await admin.from("workspace_invitations").delete().eq("email", user.email);
    if (inviteError) redirect("/account?error=Einladungen+konnten+nicht+bereinigt+werden.");
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) redirect("/account?error=Das+Konto+konnte+nicht+geloescht+werden.");
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?message=Dein+Konto+wurde+geloescht.");
}


export type QuickEntryResult = { ok: true; duplicate?: { id: string; title: string; quantity: number } } | { ok: false; message: string };

export async function addEntrySmart(input: { listId: string; title: string; kind: "tasks" | "shopping" | "mixed"; quantity?: number; unit?: string; supermarket?: string; category?: string }) : Promise<QuickEntryResult> {
  const parsed = z.object({ listId: z.uuid(), title: z.string().trim().min(1).max(240), kind: z.enum(["tasks","shopping","mixed"]), quantity: z.number().int().min(1).max(100000).optional(), unit: z.string().max(32).optional(), supermarket: z.string().max(100).optional(), category: z.string().max(80).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Bitte prüfe den Eintrag." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Bitte melde dich erneut an." };
  const { data: list } = await supabase.from("lists").select("id,workspace_id,kind").eq("id", parsed.data.listId).single();
  if (!list || list.kind !== parsed.data.kind) return { ok: false, message: "Die Liste wurde nicht gefunden." };
  const isShopping = list.kind === "shopping" || list.kind === "mixed";
  const quantity = isShopping ? (parsed.data.quantity ?? 1) : null;
  if (isShopping) {
    const { data: candidates } = await supabase.from("list_entries").select("id,title,quantity,supermarket").eq("list_id", list.id);
    const existing = (candidates ?? []).find(row => row.title.trim().toLocaleLowerCase() === parsed.data.title.trim().toLocaleLowerCase() && (row.supermarket ?? "").trim().toLocaleLowerCase() === (parsed.data.supermarket ?? "").trim().toLocaleLowerCase());
    if (existing) return { ok: true, duplicate: { id: existing.id, title: existing.title, quantity: Number(existing.quantity ?? 1) } };
  }
  const { data: lastEntry } = await supabase.from("list_entries").select("position").eq("list_id", list.id).order("position", { ascending: false }).limit(1).maybeSingle();
  const nextPosition = (lastEntry?.position ?? -1) + 1;
  const { error } = await supabase.from("list_entries").insert({ list_id: list.id, title: parsed.data.title, created_by: user.id, quantity, unit: parsed.data.unit || null, supermarket: parsed.data.supermarket || null, category: parsed.data.category || null, priority: "normal", position: nextPosition });
  if (error) return { ok: false, message: "Der Eintrag konnte nicht gespeichert werden." };
  revalidatePath(`/w/${list.workspace_id}/lists/${list.id}`);
  return { ok: true };
}

export async function confirmDuplicateQuantity(input: { listId: string; entryId: string; expectedQuantity: number }) : Promise<QuickEntryResult> {
  const parsed = z.object({ listId: z.uuid(), entryId: z.uuid(), expectedQuantity: z.number().nonnegative() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Ungültige Eingabe." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Bitte melde dich erneut an." };
  const { data: entry } = await supabase.from("list_entries").select("id,title,quantity,list_id,lists!inner(workspace_id,kind)").eq("id", parsed.data.entryId).eq("list_id", parsed.data.listId).single();
  if (!entry || (entry.lists as unknown as {kind:string}).kind === "tasks") return { ok: false, message: "Der Eintrag ist nicht mehr verfügbar." };
  const current = Number(entry.quantity ?? 1);
  if (current !== parsed.data.expectedQuantity) return { ok: false, message: "Die Menge wurde zwischenzeitlich geändert. Bitte erneut versuchen." };
  const { data: newQuantity, error } = await supabase.rpc("increment_list_entry_quantity", {
    target_entry: entry.id, target_list: entry.list_id, expected_quantity: current
  });
  if (error || newQuantity === null) return { ok: false, message: "Die Menge konnte nicht erhöht werden. Bitte aktualisiere die Liste und versuche es erneut." };
  const workspaceId = (entry.lists as unknown as {workspace_id:string}).workspace_id;
  revalidatePath(`/w/${workspaceId}/lists/${entry.list_id}`);
  return { ok: true };
}

export async function saveEntryOrder(input: { listId: string; orderedIds: string[] }) {
  const parsed = z.object({ listId: z.uuid(), orderedIds: z.array(z.uuid()).max(500) }).safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };
  const { data: list } = await supabase.from("lists").select("workspace_id").eq("id", parsed.data.listId).single();
  if (!list) return { ok: false as const };
  const { data: rows } = await supabase.from("list_entries").select("id").eq("list_id", parsed.data.listId);
  const actual = new Set((rows ?? []).map(row => row.id));
  if (actual.size !== parsed.data.orderedIds.length || parsed.data.orderedIds.some(id => !actual.has(id))) return { ok: false as const };
  const updates = await Promise.all(parsed.data.orderedIds.map((id, index) => supabase.from("list_entries").update({ position: index }).eq("id", id).eq("list_id", parsed.data.listId)));
  if (updates.some(result => result.error)) return { ok: false as const };
  revalidatePath(`/w/${list.workspace_id}/lists/${parsed.data.listId}`);
  return { ok: true as const };
}

export async function setEntryQuantity(input: { entryId: string; quantity: number }) {
  const parsed = z.object({ entryId: z.uuid(), quantity: z.number().int().min(1).max(100000) }).safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Die Menge muss eine ganze Zahl ab 1 sein." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Bitte melde dich erneut an." };
  const { data: entry } = await supabase.from("list_entries").select("id,list_id,lists!inner(workspace_id)").eq("id", parsed.data.entryId).single();
  if (!entry) return { ok: false as const, message: "Eintrag nicht gefunden." };
  const { error } = await supabase.from("list_entries").update({ quantity: parsed.data.quantity }).eq("id", entry.id);
  if (error) return { ok: false as const, message: "Menge konnte nicht gespeichert werden." };
  const workspaceId = (entry.lists as unknown as {workspace_id:string}).workspace_id;
  revalidatePath(`/w/${workspaceId}/lists/${entry.list_id}`);
  return { ok: true as const };
}

export async function startNewShoppingRun(listId: string) {
  if (!z.uuid().safeParse(listId).success) return { ok: false as const, message: "Ungültige Liste." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "Bitte melde dich erneut an." };
  const { data: list } = await supabase.from("lists").select("id,workspace_id,kind").eq("id", listId).single();
  if (!list || !["shopping","mixed"].includes(list.kind)) return { ok: false as const, message: "Einkaufsliste nicht gefunden." };
  const { error: entriesError } = await supabase.from("list_entries").update({ is_completed: false, completed_at: null }).eq("list_id", listId).eq("is_completed", true);
  if (entriesError) return { ok: false as const, message: "Der neue Einkauf konnte nicht gestartet werden." };
  const { error: listError } = await supabase.from("lists").update({ shopping_session_id: null }).eq("id", listId);
  if (listError) return { ok: false as const, message: "Der Einkaufsverlauf konnte nicht zurückgesetzt werden." };
  revalidatePath(`/w/${list.workspace_id}/lists/${listId}`);
  return { ok: true as const };
}
