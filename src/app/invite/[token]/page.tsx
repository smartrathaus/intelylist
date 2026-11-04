import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Layers3, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitation } from "@/lib/actions";

export default async function InvitationPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) redirect("/login?error=Der+Einladungslink+ist+ungueltig.");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <main className="auth-shell"><section className="auth-card">
    <div className="brand auth-brand"><span className="brand-mark"><Layers3 size={20}/></span><span>intelylist</span></div>
    <p className="eyebrow">EINLADUNG</p><h1 className="invite-title">Du wurdest eingeladen.</h1>
    <p className="muted">Mit dieser Einladung erhältst du Zugriff auf einen gemeinsamen Bereich. Der Link ist sieben Tage gültig und an die eingeladene E-Mail-Adresse gebunden.</p>
    {error && <p className="notice notice-error">{error}</p>}
    {user ? <form action={acceptInvitation.bind(null, token)} className="invite-accept"><p className="auth-user">{user.email}</p><button className="button button-primary button-full"><CheckCircle2 size={17}/> Einladung annehmen</button></form> : <div className="invite-accept"><div className="auth-foot"><span><ShieldCheck size={14}/> Anmeldung erforderlich</span></div><Link className="button button-primary button-full" href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>Anmelden oder Konto erstellen</Link></div>}
  </section></main>;
}
