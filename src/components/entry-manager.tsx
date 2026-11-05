"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Circle, GripVertical, Trash2, ChevronUp, ChevronDown, Undo2, Plus, Minus, Search, Star, Printer, Share2 } from "lucide-react";
import { addEntrySmart, confirmDuplicateQuantity, saveEntryOrder, toggleEntry, deleteEntry, updateEntry, setEntryQuantity, startNewShoppingRun } from "@/lib/actions";
import { bulkUpdateEntries, recordItemUse, toggleFavorite } from "@/lib/advanced-actions";
import { suggestShoppingCategory, shoppingCategoryOrder } from "@/lib/shopping-categories";

type Entry = { id:string; title:string; notes:string|null; is_completed:boolean; priority:string; due_at:string|null; quantity:number|null; unit:string|null; category:string|null; supermarket:string|null; assigned_to:string|null; created_at:string };
type Profile = { user_id:string; display_name:string };
type History = { entry_id:string; session_id:string; sequence_position:number; completed_at:string };
type Props = { listId:string; workspaceId:string; kind:"tasks"|"shopping"|"mixed"; entries:Entry[]; profiles:Profile[]; history:History[]; favorites:string[]; recentItems:string[] };

export function EntryManager({listId,workspaceId,kind,entries:initialEntries,profiles,history,favorites:initialFavorites,recentItems}:Props) {
  const [entries,setEntries]=useState(initialEntries);
  useEffect(()=>setEntries(initialEntries),[initialEntries]);
  const [filter,setFilter]=useState("open");
  const [sort,setSort]=useState(kind==="shopping"?"habit":"manual");
  const [query,setQuery]=useState("");
  const [title,setTitle]=useState("");
  const [quantity,setQuantity]=useState(1);
  const [unit,setUnit]=useState("");
  const [supermarket,setSupermarket]=useState("");
  const [message,setMessage]=useState("");
  const [favorites,setFavorites]=useState(initialFavorites);
  const [selected,setSelected]=useState<string[]>([]);
  useEffect(()=>setFavorites(initialFavorites),[initialFavorites]);
  const [undo,setUndo]=useState<{id:string;completed:boolean}|null>(null);
  const [busy,startTransition]=useTransition();
  const shopping=kind==="shopping"||kind==="mixed";
  const supermarkets=useMemo(()=>Array.from(new Set(entries.map(e=>e.supermarket?.trim()).filter((x):x is string=>!!x))).sort((a,b)=>a.localeCompare(b,"de")),[entries]);
  const habitScores=useMemo(()=>{
    const sessions=Array.from(new Set(history.map(h=>h.session_id))).slice(0,5);
    const scores=new Map<string,number>();
    for(const entry of entries){
      const positions=history.filter(h=>h.entry_id===entry.id&&sessions.includes(h.session_id)).map(h=>h.sequence_position);
      if(positions.length)scores.set(entry.id,positions.reduce((a,b)=>a+b,0)/positions.length);
    }
    return scores;
  },[entries,history]);
  const visible=useMemo(()=>{
    let rows=entries.filter(e=>filter==="all"||(filter==="open"&&!e.is_completed)||(filter==="done"&&e.is_completed)||(filter==="overdue"&&!e.is_completed&&!!e.due_at&&new Date(e.due_at)<new Date()));
    if(query.trim()) rows=rows.filter(e=>e.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())||(e.supermarket??"").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
    if(sort==="alpha") rows=[...rows].sort((a,b)=>a.title.localeCompare(b.title,"de"));
    if(sort==="priority") rows=[...rows].sort((a,b)=>["urgent","high","normal","low"].indexOf(a.priority)-["urgent","high","normal","low"].indexOf(b.priority));
    if(sort==="due") rows=[...rows].sort((a,b)=>(a.due_at??"9999").localeCompare(b.due_at??"9999"));
    if(sort==="created") rows=[...rows].sort((a,b)=>b.created_at.localeCompare(a.created_at));
    if(sort==="status") rows=[...rows].sort((a,b)=>Number(a.is_completed)-Number(b.is_completed));
    if(sort==="store") rows=[...rows].sort((a,b)=>(a.supermarket??"Sonstiges").localeCompare(b.supermarket??"Sonstiges","de")||a.title.localeCompare(b.title,"de"));
    if(sort==="category") rows=[...rows].sort((a,b)=>shoppingCategoryOrder.indexOf(a.category??"Sonstiges")-shoppingCategoryOrder.indexOf(b.category??"Sonstiges")||a.title.localeCompare(b.title,"de"));
    if(sort==="favorites") rows=[...rows].sort((a,b)=>Number(favorites.includes(b.title.toLocaleLowerCase("de-DE")))-Number(favorites.includes(a.title.toLocaleLowerCase("de-DE"))));
    if(sort==="habit") rows=[...rows].sort((a,b)=>(habitScores.get(a.id)??9999)-(habitScores.get(b.id)??9999)||a.title.localeCompare(b.title,"de"));
    return rows;
  },[entries,filter,sort,query,habitScores,favorites]);
  async function add(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault(); if(!title.trim()) return;
    startTransition(async()=>{
      const category=shopping?suggestShoppingCategory(title):undefined;
      const result=await addEntrySmart({listId,title:title.trim(),kind,quantity:shopping?quantity:undefined,unit,supermarket,category});
      if(!result.ok){setMessage(result.message);return;}
      if(result.duplicate){
        const yes=window.confirm(`„${result.duplicate.title}“ ist bereits vorhanden (Menge: ${result.duplicate.quantity}). Soll die Anzahl auf ${result.duplicate.quantity+1} erhöht werden?`);
        if(yes){const changed=await confirmDuplicateQuantity({listId,entryId:result.duplicate.id,expectedQuantity:result.duplicate.quantity});setMessage(changed.ok?"Menge wurde erhöht.":changed.message??"Änderung nicht möglich.");}
        else setMessage("Der vorhandene Eintrag bleibt unverändert.");
      } else {await recordItemUse({workspaceId,title:title.trim()});setMessage("Eintrag hinzugefügt.");setTitle("");setQuantity(1);setUnit("");}
    });
  }
  async function move(id:string,delta:number){
    const ordered=[...entries];const index=ordered.findIndex(e=>e.id===id);const target=index+delta;
    if(target<0||target>=ordered.length)return;
    [ordered[index],ordered[target]]=[ordered[target],ordered[index]];
    setEntries(ordered);setSort("manual");
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
    setEntries(rows=>rows.map(e=>e.id===id?{...e,is_completed:completed}:e));
    const data=new FormData();data.set("id",id);data.set("completed",String(completed));
    await toggleEntry(data);setUndo({id,completed:old.is_completed});setMessage("Status geändert.");
  }
  async function changeQuantity(entry:Entry,delta:number){
    const next=Math.max(1,Math.min(100000,(entry.quantity??1)+delta));
    if(next===(entry.quantity??1))return;
    setEntries(rows=>rows.map(e=>e.id===entry.id?{...e,quantity:next}:e));
    const result=await setEntryQuantity({entryId:entry.id,quantity:next});
    if(!result.ok){setEntries(rows=>rows.map(e=>e.id===entry.id?{...e,quantity:entry.quantity??1}:e));setMessage(result.message);}
  }
  async function toggleStar(entry:Entry){
    const key=entry.title.toLocaleLowerCase("de-DE");const next=!favorites.includes(key);
    setFavorites(rows=>next?[...rows,key]:rows.filter(x=>x!==key));
    const result=await toggleFavorite({workspaceId,title:entry.title,favorite:next});
    if(!result.ok){setFavorites(rows=>next?rows.filter(x=>x!==key):[...rows,key]);setMessage("Favorit konnte nicht gespeichert werden.");}
  }
  async function applyBulk(completed?:boolean,priority?:"low"|"normal"|"high"|"urgent"){
    if(!selected.length)return;const result=await bulkUpdateEntries({listId,entryIds:selected,completed,priority});
    if(result.ok){if(completed!==undefined)setEntries(rows=>rows.map(e=>selected.includes(e.id)?{...e,is_completed:completed}:e));if(priority!==undefined)setEntries(rows=>rows.map(e=>selected.includes(e.id)?{...e,priority}:e));setSelected([]);setMessage("Mehrfachänderung gespeichert.");}else setMessage(result.message??"Mehrfachänderung fehlgeschlagen.");
  }
  async function shareList(){
    const url=window.location.href;
    if(navigator.share){try{await navigator.share({title:document.title,url});}catch{return;}}
    else{await navigator.clipboard.writeText(url);setMessage("Listenlink wurde kopiert.");}
  }
  async function startNextShoppingRun(){
    if(!window.confirm("Alle abgehakten Artikel wieder öffnen und einen neuen Einkauf beginnen?"))return;
    const result=await startNewShoppingRun(listId);
    if(result.ok){setEntries(rows=>rows.map(e=>({...e,is_completed:false})));setFilter("open");setMessage("Neuer Einkauf gestartet. Die bisherige Laufweghistorie bleibt gespeichert.");}
    else setMessage(result.message);
  }
  async function undoLast(){
    if(!undo)return;const data=new FormData();data.set("id",undo.id);data.set("completed",String(undo.completed));
    await toggleEntry(data);setEntries(rows=>rows.map(e=>e.id===undo.id?{...e,is_completed:undo.completed}:e));setUndo(null);setMessage("Letzte Änderung rückgängig gemacht.");
  }
  return <section className="entry-manager">
    <form onSubmit={add} className="entry-form entry-form-advanced">
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder={shopping?"Was wird benötigt?":"Welche Aufgabe steht an?"} aria-label="Neuer Eintrag" maxLength={240} required list="recent-item-suggestions"/>
      <datalist id="recent-item-suggestions">{recentItems.map(item=><option key={item} value={item}/>)}</datalist>
      {shopping&&<div className="new-quantity"><button type="button" aria-label="Menge verringern" onClick={()=>setQuantity(q=>Math.max(1,q-1))}><Minus size={16}/></button><output aria-live="polite">{quantity}</output><button type="button" aria-label="Menge erhöhen" onClick={()=>setQuantity(q=>Math.min(100000,q+1))}><Plus size={16}/></button></div>}
      {shopping&&<input value={unit} onChange={e=>setUnit(e.target.value)} placeholder="Einheit (optional)" aria-label="Einheit" maxLength={32}/>}
      {shopping&&<input value={supermarket} onChange={e=>setSupermarket(e.target.value)} placeholder="Supermarkt (optional)" aria-label="Supermarkt" maxLength={100} list="supermarket-suggestions"/>}
      <button className="button button-primary" type="submit" disabled={busy}>+ Hinzufügen</button>
      <datalist id="supermarket-suggestions">{supermarkets.map(s=><option key={s} value={s}/>)}</datalist>
    </form>
    <div className="list-toolbar">
      <label className="search-field"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Suchen…" aria-label="Liste durchsuchen"/></label>
      <select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Statusfilter"><option value="open">Offen</option><option value="done">Erledigt</option><option value="all">Alle</option><option value="overdue">Überfällig</option></select>
      <select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sortieren"><option value="manual">Manuelle Reihenfolge</option><option value="status">Status: offen zuerst</option>{shopping&&<><option value="habit">Mein üblicher Einkaufsweg</option><option value="store">Nach Supermarkt</option><option value="category">Nach Regalgruppe</option><option value="favorites">Favoriten zuerst</option></>}<option value="alpha">Alphabetisch</option><option value="priority">Priorität</option><option value="due">Fälligkeit</option><option value="created">Neueste zuerst</option></select>
      {undo&&<button className="button button-secondary button-small" onClick={undoLast}><Undo2 size={14}/> Rückgängig</button>}
      <button type="button" className="button button-ghost button-small" onClick={()=>window.print()}><Printer size={14}/> Drucken / PDF</button><button type="button" className="button button-ghost button-small" onClick={shareList}><Share2 size={14}/> Teilen</button>{shopping&&entries.some(e=>e.is_completed)&&<button className="button button-secondary button-small" onClick={startNextShoppingRun}>Neuen Einkauf starten</button>}
    </div>
    {sort==="habit"&&shopping&&<p className="list-hint">Die Reihenfolge basiert auf den letzten fünf gespeicherten Einkaufsdurchläufen. Bei neuen Artikeln wird der Name als Fallback verwendet.</p>}
    {selected.length>0&&<div className="bulk-toolbar"><strong>{selected.length} ausgewählt</strong><button type="button" className="button button-secondary button-small" onClick={()=>applyBulk(false)}>Öffnen</button><button type="button" className="button button-secondary button-small" onClick={()=>applyBulk(true)}>Erledigen</button><select aria-label="Priorität für Auswahl" defaultValue="" onChange={e=>{if(e.target.value)applyBulk(undefined,e.target.value as "low"|"normal"|"high"|"urgent");}}><option value="">Priorität ändern…</option><option value="low">Niedrig</option><option value="normal">Normal</option><option value="high">Hoch</option><option value="urgent">Dringend</option></select><button type="button" className="button button-ghost button-small" onClick={()=>setSelected([])}>Auswahl aufheben</button></div>}
    {message&&<p className="notice notice-success" role="status">{message}</p>}
    <div className="entry-list">{visible.map(entry=><div className={`entry-row ${entry.is_completed?"is-complete":""}`} key={entry.id} data-entry-id={entry.id}>
      <button type="button" className="drag-handle" title="Mit Maus, Touch oder Stift ziehen" aria-label={`${entry.title} verschieben`} onPointerDown={e=>{if(sort!=="manual")return;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.dragging=entry.id;}} onPointerMove={e=>{if(e.currentTarget.dataset.dragging&&e.buttons){if(e.clientY<90)window.scrollBy(0,-12);else if(e.clientY>window.innerHeight-90)window.scrollBy(0,12);}}} onPointerUp={e=>{const id=e.currentTarget.dataset.dragging;delete e.currentTarget.dataset.dragging;if(!id)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest("[data-entry-id]") as HTMLElement|null;if(target?.dataset.entryId)drop(id,target.dataset.entryId);}} onPointerCancel={e=>{delete e.currentTarget.dataset.dragging;}}><GripVertical size={17}/></button>
      <input type="checkbox" aria-label={`${entry.title} auswählen`} checked={selected.includes(entry.id)} onChange={e=>setSelected(rows=>e.target.checked?[...rows,entry.id]:rows.filter(x=>x!==entry.id))}/>
      <button type="button" className="check-button" aria-label={entry.is_completed?"Als offen markieren":"Als erledigt markieren"} onClick={()=>toggle(entry.id,!entry.is_completed)}><span>{entry.is_completed?<Check size={14}/>:<Circle size={19}/>}</span></button>
      <div className="entry-copy"><span>{entry.title}</span>{shopping&&<div className="quantity-control"><button type="button" onClick={()=>changeQuantity(entry,-1)} aria-label={`${entry.title}: Menge verringern`} disabled={(entry.quantity??1)<=1}><Minus size={13}/></button><strong>{entry.quantity??1}</strong><button type="button" onClick={()=>changeQuantity(entry,1)} aria-label={`${entry.title}: Menge erhöhen`}><Plus size={13}/></button>{entry.unit&&<small>{entry.unit}</small>}</div>}{entry.notes&&<small>{entry.notes}</small>}{shopping&&entry.supermarket&&<small className="store-tag">{entry.supermarket}</small>}{shopping&&entry.category&&<small>{entry.category}</small>}{!shopping&&entry.due_at&&<small>Fällig: {new Date(entry.due_at).toLocaleDateString("de-DE")}</small>}{entry.assigned_to&&<small>→ {profiles.find(p=>p.user_id===entry.assigned_to)?.display_name??"Mitglied"}</small>}</div>
      {shopping&&<button type="button" className={`favorite-button ${favorites.includes(entry.title.toLocaleLowerCase("de-DE"))?"active":""}`} aria-label={favorites.includes(entry.title.toLocaleLowerCase("de-DE"))?"Favorit entfernen":"Als Favorit speichern"} onClick={()=>toggleStar(entry)}><Star size={16} fill={favorites.includes(entry.title.toLocaleLowerCase("de-DE"))?"currentColor":"none"}/></button>}
      {entry.priority!=="normal"&&!shopping&&<span className={`priority priority-${entry.priority}`}>{entry.priority==="urgent"?"Dringend":entry.priority==="high"?"Hoch":"Niedrig"}</span>}
      <div className="order-actions"><button type="button" aria-label="Nach oben" onClick={()=>move(entry.id,-1)}><ChevronUp size={15}/></button><button type="button" aria-label="Nach unten" onClick={()=>move(entry.id,1)}><ChevronDown size={15}/></button></div>
      <details className="entry-edit"><summary>Bearbeiten</summary><form action={updateEntry} className="entry-edit-form"><input type="hidden" name="id" value={entry.id}/><input type="hidden" name="listId" value={listId}/><input type="hidden" name="kind" value={kind}/><label>Titel<input name="title" defaultValue={entry.title} maxLength={240} required/></label><label>Notiz<input name="notes" defaultValue={entry.notes??""}/></label>{shopping&&<div className="edit-field-row"><label>Menge<input name="quantity" type="number" min="1" step="1" defaultValue={entry.quantity??1}/></label><label>Einheit<input name="unit" defaultValue={entry.unit??""}/></label></div>}{shopping&&<><label>Supermarkt<input name="supermarket" defaultValue={entry.supermarket??""} list="supermarket-suggestions"/></label><label>Kategorie<input name="category" defaultValue={entry.category??""}/></label></>}{(!shopping||kind==="mixed")&&<div className="edit-field-row"><label>Priorität<select name="priority" defaultValue={entry.priority}><option value="low">Niedrig</option><option value="normal">Normal</option><option value="high">Hoch</option><option value="urgent">Dringend</option></select></label><label>Fällig am<input name="dueAt" type="date" defaultValue={entry.due_at?entry.due_at.slice(0,10):""}/></label></div>}<label>Zuständig<select name="assignedTo" defaultValue={entry.assigned_to??""}><option value="">Nicht zugewiesen</option>{profiles.map(p=><option key={p.user_id} value={p.user_id}>{p.display_name}</option>)}</select></label><button className="button button-secondary" type="submit">Speichern</button></form></details>
      <form action={deleteEntry}><input type="hidden" name="id" value={entry.id}/><button className="icon-button" aria-label="Eintrag löschen"><Trash2 size={16}/></button></form>
    </div>)}</div>
    {!visible.length&&<div className="empty-state compact"><p>Keine passenden Einträge gefunden.</p></div>}
    <p className="list-hint">Einträge lassen sich mit Maus, Touch oder Stift am Griff verschieben. Alternativ stehen die Pfeile bereit; Änderungen werden synchron gespeichert.</p>
  </section>;
}
