import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Check, Circle, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EntryManager } from "@/components/entry-manager";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export const dynamic = "force-dynamic";

export default async function ListPage({ params, searchParams }: { params: Promise<{ workspaceId: string; listId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { workspaceId, listId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: list } = await supabase.from("lists").select("id,name,kind,workspace_id,workspaces(name)").eq("id", listId).eq("workspace_id", workspaceId).single();
  if (!list) notFound();
  const { data: entries } = await supabase.from("list_entries").select("id,title,notes,is_completed,priority,due_at,quantity,unit,category,assigned_to").eq("list_id", listId).order("position").order("created_at");
  const { data: memberRows } = await supabase.from("workspace_members").select("user_id").eq("workspace_id", workspaceId);
  const memberIds = (memberRows ?? []).map((member) => member.user_id);
  const { data: profiles } = memberIds.length
    ? await supabase.from("profiles").select("user_id,display_name").in("user_id", memberIds)
    : { data: [] };
  const paramsData = await searchParams;
  const workspace = Array.isArray(list.workspaces) ? list.workspaces[0] : list.workspaces;
  const isShopping = list.kind === "shopping";
  const isMixed = list.kind === "mixed";
  return <main className="app-shell">
    <header className="topbar"><Link href={`/w/${workspaceId}`} className="brand"><span className="brand-mark"><ArrowLeft size={18}/></span><span>{workspace?.name ?? "Bereich"}</span></Link><span className="topbar-context">{list.name}</span></header>
    <section className="dashboard list-page">
      <p className="eyebrow">{isShopping ? "EINKAUFSLISTE" : "AUFGABENLISTE"}</p><div className="welcome-row"><div><h1>{list.name}</h1><p className="muted">{entries?.filter(e => !e.is_completed).length ?? 0} offen · {entries?.filter(e => e.is_completed).length ?? 0} erledigt</p></div><div className={`list-icon large ${isShopping ? "shopping" : ""}`}>{isShopping ? <ShoppingBasket size={24}/> : <Check size={24}/>}</div></div>
      {paramsData.error && <p className="notice notice-error">{paramsData.error}</p>}
      <EntryManager listId={listId} kind={list.kind as "tasks"|"shopping"|"mixed"} entries={(entries ?? []) as {id:string;title:string;notes:string|null;is_completed:boolean;priority:string;due_at:string|null;quantity:number|null;unit:string|null;category:string|null;assigned_to:string|null}[]} profiles={(profiles ?? []) as {user_id:string;display_name:string}[]}/>
      <RealtimeRefresh channel={`list-${listId}`} table="list_entries" filter={`list_id=eq.${listId}`}/>
    </section>
    <footer className="footer">intelylist <span>·</span> Änderungen werden automatisch aktualisiert.</footer>
  </main>;
}