# Architektur und Sicherheitsmodell

## Laufzeitarchitektur
- **Vercel / Next.js:** UI, serverseitige Server Actions und Auth-Callback.
- **Supabase Auth:** Identitäten und Cookie-basierte Sitzungen.
- **Supabase PostgreSQL:** Workspaces, Mitgliedschaften, Listen und Einträge.
- **Supabase Realtime:** Broadcast von Änderungen an Listeneinträgen.
- **Row Level Security (RLS):** verbindliche Mandantentrennung in der Datenbank.

Ein separater Backend-Server, Redis oder ein eigener Datenbankhost ist für die private erste Version nicht vorgesehen.

## Mandantenmodell
Ein Nutzer sieht Daten nur, wenn er Mitglied des zugehörigen Workspaces ist. Listen und Einträge erben die Berechtigung über den Workspace. Zugewiesene Nutzer müssen Mitglieder desselben Workspaces sein. Workspace- und Listen-Fremdschlüssel dürfen nach dem Anlegen nicht verschoben werden.

## Sicherheitsmaßnahmen im Repository
1. RLS ist für alle fünf Datentabellen aktiviert.
2. SQL-Berechtigungen werden zusätzlich zu RLS explizit vergeben bzw. entzogen.
3. RLS-Hilfsfunktionen liegen im nicht exponierten Schema `private`; ihr `search_path` ist leer und Tabellen werden qualifiziert angesprochen.
4. Mitglieder können Rollen nicht direkt per UPDATE ändern; direkte DELETE-Rechte auf Mitgliedschaften sind entzogen.
5. Trigger verhindern das Verschieben von Listen/Einträgen zwischen Workspaces und schützen den Owner-Datensatz.
6. Server Actions prüfen Authentifizierung und validieren Eingaben mit Zod.
7. Der Service-Role-/Secret-Key wird ausschließlich im server-only Admin-Client für die eigene Kontolöschung verwendet und niemals an den Browser ausgeliefert.

## Noch notwendige Sicherheitsarbeit vor Livegang
- Rollenwechsel, Mitgliederentfernung und Einladungsannahme sind als eng begrenzte Datenbankfunktionen umgesetzt; deren Verhalten muss noch mit vollständigen RLS- und Integrationstests abgesichert werden.
- Vollständige pgTAP-Tests mit mindestens zwei getrennten Workspaces und erlaubten/verbotenen Zugriffen für Owner, Admin, Member und Nichtmitglieder.
- Einladungs-Token kryptografisch zufällig erzeugen, nur gehasht speichern, kurz befristen und einmalig einlösbar machen.
- Passwort-Reset, E-Mail-Änderungen, Session-Ablauf und Kontolöschung testen.
- Rate-Limits, Fehlerprotokollierung und Monitoring konfigurieren.

## EU-Hosting und Betrieb
Das Supabase-Projekt soll in Frankfurt (EU Central) angelegt werden. Die Vercel-Funktionsregion ist – soweit im Tarif verfügbar – ebenfalls auf Frankfurt auszurichten. Hostingregionen, Datenübermittlungen und Auftragsverarbeitungsverträge sind vor produktivem Einsatz zu prüfen.

Vor Livegang sind Datenschutzinformationen, Löschkonzept, Backup-/Restore-Verfahren, Domain, HTTPS und Auth-Redirects festzulegen. Free-Tarife bieten keine vollständige Produktionsgarantie.
