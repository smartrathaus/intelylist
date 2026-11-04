import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, Circle, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createEntry, deleteEntry, toggleEntry } from "@/lib/actions";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export const dynamic = "force-dynamic";

export default async function ListPage({ params, searchParams }: { params: Promise<{ workspaceId: string; listId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { workspaceId, listId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: list } = await supabase.from("lists").select("id,name,kind,workspace_id,workspaces(name)").eq("id", listId).eq("workspace_id", workspaceId).single();
  if (!list) notFound();
  const { data: entries } = await supabase.from("list_entries").select("id,title,is_completed,priority,due_at,quantity,unit,category,assigned_to").eq("list_id", listId).order("is_completed").order("position").order("created_at");
  const { data: memberRows } = await supabase.from("workspace_members").select("user_id").eq("workspace_id", workspaceId);
  const memberIds = (memberRows ?? []).map((member) => member.user_id);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("user_id,display_name").in("user_id", memberIds)
    : { data: [] };
  const paramsData = await searchParams;
  const workspace = Array.isArray(list.workspaces) ? list.workspaces[0] : list.workspaces;
  const isShopping = list.kind === "shopping";
  return <main className="app-shell">
    <header className="topbar"><Link href={`/w/${workspaceId}`} className="brand"><span className="brand-mark"><ArrowLeft size={18}/></span><span>{workspace?.name ?? "Bereich"}</span></Link><span className="topbar-context">{list.name}</span></header>
    <section className="dashboard list-page">
      <p className="eyebrow">{isShopping ? "EINKAUFSLISTE" : "AUFGABENLISTE"}</p><div className="welcome-row"><div><h1>{list.name}</h1><p className="muted">{entries?.filter(e => !e.is_completed).length ?? 0} offen · {entries?.filter(e => e.is_completed).length ?? 0} erledigt</p></div><div className={`list-icon large ${isShopping ? "shopping" : ""}`}>{isShopping ? <ShoppingBasket size={24}/> : <Check size={24}/>}</div></div>
      {paramsData.error && <p className="notice notice-error">{paramsData.error}</p>}
      <form action={createEntry} className="entry-form entry-form-advanced">
        <input type="hidden" name="listId" value={listId}/><input type="hidden" name="kind" value={list.kind}/>
        <input name="title" placeholder={isShopping ? "Was wird benötigt?" : "Welche Aufgabe steht an?"} aria-label="Neuer Eintrag" maxLength={240} required/>
        {isShopping && <><input name="quantity" type="number" min="0.01" step="0.01" placeholder="Menge" aria-label="Menge"/><input name="unit" maxLength={32} placeholder="Einheit" aria-label="Einheit"/><input name="category" maxLength={80} placeholder="Kategorie" aria-label="Kategorie"/></>}
        {!isShopping && <><select name="priority" aria-label="Priorität" defaultValue="normal"><option value="low">Niedrig</option><option value="normal">Normal</option><option value="high">Hoch</option><option value="urgent">Dringend</option></select><input name="dueAt" type="date" aria-label="Fällig am"/></>}
        <select name="assignedTo" aria-label="Zuständigkeit" defaultValue=""><option value="">Nicht zugewiesen</option>{(profiles ?? []).map(profile => <option value={profile.user_id} key={profile.user_id}>{profile.display_name}</option>)}</select>
        <button className="button button-primary" type="submit"><Plus size={17}/> Hinzufügen</button>
      </form>
      <div className="entry-list">{entries?.map((entry) => <div className={`entry-row ${entry.is_completed ? "is-complete" : ""}`} key={entry.id}>
        <form action={toggleEntry}><input type="hidden" name="id" value={entry.id}/><input type="hidden" name="completed" value={String(!entry.is_completed)}/><button className="check-button" aria-label={entry.is_completed ? "Als offen markieren" : "Als erledigt markieren"}><span>{entry.is_completed ? <Check size={14}/> : <Circle size={19}/>}</span></button></form>
        <div className="entry-copy"><span>{entry.title}</span>
          {isShopping && (entry.quantity || entry.unit) ? <small>{entry.quantity ?? ""} {entry.unit ?? ""}</small> : null}
          {isShopping && entry.category ? <small>{entry.category}</small> : null}
          {!isShopping && entry.due_at ? <small>Fällig: {new Date(entry.due_at).toLocaleDateString("de-DE")}</small> : null}
          {entry.assigned_to ? <small>→ {(profiles ?? []).find(profile => profile.user_id === entry.assigned_to)?.display_name ?? "Mitglied"}</small> : null}
        </div>
        {entry.priority !== "normal" && !isShopping && <span className={`priority priority-${entry.priority}`}>{entry.priority === "urgent" ? "Dringend" : entry.priority === "high" ? "Hoch" : "Niedrig"}</span>}
        <form action={deleteEntry}><input type="hidden" name="id" value={entry.id}/><button className="icon-button" aria-label="Eintrag löschen"><Trash2 size={16}/></button></form>
      </div>)}</div>
      {!entries?.length && <div className="empty-state compact"><p>Noch keine Einträge. Füge oben den ersten hinzu.</p></div>}
      <RealtimeRefresh channel={`list-${listId}`} table="list_entries" filter={`list_id=eq.${listId}`}/>
    </section>
    <footer className="footer">intelylist <span>·</span> Änderungen werden automatisch aktualisiert.</footer>
  </main>;
}