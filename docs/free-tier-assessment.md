# Kostenlose Tarife – technische und betriebliche Bewertung

Stand der Recherche: 4. November 2026. Anbieterlimits und Vertragsbedingungen können sich ändern.

## Ergebnis
Eine funktionsfähige erste Version von intelylist kann technisch mit Supabase Free und Vercel Hobby entwickelt und betrieben werden, sofern die Nutzung privat/nicht kommerziell bleibt und die Kontingente eingehalten werden.

Die Kombination ist jedoch keine uneingeschränkt belastbare kostenlose Grundlage für einen kommerziellen oder geschäftskritischen Dienst mit Verfügbarkeits- und Backup-Anforderungen.

## Supabase Free
Die offizielle Preisseite nennt derzeit unter anderem:
- 2 aktive Free-Projekte je berechtigter Organisation
- 500 MB Datenbank je Projekt
- 50.000 monatlich aktive Nutzer
- 5 GB Egress und 5 GB cached egress
- 1 GB Dateispeicher
- 500.000 Edge-Function-Aufrufe
- 2 Millionen Realtime-Nachrichten
- 200 gleichzeitige Realtime-Verbindungen

Einschränkungen:
- Projekte können nach einer Woche Inaktivität pausiert werden.
- Automatische Backups sind im Free-Tarif nicht enthalten.
- Kein zugesichertes SLA.
- Begrenzter Datenbank- und Netzwerkumfang.

Für eine kleine private Gruppe ist das Kontingent voraussichtlich ausreichend. Die tatsächliche Belastung hängt von Nutzerzahl, Aktivität, Realtime-Abonnements und Datenübertragung ab.

## Vercel Hobby
Hobby bietet kostenlose Bereitstellung, Git-Integration, HTTPS, Vorschau-Deployments und ein monatliches Ressourcenbudget. Die konkreten Limits sind in der Vercel-Dokumentation aufgeführt.

Wesentliche Einschränkung: Hobby ist laut Vercel ausschließlich für persönliche, nicht kommerzielle Nutzung vorgesehen. Für kommerzielle Nutzung ist Pro erforderlich. Das gilt unabhängig davon, ob die App selbst kostenlos angeboten wird, wenn der Einsatz unter Vercels Definition kommerzieller Nutzung fällt.

## Empfehlung
- Entwicklung, Prototyp und private Nutzung: Supabase Free + Vercel Hobby.
- Öffentlicher, nicht kommerzieller Start: nur nach Prüfung der konkreten Nutzung und mit akzeptiertem Pausen-/Backup-Risiko.
- Kommerzieller oder verlässlich produktiver Betrieb: Vercel Pro und Supabase Pro einplanen.
- Keine kostenpflichtigen Zusatzdienste für die erste Version voraussetzen.
- Datenbankregion Frankfurt und passende Vercel-Funktionsregion konfigurieren und vor Livegang verifizieren.

## Quellen
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/kb/faqs/platform/free-postgres-for-side-projects
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/limits/fair-use-guidelines
- https://vercel.com/docs/limits