import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckSquare, ShoppingBasket, Users, Plus, Layers3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createWorkspace, signOut } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: memberships }, { data: profile }] = await Promise.all([
    supabase.from("workspace_members").select("role,workspaces(id,name,created_at)").eq("user_id", user.id).order("joined_at", { ascending: true }),
    supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id)
  ]);
  const workspaceIds = (profile ?? []).map((m) => m.workspace_id);
  const { count: openCount } = workspaceIds.length
    ? await supabase.from("list_entries").select("id,lists!inner(workspace_id)", { count: "exact", head: true }).in("lists.workspace_id", workspaceIds).eq("is_completed", false)
    : { count: 0 };
  const params = await searchParams;
  const workspaces = (memberships ?? []).flatMap((m) => {
    const w = Array.isArray(m.workspaces) ? m.workspaces[0] : m.workspaces;
    return w ? [{ ...w, role: m.role }] : [];
  });

  return <main className="app-shell">
    <header className="topbar">
      <Link href="/" className="brand"><img className="brand-logo" src="/intelylist-logo.svg" alt="intelylist – Intelligente Aufgabenverwaltung"/></Link>
      <div className="topbar-right"><span className="user-email">{user.email}</span><Link href="/account" className="button button-ghost button-small">Konto</Link><form action={signOut}><button className="button button-ghost button-small">Abmelden</button></form></div>
    </header>
    <section className="dashboard">
      <div className="welcome-row">
        <div><p className="eyebrow">DEIN ÜBERBLICK</p><h1>Guten Tag.</h1><p className="muted">Wähle einen Bereich und organisiert gemeinsam, was ansteht.</p></div>
        <div className="summary-chip"><CheckSquare size={17}/><span><strong>{openCount ?? 0}</strong> offene Einträge</span></div>
      </div>
      {params.error && <p className="notice notice-error">{params.error}</p>}{params.message && <p className="notice notice-success">{params.message}</p>}
      <div className="section-heading"><div><h2>Deine Bereiche</h2><p className="muted">Gemeinsame Räume für Familie, Freunde und Alltag.</p></div><span className="count-pill">{workspaces.length}</span></div>
      {workspaces.length ? <div className="workspace-grid">{workspaces.map((w) => <Link className="workspace-card" href={`/w/${w.id}`} key={w.id}>
        <div className="workspace-icon"><Users size={20}/></div><div className="workspace-card-body"><h3>{w.name}</h3><p>{w.role === "owner" ? "Inhaberin / Inhaber" : w.role === "admin" ? "Administration" : "Mitglied"}</p></div><ArrowRight className="workspace-arrow" size={18}/>
      </Link>)}</div> : <div className="empty-state"><div className="empty-icon"><Users size={24}/></div><h3>Hier ist noch Platz für euch.</h3><p>Erstelle den ersten Bereich und lade später Familie oder Freunde ein.</p></div>}
      <section className="create-panel"><div><div className="create-icon"><Plus size={19}/></div><h3>Neuen Bereich erstellen</h3><p className="muted">Zum Beispiel „Zuhause“, „Urlaub“ oder „WG“.</p></div>
        <form action={createWorkspace} className="inline-form"><input name="name" aria-label="Name des Bereichs" placeholder="Name des Bereichs" maxLength={100} required/><button className="button button-primary" type="submit">Bereich anlegen <ArrowRight size={16}/></button></form>
      </section>
      <div className="module-hints"><div><CheckSquare size={18}/><div><strong>Aufgaben</strong><span>Termine, Zuständigkeiten und Prioritäten.</span></div></div><div><ShoppingBasket size={18}/><div><strong>Einkaufslisten</strong><span>Gemeinsam planen und abhaken.</span></div></div></div>
    </section>
    <footer className="footer">intelylist <span>·</span> Gemeinsam organisieren. Einfach erledigen.</footer>
  </main>;
}