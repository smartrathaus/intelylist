import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Layers3, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { deleteOwnAccount } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: memberships } = await supabase.from("workspace_members").select("workspace_id,role").eq("user_id", user.id);
  const owned = (memberships ?? []).filter((item) => item.role === "owner").length;
  const { error } = await searchParams;
  return <main className="app-shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark"><ArrowLeft size={18}/></span><span>Zur Übersicht</span></Link></header>
    <section className="dashboard account-page">
      <div className="brand"><img className="brand-logo" src="/intelylist-logo.svg" alt="intelylist – Intelligente Aufgabenverwaltung"/></div>
      <p className="eyebrow">KONTO</p><h1>Kontoeinstellungen</h1>
      <p className="muted">Angemeldet als {user.email}</p>
      <section className="account-panel"><h2>Passwort</h2><p className="muted">Du kannst jederzeit einen Link zum Zurücksetzen deines Passworts anfordern.</p><Link className="button button-secondary" href="/login/reset">Passwort zurücksetzen</Link></section>
      <section className="account-danger"><div className="account-danger-title"><ShieldAlert size={19}/><h2>Konto dauerhaft löschen</h2></div>
        <p>Dein Konto und dein Profil werden entfernt. Deine Mitgliedschaften und persönlichen Einladungen werden gelöscht. Von dir erstellte Listen und Einträge bleiben für die anderen Mitglieder erhalten; deine Urheberschaft wird anonymisiert.</p>
        {owned > 0 && <p className="notice notice-error">Du bist noch Inhaber von {owned} Bereich(en). Lösche diese Bereiche zuerst. Eine Übertragung der Inhaberschaft ist derzeit nicht möglich.</p>}
        {error && <p className="notice notice-error">{error}</p>}
        <form action={deleteOwnAccount} className="account-delete-form"><label>Aktuelles Passwort<input name="currentPassword" type="password" autoComplete="current-password" required/></label><label>Zur Bestätigung KONTO LÖSCHEN eingeben<input name="confirmation" autoComplete="off" required/></label><button className="button button-danger" type="submit" disabled={owned > 0}>Konto endgültig löschen</button></form>
      </section>
    </section>
  </main>;
}
