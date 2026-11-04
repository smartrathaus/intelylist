import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions";
import { Layers3 } from "lucide-react";

export default async function PasswordResetRequest({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <main className="auth-shell"><section className="auth-card">
    <div className="brand auth-brand"><span className="brand-mark"><Layers3 size={20}/></span><span>intelylist</span></div>
    <p className="eyebrow">KONTOZUGANG</p><h1 className="invite-title">Passwort zurücksetzen</h1>
    <p className="muted">Wir senden dir einen Link, mit dem du ein neues Passwort festlegen kannst.</p>
    {params.error && <p className="notice notice-error">{params.error}</p>}
    {params.message && <p className="notice notice-success">{params.message}</p>}
    <form action={requestPasswordReset} className="auth-form reset-form"><label>E-Mail-Adresse<input name="email" type="email" autoComplete="email" required/></label><button className="button button-primary button-full">Link anfordern</button></form>
    <Link href="/login" className="subtle-link">Zurück zur Anmeldung</Link>
  </section></main>;
}
