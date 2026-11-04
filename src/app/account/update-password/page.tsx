import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "@/lib/actions";

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await searchParams;
  return <main className="auth-shell"><section className="auth-card">
    <div className="brand auth-brand"><span className="brand-mark"><Layers3 size={20}/></span><span>intelylist</span></div>
    <p className="eyebrow">KONTOZUGANG</p><h1 className="invite-title">Neues Passwort</h1>
    <p className="muted">Lege ein neues Passwort mit mindestens zehn Zeichen fest.</p>
    {error && <p className="notice notice-error">{error}</p>}
    <form action={updatePassword} className="auth-form reset-form"><label>Neues Passwort<input name="password" type="password" minLength={10} maxLength={128} autoComplete="new-password" required/></label><label>Passwort wiederholen<input name="confirmation" type="password" minLength={10} maxLength={128} autoComplete="new-password" required/></label><button className="button button-primary button-full">Passwort speichern</button></form>
    <Link href="/" className="subtle-link">Zurück zur App</Link>
  </section></main>;
}
