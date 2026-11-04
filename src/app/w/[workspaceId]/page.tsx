import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckSquare, Plus, ShoppingBasket, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createList, changeMemberRole, removeWorkspaceMember } from "@/lib/actions";
import { InvitePanel } from "@/components/invite-panel";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: workspace } = await supabase.from("workspaces").select("id,name").eq("id", workspaceId).single();
  if (!workspace) notFound();
  const { data: lists } = await supabase.from("lists").select("id,name,kind,updated_at").eq("workspace_id", workspaceId).is("archived_at", null).order("updated_at", { ascending: false });
  const { data: members } = await supabase.from("workspace_members").select("user_id,role").eq("workspace_id", workspaceId);
  const memberIds = (members ?? []).map((member) => member.user_id);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("user_id,display_name").in("user_id", memberIds)
    : { data: [] };
  const query = await searchParams;
  const currentRole = (members ?? []).find(m => m.user_id === user.id)?.role;
  return <main className="app-shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark"><ArrowLeft size={18}/></span><span>Alle Bereiche</span></Link><span className="topbar-context">{workspace.name}</span></header>
    <section className="dashboard">
      <p className="eyebrow">BEREICH</p><div className="welcome-row"><div><h1>{workspace.name}</h1><p className="muted">Hier laufen eure gemeinsamen Listen zusammen.</p></div><div className="summary-chip"><Users size={17}/>{members?.length ?? 1} Mitglieder</div></div>
      {query.error && <p className="notice notice-error">{params.error}</p>}{query.message && <p className="notice notice-success">{params.message}</p>}
      <div className="section-heading"><div><h2>Listen</h2><p className="muted">Wähle eine Liste oder erstelle eine neue.</p></div></div>
      {lists?.length ? <div className="list-grid">{lists.map((list) => <Link href={`/w/${workspaceId}/lists/${list.id}`} className="list-card" key={list.id}><div className={`list-icon ${list.kind === "shopping" ? "shopping" : ""}`}>{list.kind === "shopping" ? <ShoppingBasket size={21}/> : <CheckSquare size={21}/>}</div><div className="list-card-copy"><h3>{list.name}</h3><p>{list.kind === "shopping" ? "Einkaufsliste" : list.kind === "mixed" ? "Gemischte Liste" : "Aufgabenliste"}</p></div><ArrowRight size={18} className="workspace-arrow"/></Link>)}</div> : <div className="empty-state"><div className="empty-icon"><CheckSquare size={24}/></div><h3>Der erste Schritt ist eine Liste.</h3><p>Lege eine Aufgaben- oder Einkaufsliste für diesen Bereich an.</p></div>}
      <section className="members-panel">
        <div className="section-heading"><div><h2>Mitglieder</h2><p className="muted">Wer hat Zugriff auf diesen Bereich?</p></div></div>
        <div className="member-list">{(members ?? []).map((member) => {
          const profile = (profiles ?? []).find((item) => item.user_id === member.user_id);
          const isSelf = member.user_id === user.id;
          const canRemove = !isSelf && member.role !== "owner" && (currentRole === "owner" || (currentRole === "admin" && member.role === "member"));
          const canChangeRole = !isSelf && member.role !== "owner" && currentRole === "owner";
          return <div className="member-row" key={member.user_id}>
            <div className="member-avatar">{(profile?.display_name ?? "M").slice(0,1).toUpperCase()}</div>
            <div className="member-copy"><strong>{profile?.display_name ?? "Mitglied"}{isSelf ? " (du)" : ""}</strong><span>{member.role === "owner" ? "Inhaber" : member.role === "admin" ? "Admin" : "Mitglied"}</span></div>
            {canChangeRole && <form action={changeMemberRole} className="member-role-form"><input type="hidden" name="workspaceId" value={workspaceId}/><input type="hidden" name="targetUser" value={member.user_id}/><select name="role" aria-label={`Rolle von ${profile?.display_name ?? "Mitglied"}`} defaultValue={member.role}><option value="member">Mitglied</option><option value="admin">Admin</option></select><button className="button button-secondary button-small">Speichern</button></form>}
            {canRemove && <form action={removeWorkspaceMember}><input type="hidden" name="workspaceId" value={workspaceId}/><input type="hidden" name="targetUser" value={member.user_id}/><button className="button button-ghost button-small">Entfernen</button></form>}
          </div>;
        })}</div>
      </section>
      {(currentRole === "owner" || currentRole === "admin") && <InvitePanel workspaceId={workspaceId} canInviteAdmin={currentRole === "owner"}/> }
      <section className="create-panel"><div><div className="create-icon"><Plus size={19}/></div><h3>Neue Liste anlegen</h3><p className="muted">Ihr könnt mehrere Listen pro Bereich führen.</p></div>
        <form action={createList} className="inline-form"><input type="hidden" name="workspaceId" value={workspaceId}/><input name="name" aria-label="Listenname" placeholder="Name der Liste" maxLength={120} required/><select name="kind" aria-label="Listentyp" defaultValue="tasks"><option value="tasks">Aufgaben</option><option value="shopping">Einkauf</option><option value="mixed">Gemischt</option></select><button className="button button-primary" type="submit">Erstellen <ArrowRight size={16}/></button></form>
      </section>
    </section>
    <footer className="footer">intelylist <span>·</span> {workspace.name}</footer>
  </main>;
}