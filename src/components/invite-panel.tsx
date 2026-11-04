"use client";

import { useActionState, useState } from "react";
import { Copy, Link2, Send } from "lucide-react";
import { createInvitation, type InvitationActionState } from "@/lib/actions";

const initialState: InvitationActionState = {};

export function InvitePanel({ workspaceId, canInviteAdmin }: { workspaceId: string; canInviteAdmin: boolean }) {
  const [state, action, pending] = useActionState(createInvitation, initialState);
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    if (!state.inviteUrl) return;
    await navigator.clipboard.writeText(state.inviteUrl);
    setCopied(true);
  }
  return <section className="create-panel invite-panel">
    <div><div className="create-icon"><Link2 size={19}/></div><h3>Mitglieder einladen</h3><p className="muted">Erstelle einen persönlichen Link, den du privat weitergibst. Er läuft nach sieben Tagen ab.</p></div>
    <form action={action} className="invite-form">
      <input type="hidden" name="workspaceId" value={workspaceId}/>
      <input name="email" type="email" placeholder="E-Mail der eingeladenen Person" aria-label="E-Mail der eingeladenen Person" required/>
      <select name="role" aria-label="Einzuladende Rolle" defaultValue="member">
        <option value="member">Mitglied</option>
        {canInviteAdmin && <option value="admin">Admin</option>}
      </select>
      <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Erstelle …" : <>Einladungslink erstellen <Send size={15}/></>}</button>
    </form>
    {state.error && <p className="notice notice-error">{state.error}</p>}
    {state.inviteUrl && <div className="invite-result"><input readOnly value={state.inviteUrl} aria-label="Einladungslink"/><button type="button" className="button button-secondary" onClick={copyLink}><Copy size={15}/>{copied ? "Kopiert" : "Link kopieren"}</button><p>Teile diesen Link nur mit der eingeladenen Person. Die E-Mail-Adresse muss beim Annehmen bestätigt sein.</p></div>}
  </section>;
}
