# intelylist

**Gemeinsam organisieren. Einfach erledigen.**

intelylist ist eine private, kollaborative Web-App für Familie und Freundeskreis. Gemeinsame Bereiche bündeln Aufgabenlisten und Einkaufslisten – mit Anmeldung, Rollen und laufender Synchronisierung.

## Aktueller Entwicklungsstand

Der aktuelle Entwicklungsstand liegt im Branch `feat/initial-app` (Draft-PR #1):
- Dashboard mit Auswahl gemeinsamer Bereiche
- Registrierung, Anmeldung, Abmeldung und E-Mail-Bestätigungs-Callback über Supabase Auth
- Bereiche und Aufgaben-/Einkaufslisten anlegen
- Einträge mit Notizen, Zuweisung, Fälligkeit, Priorität und Einkaufsfeldern erstellen, bearbeiten, abhaken und löschen
- Personalisierbare Farbgestaltung mit fünf Designpaletten, Hell-/Dunkelmodus und eigener Akzentfarbe
- Touch-/Maus-/Stift-Drag-and-Drop per Pointer Events, manuelle Pfeilsteuerung und Mehrfachbearbeitung
- Automatische Warengruppen mit Regalgruppen, Favoriten und zuletzt verwendeten Artikeln
- Listen-Vorlagen, wiederkehrende Aufgaben, persönliche Erinnerungen, Browsermeldungen bei geöffneter App
- Druckansicht, PDF-Ausgabe über den Browser-Druckdialog und Teilen über die native Teilen-Funktion
- Supabase Realtime-Aktualisierung für Listeneinträge, PWA-Manifest und datensparsamer Offline-Fallback ohne Zwischenspeicherung privater Daten
- Datenbankmigration für Workspace-Mandantentrennung und restriktivere Mitgliederrechte, sichere Austritts-/Löschfunktionen und JSON-Export
- Vitest-Validierungstests und GitHub-Actions-Grundlage

**Noch nicht produktionsreif:** Benachrichtigungen werden aktuell innerhalb der geöffneten App abgefragt; Hintergrund-Push und E-Mail-Versand benötigen einen zusätzlichen Push-/Mail-Dienst und Scheduler. PDF wird über den Browser-Druckdialog erzeugt. Vollständige Browser-/Accessibility-Tests, Backup-/Restore-Prüfung und die Freigabe auf einem Produktivsystem stehen aus. Die Migrationen 0012 und 0013 wurden nur auf dem verbundenen Preview-/Entwicklungsprojekt in Frankfurt angewendet.

## Technologie

- Next.js App Router, React und TypeScript
- Supabase Auth, PostgreSQL, Row Level Security und Realtime
- Zod für Eingabevalidierung
- Vitest für Unit-Tests
- GitHub Actions für Qualitätsprüfungen
- Vercel als vorgesehenes Web-Hosting

## Lokale Entwicklung

Voraussetzungen: Node.js 22+, npm und Docker (für die lokale Supabase-Datenbank).

```bash
npm install
cp .env.example .env.local
npx supabase start
npx supabase db reset
npm run dev
```

Die lokalen Supabase-Zugangsdaten zeigt `supabase status`. Trage die lokale API-URL und den anon/publishable Key in `.env.local` ein. Für E-Mail-Bestätigungen muss die lokale Redirect-URL `http://localhost:3000/auth/callback` erlaubt sein.

Qualitätsprüfungen:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx supabase test db
```

## Entwicklungsdeployment (Preview)\n\nDas Vercel-Preview-Deployment wird aus `feat/initial-app` gebaut. Es ist durch Vercel-Projektschutz geschützt. Die Supabase-Datenbank für Entwicklung/Preview liegt in Frankfurt (EU Central). Es wurde keine Produktivfreigabe erteilt.\n\n## Deployment auf Produktion (noch nicht freigegeben)

1. Separates Supabase-Produktivprojekt in Frankfurt (EU) bereitstellen und Migrationen nach Review ausführen.
2. Auth-URLs und E-Mail-Bestätigung konfigurieren.
3. Vercel-Projekt mit diesem GitHub-Repository verbinden.
4. ``NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` und `SUPABASE_SERVICE_ROLE_KEY` (ausschließlich serverseitig) als Vercel-Umgebungsvariablen setzen.
5. Domain, Redirect-URLs, Datenschutzinformationen, Backups und Wiederherstellung testen.

Geheimnisse dürfen niemals in Git eingecheckt werden. Ein Supabase Service-Role-/Secret-Key gehört niemals in den Browser.
