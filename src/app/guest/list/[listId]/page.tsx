import { redirect,notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EntryManager } from "@/components/entry-manager";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { GuestAccountUpgrade } from "@/components/guest-account-upgrade";
export const dynamic="force-dynamic";
export default async function GuestListPage({params,searchParams}:{params:Promise<{listId:string}>;searchParams:Promise<{token?:string}>}){
 const {listId}=await params;const {token}=await searchParams;const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:list}=await supabase.from("lists").select("id,name,kind,workspace_id").eq("id",listId).single();if(!list)notFound();
 const {data:entries}=await supabase.from("list_entries").select("id,title,notes,is_completed,priority,due_at,quantity,unit,category,supermarket,assigned_to,created_at").eq("list_id",listId).order("position").order("created_at");
 if(!entries)notFound();
 return <main className="app-shell"><header className="topbar"><Link href="/" className="brand"><span className="brand-mark">←</span><span>intelylist</span></Link><span className="topbar-context">Gastzugang</span></header><section className="dashboard list-page"><p className="eyebrow">GEMEINSAME LISTE · GASTZUGANG</p><div className="welcome-row"><div><h1>{list.name}</h1><p className="muted">Du kannst Einträge hinzufügen, abhaken und bearbeiten. Zugriff nur auf diese Liste.</p></div></div><GuestAccountUpgrade/><EntryManager listId={listId} workspaceId={list.workspace_id} kind={list.kind as "tasks"|"shopping"|"mixed"} entries={entries as {id:string;title:string;notes:string|null;is_completed:boolean;priority:string;due_at:string|null;quantity:number|null;unit:string|null;category:string|null;supermarket:string|null;assigned_to:string|null;created_at:string}[]} profiles={[]} history={[]} favorites={[]} recentItems={[]}/><RealtimeRefresh channel={`guest-list-${listId}`} table="list_entries" filter={`list_id=eq.${listId}`}/></section><footer className="footer">intelylist · Gastzugang mit zeitlicher Begrenzung</footer></main>;
}
