# Architektur und Sicherheitsmodell

## Architektur
- Next.js/React: responsive Web-App und serverseitige Routen.
- Supabase Auth: Identitäten und Sitzungen.
- PostgreSQL: Workspaces, Mitgliedschaften, Listen und Einträge.
- Supabase Realtime: Verteilung freigegebener Änderungen.
- Row Level Security (RLS): verbindliche Mandantentrennung direkt in der Datenbank.
- Drizzle ORM: typisierte Datenzugriffe und Migrationstooling.

## Mandantenmodell
Ein Nutzer sieht Daten nur, wenn er aktives Mitglied des zugehörigen Workspaces ist. Listen und Einträge erben die Berechtigung über den Workspace. Zugewiesene Nutzer müssen Mitglieder desselben Workspaces sein.

## Sicherheitsgrundsätze
1. RLS für jede Tabelle mit Nutzer- oder Workspace-Daten.
2. Autorisierung nicht nur in der Oberfläche, sondern server- und datenbankseitig.
3. Supabase Service-Role-Key ausschließlich in vertrauenswürdiger Serverumgebung.
4. Einladungs- und Rollenänderungen serverseitig validieren.
5. Eingaben validieren und keine fremden Datensätze durch Fehlermeldungen offenlegen.
6. Tests für Zugriffe zwischen getrennten Workspaces.

## EU-Hosting
Das Supabase-Projekt soll in Frankfurt (EU Central) angelegt werden. Vercel-Funktionsregion soll – soweit im Tarif verfügbar – ebenfalls auf Frankfurt ausgerichtet werden. Hostingregionen, Datenübermittlungen und Auftragsverarbeitungsverträge sind vor produktivem Einsatz zu prüfen.

## Betrieb
Free-Tarife bieten keine vollständige Produktionsgarantie. Vor Livegang sind Backups, Wiederherstellung, Monitoring, Datenschutzinformationen, Löschkonzept und Sicherheitsprüfung festzulegen.