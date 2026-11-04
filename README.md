# intelylist

**Gemeinsam organisieren. Einfach erledigen.**

intelylist ist eine private, kollaborative Web-App für Familie und Freundeskreis. Gemeinsame Bereiche bündeln Aufgabenlisten und Einkaufslisten – mit Anmeldung, Rollen und laufender Synchronisierung.

## Aktueller Entwicklungsstand

Der erste App-Unterbau liegt im Branch `feat/initial-app`:
- Dashboard mit Auswahl gemeinsamer Bereiche
- Registrierung, Anmeldung, Abmeldung und E-Mail-Bestätigungs-Callback über Supabase Auth
- Bereiche und Aufgaben-/Einkaufslisten anlegen
- Einträge mit Notizen, Zuweisung, Fälligkeit, Priorität und Einkaufsfeldern erstellen, bearbeiten, abhaken und löschen
- Supabase Realtime-Aktualisierung für Listeneinträge, PWA-Manifest und datensparsamer Offline-Fallback ohne Zwischenspeicherung privater Daten
- Datenbankmigration für Workspace-Mandantentrennung und restriktivere Mitgliederrechte
- Vitest-Validierungstests und GitHub-Actions-Grundlage

**Noch nicht produktionsreif:** Einladungsversand per E-Mail (aktuell wird ein Link zum manuellen Teilen erzeugt), vollständige RLS-Negativtests, Barrierefreiheits- und Browser-Tests, Live-Konfiguration und Deployment sind noch offen. Die Datenbankmigrationen wurden noch nicht auf einem echten Supabase-Projekt ausgeführt.

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

## Deployment (noch nicht eingerichtet)

1. Supabase-Projekt in Frankfurt (EU) anlegen und Migrationen ausführen.
2. Auth-URLs und E-Mail-Bestätigung konfigurieren.
3. Vercel-Projekt mit diesem GitHub-Repository verbinden.
4. ``NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` und `NEXT_PUBLIC_SITE_URL` als Vercel-Umgebungsvariablen setzen.
5. Domain, Redirect-URLs, Datenschutzinformationen, Backups und Wiederherstellung testen.

Geheimnisse dürfen niemals in Git eingecheckt werden. Ein Supabase Service-Role-/Secret-Key gehört niemals in den Browser und wird in der aktuellen App noch nicht benötigt.
