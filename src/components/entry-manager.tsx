"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Circle, GripVertical, Trash2, ChevronUp, ChevronDown, Undo2 } from "lucide-react";
import { addEntrySmart, confirmDuplicateQuantity, saveEntryOrder, toggleEntry, deleteEntry, updateEntry } from "@/lib/actions";

type Entry = { id:string; title:string; notes:string|null; is_completed:boolean; priority:string; due_at:string|null; quantity:number|null; unit:string|null; category:string|null; assigned_to:string|null };
type Profile = { user_id:string; display_name:string };
type Props = { listId:string; kind:"tasks"|"shopping"|"mixed"; entries:Entry[]; profiles:Profile[] };

export function EntryManager({listId,kind,entries:initialEntries,profiles}:Props) {
  const [entries,setEntries]=useState(initialEntries);
  useEffect(()=>setEntries(initialEntries),[initialEntries]);
  const [filter,setFilter]=useState("all");
  const [sort,setSort]=useState("manual");
  const [query,setQuery]=useState("");
  const [title,setTitle]=useState("");
  const [quantity,setQuantity]=useState("1");
  const [unit,setUnit]=useState("");
  const [message,setMessage]=useState("");
  const [undo,setUndo]=useState<{id:string;completed:boolean}|null>(null);
  const [busy,startTransition]=useTransition();
  const shopping=kind==="shopping"||kind==="mixed";
  const visible=useMemo(()=>{
    let rows=entries.filter(e=>filter==="all"||(filter==="open"&&!e.is_completed)||(filter==="done"&&e.is_completed)||(filter==="overdue"&&!e.is_completed&&!!e.due_at&&new Date(e.due_at)<new Date()));
    if(query.trim()) rows=rows.filter(e=>e.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
    if(sort==="alpha") rows=[...rows].sort((a,b)=>a.title.localeCompare(b.title,"de"));
    if(sort==="priority") rows=[...rows].sort((a,b)=>["urgent","high","normal","low"].indexOf(a.priority)-["urgent","high","normal","low"].indexOf(b.priority));
    if(sort==="due") rows=[...rows].sort((a,b)=>(a.due_at??"9999").localeCompare(b.due_at??"9999"));
    if(sort==="created") rows=[...rows].reverse();
    return rows;
  },[entries,filter,sort,query]);
  async function add(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault(); if(!title.trim()) return;
    startTransition(async()=>{
      const result=await addEntrySmart({listId,title:title.trim(),kind,quantity:shopping?Number(quantity||1):undefined,unit});
      if(!result.ok){setMessage(result.message);return;}
      if(result.duplicate){
        const yes=window.confirm(`„${result.duplicate.title}“ ist bereits vorhanden (Menge: ${result.duplicate.quantity}). Soll die Anzahl auf ${result.duplicate.quantity+1} erhöht werden?`);
        if(yes){const changed=await confirmDuplicateQuantity({listId,entryId:result.duplicate.id,expectedQuantity:result.duplicate.quantity});setMessage(changed.ok?"Menge wurde erhöht.":changed.message??"Änderung nicht möglich.");}
        else setMessage("Der vorhandene Eintrag bleibt unverändert.");
      } else {setMessage("Eintrag hinzugefügt.");setTitle("");setQuantity("1");setUnit("");}
    });
  }
  async function move(id:string,delta:number){
    const ordered=[...entries]; const index=ordered.findIndex(e=>e.id===id); const target=index+delta;
    if(target<0||target>=ordered.length)return;
    [ordered[index],ordered[target]]=[ordered[target],ordered[index]];
    setEntries(ordered); setSort("manual");
    const result=await saveEntryOrder({listId,orderedIds:ordered.map(e=>e.id)});
    if(!result.ok){setEntries(initialEntries);setMessage("Reihenfolge konnte nicht gespeichert werden.");}
  }
  async function drop(dragId:string,targetId:string){
    if(dragId===targetId)return;
    const ordered=[...entries];const from=ordered.findIndex(e=>e.id===dragId);const to=ordered.findIndex(e=>e.id===targetId);
    if(from<0||to<0)return;const [item]=ordered.splice(from,1);ordered.splice(to,0,item);
    setEntries(ordered);setSort("manual");
    const result=await saveEntryOrder({listId,orderedIds:ordered.map(e=>e.id)});
    if(!result.ok){setEntries(initialEntries);setMessage("Reihenfolge konnte nicht gespeichert werden.");}
  }
  async function toggle(id:string,completed:boolean){
    const old=entries.find(e=>e.id===id);if(!old)return;
    setEntries(entries.map(e=>e.id===id?{...e,is_completed:completed}:e));
    const data=new FormData();data.set("id",id);data.set("completed",String(completed));
    await toggleEntry(data);setUndo({id,completed:old.is_completed});setMessage("Status geändert.");
  }
  async function undoLast(){
    if(!undo)return;const data=new FormData();data.set("id",undo.id);data.set("completed",String(undo.completed));
    await toggleEntry(data);setEntries(rows=>rows.map(e=>e.id===undo.id?{...e,is_completed:undo.completed}:e));setUndo(null);setMessage("Letzte Änderung rückgängig gemacht.");
  }
  return <section className="entry-manager">
    <form onSubmit={add} className="entry-form entry-form-advanced">
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder={shopping?"Was wird benötigt?":"Welche Aufgabe steht an?"} aria-label="Neuer Eintrag" maxLength={240} required/>
      {shopping&&<><input value={quantity} onChange={e=>setQuantity(e.target.value)} type="number" min="0.01" step="0.01" aria-label="Menge" placeholder="Menge"/><input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="Einheit" aria-label="Einheit" maxLength={32}/></>}
      <button className="button button-primary" type="submit" disabled={busy}>+ Hinzufügen</button>
    </form>
    <div className="list-toolbar">
      <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Liste durchsuchen…" aria-label="Liste durchsuchen"/>
      <select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filtern"><option value="all">Alle Einträge</option><option value="open">Offen</option><option value="done">Erledigt</option><option value="overdue">Überfällig</option></select>
      <select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sortieren"><option value="manual">Manuelle Reihenfolge</option><option value="alpha">Alphabetisch</option><option value="priority">Priorität</option><option value="due">Fälligkeit</option><option value="created">Neueste zuerst</option></select>
      {undo&&<button className="button button-secondary button-small" onClick={undoLast}><Undo2 size={14}/> Rückgängig</button>}
    </div>
    {message&&<p className="notice notice-success" role="status">{message}</p>}
    <div className="entry-list">{visible.map(entry=><div className={`entry-row ${entry.is_completed?"is-complete":""}`} key={entry.id} draggable={sort==="manual"} onDragStart={e=>e.dataTransfer.setData("text/plain",entry.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();drop(e.dataTransfer.getData("text/plain"),entry.id);}}>
      <span className="drag-handle" title="Zum Sortieren ziehen"><GripVertical size={17}/></span>
      <button type="button" className="check-button" aria-label={entry.is_completed?"Als offen markieren":"Als erledigt markieren"} onClick={()=>toggle(entry.id,!entry.is_completed)}><span>{entry.is_completed?<Check size={14}/>:<Circle size={19}/>}</span></button>
      <div className="entry-copy"><span>{entry.title}</span>{entry.notes&&<small>{entry.notes}</small>}{shopping&&(entry.quantity||entry.unit)&&<small>{entry.quantity??1} {entry.unit??""}</small>}{shopping&&entry.category&&<small>{entry.category}</small>}{!shopping&&entry.due_at&&<small>Fällig: {new Date(entry.due_at).toLocaleDateString("de-DE")}</small>}{entry.assigned_to&&<small>→ {profiles.find(p=>p.user_id===entry.assigned_to)?.display_name??"Mitglied"}</small>}</div>
      {entry.priority!=="normal"&&!shopping&&<span className={`priority priority-${entry.priority}`}>{entry.priority==="urgent"?"Dringend":entry.priority==="high"?"Hoch":"Niedrig"}</span>}
      <div className="order-actions"><button type="button" aria-label="Nach oben" onClick={()=>move(entry.id,-1)}><ChevronUp size={15}/></button><button type="button" aria-label="Nach unten" onClick={()=>move(entry.id,1)}><ChevronDown size={15}/></button></div>
      <details className="entry-edit"><summary>Bearbeiten</summary><form action={updateEntry} className="entry-edit-form"><input type="hidden" name="id" value={entry.id}/><input type="hidden" name="listId" value={listId}/><input type="hidden" name="kind" value={kind}/><label>Titel<input name="title" defaultValue={entry.title} maxLength={240} required/></label><label>Notiz<input name="notes" defaultValue={entry.notes??""}/></label>{shopping&&<div className="edit-field-row"><label>Menge<input name="quantity" type="number" min="0.01" step="0.01" defaultValue={entry.quantity??1}/></label><label>Einheit<input name="unit" defaultValue={entry.unit??""}/></label><label>Kategorie<input name="category" defaultValue={entry.category??""}/></label></div>}{(!shopping||kind==="mixed")&&<div className="edit-field-row"><label>Priorität<select name="priority" defaultValue={entry.priority}><option value="low">Niedrig</option><option value="normal">Normal</option><option value="high">Hoch</option><option value="urgent">Dringend</option></select></label><label>Fällig am<input name="dueAt" type="date" defaultValue={entry.due_at?entry.due_at.slice(0,10):""}/></label></div>}<label>Zuständig<select name="assignedTo" defaultValue={entry.assigned_to??""}><option value="">Nicht zugewiesen</option>{profiles.map(p=><option key={p.user_id} value={p.user_id}>{p.display_name}</option>)}</select></label><button className="button button-secondary" type="submit">Speichern</button></form></details>
      <form action={deleteEntry}><input type="hidden" name="id" value={entry.id}/><button className="icon-button" aria-label="Eintrag löschen"><Trash2 size={16}/></button></form>
    </div>)}</div>
    {!visible.length&&<div className="empty-state compact"><p>Keine passenden Einträge gefunden.</p></div>}
    <p className="list-hint">Tipp: Einträge per Ziehen sortieren oder mit den Pfeilen verschieben.</p>
  </section>;
}
