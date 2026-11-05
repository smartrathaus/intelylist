"use client";
import { useState, useTransition } from "react";
import { saveUserPreferences } from "@/lib/advanced-actions";
import type { ThemeSettings } from "@/components/theme-provider";

const themes=[
 {id:"fresh-mint",name:"Fresh Mint",hint:"Frisch und freundlich"},
 {id:"ocean-blue",name:"Ocean Blue",hint:"Klar und ruhig"},
 {id:"soft-lavender",name:"Soft Lavender",hint:"Sanft und modern"},
 {id:"warm-sand",name:"Warm Sand",hint:"Natürlich und warm"},
 {id:"graphite",name:"Graphite",hint:"Reduziert und kontrastreich"}
];
export function ThemeSettingsPanel({initial}:{initial:ThemeSettings}){
 const [value,setValue]=useState<ThemeSettings>(initial);
 const [busy,startTransition]=useTransition();
 const [message,setMessage]=useState("");
 function update(next:ThemeSettings){
  setValue(next);
  window.dispatchEvent(new CustomEvent("intelylist-theme-change",{detail:next}));
  startTransition(async()=>{const result=await saveUserPreferences(next);setMessage(result.ok?"Darstellung gespeichert.":result.message??"Speichern fehlgeschlagen.");});
 }
 return <section className="account-panel theme-settings">
  <h2>Darstellung personalisieren</h2><p className="muted">Deine Auswahl wird mit deinem Konto gespeichert und auf deinen Geräten verwendet.</p>
  <div className="theme-grid">{themes.map(theme=><button type="button" key={theme.id} className={`theme-choice ${value.theme===theme.id?"selected":""}`} onClick={()=>update({...value,theme:theme.id})} aria-pressed={value.theme===theme.id}><span className={`theme-swatch ${theme.id}`}/><strong>{theme.name}</strong><small>{theme.hint}</small></button>)}</div>
  <label className="theme-field">Farbmodus<select value={value.colorMode} onChange={e=>update({...value,colorMode:e.target.value})}><option value="system">Wie das Gerät</option><option value="light">Hell</option><option value="dark">Dunkel</option></select></label>
  <label className="theme-field">Eigene Akzentfarbe <span className="accent-input"><input type="color" value={value.accentColor??"#299f98"} onChange={e=>update({...value,theme:"custom",accentColor:e.target.value})}/><code>{value.accentColor??"#299f98"}</code></span></label>
  <button type="button" className="button button-ghost button-small" disabled={busy} onClick={()=>update({theme:"fresh-mint",colorMode:"system",accentColor:null})}>Auf Standard zurücksetzen</button>
  {message&&<p className="notice notice-success" role="status">{message}</p>}
 </section>;
}
