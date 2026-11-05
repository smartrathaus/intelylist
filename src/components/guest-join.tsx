"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { redeemListGuestInvite } from "@/lib/advanced-actions";
export function GuestJoin({token}:{token:string}){
 const router=useRouter();const [message,setMessage]=useState("Gastzugang wird vorbereitet…");
 useEffect(()=>{let active=true;(async()=>{try{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user){const {error}=await supabase.auth.signInAnonymously();if(error)throw new Error("Gastzugang ist noch nicht aktiviert. Bitte den Listeninhaber informieren.");}const result=await redeemListGuestInvite(token);if(!result.ok||!result.listId)throw new Error(result.message??"Einladung ungültig.");if(active)router.replace(`/guest/list/${result.listId}?token=${encodeURIComponent(token)}`);}catch(error){if(active)setMessage(error instanceof Error?error.message:"Gastzugang konnte nicht gestartet werden.");}})();return()=>{active=false;};},[router,token]);
 return <main className="auth-shell"><section className="auth-card"><div className="brand auth-brand"><img className="auth-logo" src="/intelylist-logo.svg" alt="intelylist"/></div><p className="eyebrow">GASTZUGANG</p><h1>Gemeinsam an einer Liste arbeiten</h1><p className="muted" role="status">{message}</p><p className="guest-account-prompt">Du kannst direkt ohne Konto mitarbeiten. Möchtest du dauerhaft mitmachen und deine Listen auch später wiederfinden?</p><Link className="button button-secondary button-full" href={`/login?next=${encodeURIComponent(`/guest/${token}`)}`}>Eigenes Konto erstellen oder anmelden</Link><p className="muted">Dein Gastzugang bleibt auf diese eine Liste beschränkt und läuft nach 24 Stunden ab.</p></section></main>;
}
