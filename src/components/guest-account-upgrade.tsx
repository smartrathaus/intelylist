"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function GuestAccountUpgrade({ stage = "email" }: { stage?: "email" | "password" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/guest/account")}`;
    const { error } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() }, { emailRedirectTo: redirectTo });
    setBusy(false);
    if (error) {
      setMessage(error.message.toLowerCase().includes("identity") || error.message.toLowerCase().includes("manual")
        ? "Die Kontoverknüpfung ist in Supabase noch nicht freigeschaltet. Bitte versuche es später erneut."
        : "Die E-Mail-Adresse konnte nicht verknüpft werden. Prüfe die Adresse oder verwende eine andere.");
      return;
    }
    setMessage("Wir haben dir eine Bestätigungs-E-Mail gesendet. Öffne den Link auf diesem Gerät. Deine Liste und dein Gastzugang bleiben bis dahin erhalten.");
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 10) {
      setMessage("Das Passwort muss mindestens 10 Zeichen lang sein.");
      return;
    }
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage("Das Passwort konnte nicht gespeichert werden. Bitte melde dich erneut an und versuche es noch einmal.");
      return;
    }
    setMessage("Dein Konto ist jetzt dauerhaft nutzbar. Deine gemeinsame Liste bleibt mit deinem Konto verbunden.");
    router.refresh();
  }

  if (stage === "password") {
    return <section className="guest-account-prompt">
      <strong>Passwort festlegen</strong>
      <p>Deine E-Mail-Adresse wurde bestätigt. Lege jetzt ein Passwort fest, damit du dich später wieder anmelden kannst.</p>
      <form className="auth-form" onSubmit={(event) => void submitPassword(event)}>
        <label>Neues Passwort<input type="password" autoComplete="new-password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required/></label>
        <button className="button button-secondary button-small" type="submit" disabled={busy}>{busy ? "Speichere…" : "Konto dauerhaft sichern"}</button>
      </form>
      {message && <p className="muted" role="status">{message}</p>}
    </section>;
  }

  return <section className="guest-account-prompt">
    <strong>Gastzugang dauerhaft sichern</strong>
    <p>Verknüpfe eine E-Mail-Adresse mit deinem Gastkonto. Deine bestehende Benutzer-ID und deine Listenberechtigung bleiben erhalten – du musst dich nicht neu registrieren.</p>
    <form className="auth-form" onSubmit={(event) => void submitEmail(event)}>
      <label>E-Mail-Adresse<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="du@beispiel.de" required/></label>
      <button className="button button-secondary button-small" type="submit" disabled={busy}>{busy ? "Sende…" : "E-Mail verknüpfen"}</button>
    </form>
    {message && <p className="muted" role="status">{message}</p>}
  </section>;
}
