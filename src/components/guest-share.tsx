"use client";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createListGuestInvite } from "@/lib/advanced-actions";
export function GuestShare({listId}:{listId:string}){
 const [url,setUrl]=useState("");const [expires,setExpires]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function create(){setBusy(true);setMessage("");const result=await createListGuestInvite({listId,hours:24,maxUses:10});setBusy(false);if(!result.ok||!result.url){setMessage(result.message??"Freigabe fehlgeschlagen.");return;}setUrl(result.url);setExpires(new Date(result.expiresAt!).toLocaleString("de-DE"));}
 return <details className="guest-share"><summary>Per QR-Code zur Mitarbeit einladen</summary><p>Gäste können 24 Stunden ohne eigenes Konto an dieser Liste mitarbeiten. Der Link ist für bis zu 10 Geräte nutzbar.</p><button className="button button-secondary button-small" type="button" disabled={busy} onClick={()=>void create()}>{busy?"Erstelle…":"QR-Code erstellen"}</button>{url&&<div className="guest-qr"><QRCodeSVG value={url} size={210} level="H" includeMargin/><p>Gültig bis {expires}</p><button type="button" className="button button-ghost button-small" onClick={()=>void navigator.clipboard.writeText(url)}>Gastlink kopieren</button><button type="button" className="button button-ghost button-small" onClick={()=>{if(navigator.share)void navigator.share({title:"intelylist – Liste gemeinsam bearbeiten",url});else void navigator.clipboard.writeText(url);}}>Teilen</button></div>}{message&&<p className="notice notice-error">{message}</p>}</details>;
}
