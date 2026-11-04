import { signIn, signUp } from "@/lib/actions";
import { Layers3, LockKeyhole, Users } from "lucide-react";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <main className="auth-shell">
    <section className="auth-card">
      <div className="brand auth-brand"><span className="brand-mark"><Layers3 size={20}/></span><span>intelylist</span></div>
      <div className="auth-intro"><p className="eyebrow">GEMEINSAM ORGANISIEREN</p><h1>Alles im Blick.<br/>Gemeinsam erledigt.</h1><p className="muted">Deine Bereiche, Aufgaben und Einkaufslisten an einem Ort.</p></div>
      {params.error && <p className="notice notice-error">{params.error}</p>}
      {params.message && <p className="notice notice-success">{params.message}</p>}
      <form action={signIn} className="auth-form"><label>E-Mail-Adresse<input name="email" type="email" autoComplete="email" placeholder="du@beispiel.de" required/></label><label>Passwort<input name="password" type="password" autoComplete="current-password" minLength={8} placeholder="Mindestens 8 Zeichen" required/></label><button className="button button-primary button-full" type="submit">Anmelden</button></form>
      <div className="auth-divider"><span>Neu bei intelylist?</span></div>
      <form action={signUp} className="auth-form"><label>E-Mail-Adresse<input name="email" type="email" autoComplete="email" placeholder="du@beispiel.de" required/></label><label>Passwort festlegen<input name="password" type="password" autoComplete="new-password" minLength={10} placeholder="Mindestens 10 Zeichen" required/></label><button className="button button-secondary button-full" type="submit">Konto erstellen</button></form>
      <div className="auth-foot"><span><LockKeyhole size={14}/> Geschützter Zugang</span><span><Users size={14}/> Für euren privaten Kreis</span></div>
    </section>
  </main>;
}