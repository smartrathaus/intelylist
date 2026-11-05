"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bell, Copy, FileText, Repeat, Share2 } from "lucide-react";
import { createEntryFromTemplate, createListFromTemplate, saveListTemplate, setRecurringTask, createEntryReminder, getDueNotifications, markNotificationRead } from "@/lib/advanced-actions";

type Template={id:string;name:string;kind:string};
type Entry={id:string;title:string;is_completed:boolean};
type Notice={id:string;title:string;body:string|null;remind_at:string};
export function ListTools({listId,workspaceId,kind,entries,templates}:{listId:string;workspaceId:string;kind:string;entries:Entry[];templates:Template[]}){
 const [templateName,setTemplateName]=useState("");const [templateId,setTemplateId]=useState("");const [newListName,setNewListName]=useState("Neue Liste");const [message,setMessage]=useState("");const [busy,startTransition]=useTransition();
 const [notices,setNotices]=useState<Notice[]>([]);const notified=useRef(new Set<string>());
 useEffect(()=>{
  let active=true;
  const poll=async()=>{const rows=await getDueNotifications();if(!active)return;setNotices(rows as Notice[]);for(const item of rows as Notice[]){if(!notified.current.has(item.id)){notified.current.add(item.id);if("Notification" in window&&Notification.permission==="granted")new Notification(item.title,{body:item.body??"Deine Erinnerung ist fällig."});}}};
  void poll();const timer=window.setInterval(()=>void poll(),60000);return()=>{active=false;window.clearInterval(timer);};
 },[]);
 async function saveTemplate(){const result=await saveListTemplate({listId,name:templateName});setMessage(result.ok?"Vorlage gespeichert.":result.message??"Vorlage konnte nicht gespeichert werden.");if(result.ok)setTemplateName("");}
 async function useTemplate(){if(!templateId)return;const result=await createListFromTemplate({workspaceId,templateId,name:newListName});if(result.ok&&result.listId)window.location.href=`/w/${workspaceId}/lists/${result.listId}`;else setMessage(result.message??"Vorlage konnte nicht geladen werden.");}
 async function addReminder(entryId:string,value:string){if(!value)return;const result=await createEntryReminder({listId,entryId,remindAt:new Date(value).toISOString()});setMessage(result.ok?"Erinnerung gespeichert.":result.message??"Erinnerung fehlgeschlagen.");}
 async function repeatEntry(entryId:string,frequency:"daily"|"weekly"|"monthly"|"yearly",interval:number,value:string){if(!value)return;const result=await setRecurringTask({listId,entryId,frequency,interval,nextDueAt:new Date(value+"T09:00:00").toISOString()});setMessage(result.ok?"Wiederholung gespeichert.":result.message??"Wiederholung fehlgeschlagen.");}
 return <section className="list-tools">
  <div className="list-tools-row">
   <form onSubmit={e=>{e.preventDefault();startTransition(()=>void saveTemplate());}} className="tool-inline"><FileText size={16}/><input aria-label="Name der Vorlage" placeholder="Vorlage aus dieser Liste speichern" value={templateName} onChange={e=>setTemplateName(e.target.value)} maxLength={100}/><button className="button button-secondary button-small" disabled={busy||!templateName.trim()}>Vorlage speichern</button></form>
   <button type="button" className="button button-ghost button-small" onClick={async()=>{if(!("Notification" in window)){setMessage("Dieser Browser unterstützt keine Benachrichtigungen.");return;}const permission=await Notification.requestPermission();setMessage(permission==="granted"?"Browserbenachrichtigungen aktiviert. Sie erscheinen, solange intelylist geöffnet ist.":"Benachrichtigungen wurden nicht freigegeben.");}}><Bell size={14}/> Benachrichtigungen aktivieren</button>
  </div>
  {templates.length>0&&<div className="template-use"><select value={templateId} onChange={e=>setTemplateId(e.target.value)} aria-label="Listen-Vorlage auswählen"><option value="">Vorlage auswählen…</option>{templates.filter(t=>t.kind===kind).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><input value={newListName} onChange={e=>setNewListName(e.target.value)} aria-label="Name der neuen Liste" maxLength={120}/><button type="button" className="button button-secondary button-small" onClick={()=>void useTemplate()} disabled={!templateId}>Aus Vorlage erstellen</button></div>}
  {notices.length>0&&<div className="notice-center"><strong>Fällige Erinnerungen</strong>{notices.map(item=><div key={item.id}><span>{item.title}</span><button type="button" className="button button-ghost button-small" onClick={async()=>{await markNotificationRead(item.id);setNotices(rows=>rows.filter(x=>x.id!==item.id));}}>Erledigt</button></div>)}</div>}
  <details className="recurrence-panel"><summary><Repeat size={15}/> Wiederholung und Erinnerung einrichten</summary><div className="recurrence-list">{entries.filter(e=>!e.is_completed).map(entry=><div className="recurrence-row" key={entry.id}><strong>{entry.title}</strong><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void repeatEntry(entry.id,String(f.get("frequency")) as "daily"|"weekly"|"monthly"|"yearly",Number(f.get("interval")),String(f.get("nextDue")));}}><select name="frequency" aria-label="Wiederholungsintervall"><option value="weekly">Wöchentlich</option><option value="daily">Täglich</option><option value="monthly">Monatlich</option><option value="yearly">Jährlich</option></select><input name="interval" type="number" min="1" max="365" defaultValue="1" aria-label="Intervall"/><input name="nextDue" type="date" defaultValue={new Date(Date.now()+7*86400000).toISOString().slice(0,10)} aria-label="Nächste Fälligkeit"/><button className="button button-secondary button-small">Wiederholen</button></form><form onSubmit={e=>{e.preventDefault();const value=String(new FormData(e.currentTarget).get("remindAt"));void addReminder(entry.id,value);}}><input name="remindAt" type="datetime-local" min={new Date().toISOString().slice(0,16)} aria-label="Erinnerungszeitpunkt"/><button className="button button-ghost button-small">Erinnern</button></form></div>)}</div></details>
  {message&&<p className="notice notice-success" role="status">{message}</p>}
 </section>;
}
