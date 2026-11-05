"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const themeSchema = z.object({
  theme: z.enum(["fresh-mint","ocean-blue","soft-lavender","warm-sand","graphite","custom"]),
  colorMode: z.enum(["light","dark","system"]),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable()
});

export async function saveUserPreferences(input: unknown) {
  const parsed = themeSchema.safeParse(input);
  if (!parsed.success) return { ok:false, message:"Ungültige Darstellungseinstellungen." };
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return { ok:false, message:"Bitte melde dich erneut an." };
  const { error } = await supabase.from("user_preferences").upsert({
    user_id:user.id, theme:parsed.data.theme, color_mode:parsed.data.colorMode,
    accent_color:parsed.data.accentColor, updated_at:new Date().toISOString()
  }, { onConflict:"user_id" });
  if (error) return { ok:false, message:"Einstellungen konnten nicht gespeichert werden." };
  revalidatePath("/", "layout");
  return { ok:true };
}

export async function toggleFavorite(input:{workspaceId:string;title:string;favorite:boolean}) {
  const parsed=z.object({workspaceId:z.uuid(),title:z.string().trim().min(1).max(240),favorite:z.boolean()}).safeParse(input);
  if(!parsed.success)return {ok:false};
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return {ok:false};
  const normalized=parsed.data.title.toLocaleLowerCase("de-DE").trim();
  const {error}=await supabase.from("user_item_preferences").upsert({
    user_id:user.id,workspace_id:parsed.data.workspaceId,normalized_title:normalized,
    display_title:parsed.data.title,is_favorite:parsed.data.favorite,last_used_at:new Date().toISOString()
  },{onConflict:"user_id,workspace_id,normalized_title"});
  return {ok:!error};
}

export async function recordItemUse(input:{workspaceId:string;title:string}) {
  const parsed=z.object({workspaceId:z.uuid(),title:z.string().trim().min(1).max(240)}).safeParse(input);
  if(!parsed.success)return {ok:false};
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return {ok:false};
  const normalized=parsed.data.title.toLocaleLowerCase("de-DE").trim();
  const {data:old}=await supabase.from("user_item_preferences").select("use_count,is_favorite").eq("workspace_id",parsed.data.workspaceId).eq("normalized_title",normalized).maybeSingle();
  const {error}=await supabase.from("user_item_preferences").upsert({
    user_id:user.id,workspace_id:parsed.data.workspaceId,normalized_title:normalized,
    display_title:parsed.data.title,is_favorite:old?.is_favorite??false,last_used_at:new Date().toISOString(),
    use_count:(old?.use_count??0)+1
  },{onConflict:"user_id,workspace_id,normalized_title"});
  return {ok:!error};
}

export async function bulkUpdateEntries(input:{listId:string;entryIds:string[];completed?:boolean;priority?:"low"|"normal"|"high"|"urgent"}) {
  const parsed=z.object({listId:z.uuid(),entryIds:z.array(z.uuid()).min(1).max(100),completed:z.boolean().optional(),priority:z.enum(["low","normal","high","urgent"]).optional()}).refine(v=>v.completed!==undefined||v.priority!==undefined).safeParse(input);
  if(!parsed.success)return {ok:false,message:"Bitte wähle Einträge und eine Änderung aus."};
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return {ok:false,message:"Bitte melde dich erneut an."};
  const {data:list}=await supabase.from("lists").select("id,workspace_id").eq("id",parsed.data.listId).single();
  if(!list)return {ok:false,message:"Liste nicht gefunden."};
  const update:Record<string,unknown>={};
  if(parsed.data.completed!==undefined){update.is_completed=parsed.data.completed;update.completed_at=parsed.data.completed?new Date().toISOString():null;}
  if(parsed.data.priority!==undefined)update.priority=parsed.data.priority;
  const {error}=await supabase.from("list_entries").update(update).eq("list_id",list.id).in("id",parsed.data.entryIds);
  if(error)return {ok:false,message:"Mehrfachänderung fehlgeschlagen."};
  revalidatePath(`/w/${list.workspace_id}/lists/${list.id}`);
  return {ok:true};
}

export async function saveListTemplate(input:{listId:string;name:string}) {
  const parsed=z.object({listId:z.uuid(),name:z.string().trim().min(1).max(100)}).safeParse(input);
  if(!parsed.success)return {ok:false,message:"Bitte einen Vorlagennamen eingeben."};
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return {ok:false,message:"Bitte melde dich erneut an."};
  const {data:list}=await supabase.from("lists").select("id,workspace_id,name,kind").eq("id",parsed.data.listId).single();
  if(!list)return {ok:false,message:"Liste nicht gefunden."};
  const {data:entries}=await supabase.from("list_entries").select("title,notes,priority,quantity,unit,category,supermarket").eq("list_id",list.id).order("position").limit(200);
  const {error}=await supabase.from("list_templates").insert({
    workspace_id:list.workspace_id,name:parsed.data.name,kind:list.kind,entries:entries??[],created_by:user.id
  });
  if(error)return {ok:false,message:"Vorlage konnte nicht gespeichert werden."};
  revalidatePath(`/w/${list.workspace_id}`);
  return {ok:true};
}

export async function createListFromTemplate(input:{workspaceId:string;templateId:string;name:string}) {
  const parsed=z.object({workspaceId:z.uuid(),templateId:z.uuid(),name:z.string().trim().min(1).max(120)}).safeParse(input);
  if(!parsed.success)return {ok:false,message:"Ungültige Vorlagendaten."};
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return {ok:false,message:"Bitte melde dich erneut an."};
  const {data:template}=await supabase.from("list_templates").select("id,kind,entries").eq("id",parsed.data.templateId).eq("workspace_id",parsed.data.workspaceId).single();
  if(!template)return {ok:false,message:"Vorlage nicht gefunden."};
  const {data:list,error}=await supabase.from("lists").insert({workspace_id:parsed.data.workspaceId,name:parsed.data.name,kind:template.kind,created_by:user.id}).select("id").single();
  if(error||!list)return {ok:false,message:"Liste konnte nicht angelegt werden."};
  const rows=Array.isArray(template.entries)?template.entries as Array<Record<string,unknown>>:[];
  if(rows.length){
    const {error:insertError}=await supabase.from("list_entries").insert(rows.map((entry,index)=>({
      list_id:list.id,created_by:user.id,title:String(entry.title??"").slice(0,240),notes:typeof entry.notes==="string"?entry.notes:null,
      priority:["low","normal","high","urgent"].includes(String(entry.priority))?entry.priority:"normal",
      quantity:typeof entry.quantity==="number"?Math.max(1,Math.floor(entry.quantity)):null,
      unit:typeof entry.unit==="string"?entry.unit:null,category:typeof entry.category==="string"?entry.category:null,
      supermarket:typeof entry.supermarket==="string"?entry.supermarket:null,position:index
    })));
    if(insertError){await supabase.from("lists").delete().eq("id",list.id);return {ok:false,message:"Vorlageneinträge konnten nicht übernommen werden."};}
  }
  revalidatePath(`/w/${parsed.data.workspaceId}`);
  return {ok:true,listId:list.id};
}

export async function setRecurringTask(input:{listId:string;entryId:string;frequency:"daily"|"weekly"|"monthly"|"yearly";interval:number;nextDueAt:string}) {
  const parsed=z.object({listId:z.uuid(),entryId:z.uuid(),frequency:z.enum(["daily","weekly","monthly","yearly"]),interval:z.number().int().min(1).max(365),nextDueAt:z.iso.datetime()}).safeParse(input);
  if(!parsed.success)return {ok:false,message:"Bitte prüfe die Wiederholungseinstellungen."};
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return {ok:false,message:"Bitte melde dich erneut an."};
  const {data:entry}=await supabase.from("list_entries").select("id,list_id").eq("id",parsed.data.entryId).eq("list_id",parsed.data.listId).single();
  if(!entry)return {ok:false,message:"Aufgabe nicht gefunden."};
  const {error}=await supabase.from("recurring_tasks").upsert({list_id:entry.list_id,source_entry_id:entry.id,created_by:user.id,frequency:parsed.data.frequency,interval_count:parsed.data.interval,next_due_at:parsed.data.nextDueAt,is_active:true},{onConflict:"source_entry_id"});
  return {ok:!error,message:error?"Wiederholung konnte nicht gespeichert werden.":undefined};
}

export async function createEntryReminder(input:{listId:string;entryId:string;remindAt:string}) {
  const parsed=z.object({listId:z.uuid(),entryId:z.uuid(),remindAt:z.iso.datetime()}).safeParse(input);
  if(!parsed.success||new Date(parsed.data.remindAt)<=new Date())return {ok:false,message:"Bitte einen zukünftigen Erinnerungszeitpunkt wählen."};
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return {ok:false,message:"Bitte melde dich erneut an."};
  const {data:entry}=await supabase.from("list_entries").select("id,title,list_id,lists!inner(workspace_id)").eq("id",parsed.data.entryId).eq("list_id",parsed.data.listId).single();
  if(!entry)return {ok:false,message:"Eintrag nicht gefunden."};
  const workspaceId=(entry.lists as unknown as {workspace_id:string}).workspace_id;
  const {error}=await supabase.from("user_notifications").insert({user_id:user.id,workspace_id:workspaceId,entry_id:entry.id,title:entry.title,body:"Deine persönliche Erinnerung für diese Aufgabe.",remind_at:parsed.data.remindAt});
  return {ok:!error,message:error?"Erinnerung konnte nicht gespeichert werden.":undefined};
}

export async function markNotificationRead(notificationId:string) {
  if(!z.uuid().safeParse(notificationId).success)return {ok:false};
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return {ok:false};
  const {error}=await supabase.from("user_notifications").update({read_at:new Date().toISOString()}).eq("id",notificationId).eq("user_id",user.id);
  return {ok:!error};
}

export async function getDueNotifications() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return [];
  const {data}=await supabase.from("user_notifications").select("id,title,body,remind_at").eq("user_id",user.id).is("read_at",null).lte("remind_at",new Date().toISOString()).order("remind_at").limit(20);
  return data??[];
}

export async function createListGuestInvite(input:{listId:string;hours?:number;maxUses?:number}) {
 const parsed=z.object({listId:z.uuid(),hours:z.number().int().min(1).max(168).default(24),maxUses:z.number().int().min(1).max(100).default(10)}).safeParse(input);
 if(!parsed.success)return {ok:false,message:"Ungültige Freigabe."};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user||user.is_anonymous)return {ok:false,message:"Nur angemeldete Mitglieder können einen Gastzugang erstellen."};
 const {data:list}=await supabase.from("lists").select("id,workspace_id").eq("id",parsed.data.listId).single();
 if(!list)return {ok:false,message:"Liste nicht gefunden."};
 const token=randomBytes(32).toString("base64url");
 const expiresAt=new Date(Date.now()+parsed.data.hours*60*60*1000).toISOString();
 const {data,error}=await supabase.from("list_guest_invites").insert({list_id:list.id,token_hash:createHash("sha256").update(token).digest("hex"),created_by:user.id,expires_at:expiresAt,max_uses:parsed.data.maxUses}).select("id").single();
 if(error||!data)return {ok:false,message:"Gastlink konnte nicht erstellt werden."};
 revalidatePath(`/w/${list.workspace_id}/lists/${list.id}`);
 return {ok:true,url:`${process.env.NEXT_PUBLIC_SITE_URL??""}/guest/${token}`,expiresAt};
}

export async function redeemListGuestInvite(token:string) {
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return {ok:false,message:"Der QR-Code ist ungültig."};
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {ok:false,message:"Bitte starte den Gastzugang erneut."};
 const {data,error}=await supabase.rpc("redeem_list_guest_invite",{raw_token:token});
 if(error||!data?.[0])return {ok:false,message:"Dieser Gastzugang ist abgelaufen, widerrufen oder ausgeschöpft."};
 return {ok:true,listId:data[0].list_id,listName:data[0].list_name,expiresAt:data[0].expires_at};
}
