import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GuestAccountUpgrade } from "@/components/guest-account-upgrade";

export const dynamic = "force-dynamic";

export default async function GuestAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ready = !user.is_anonymous && !!user.email_confirmed_at;
  return <main className="auth-shell">
    <section className="auth-card">
      <div className="brand auth-brand"><img className="auth-logo" src="/intelylist-logo.svg" alt="intelylist"/></div>
      <p className="eyebrow">KONTO SICHERN</p>
      <h1>{ready ? "Fast geschafft" : "Gastzugang dauerhaft sichern"}</h1>
      {ready
        ? <GuestAccountUpgrade stage="password"/>
        : <p className="muted">Bitte öffne zuerst den Bestätigungslink aus deiner E-Mail auf diesem Gerät. Danach kannst du hier dein Passwort festlegen.</p>}
    </section>
  </main>;
}
