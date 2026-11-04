# Produktionsreife – offene Prüfliste

Diese Liste trennt bereits implementierte Grundlagen von Nachweisen, die vor einer Freigabe tatsächlich erbracht werden müssen.

## Bereits im Code angelegt
- Supabase Auth mit Registrierung, Login, E-Mail-Bestätigung, Passwort-Reset und Passwortänderung.
- Workspace-Datenmodell mit Owner/Admin/Member.
- RLS auf Workspaces, Mitgliedschaften, Listen, Einträgen, Einladungen und Profilen.
- Private Security-Definer-Hilfsfunktionen mit leerem search_path.
- Unveränderliche Workspace-/Listen-Zuordnungen.
- Gehashte, einmalige Einladungs-Tokens mit Ablauf und E-Mail-Bindung.
- Rollenänderung und Mitgliederentfernung über geprüfte RPC-Funktionen.
- Realtime-Grundintegration und PWA-Offline-Fallback ohne lokale Speicherung privater Listendaten.
- Grundlegende Vitest- und pgTAP-Prüfungen sowie CI-Workflow.

## Vor Produktivfreigabe zwingend
- [ ] GitHub Actions: App-Build, Typecheck, Lint, Unit-Tests und Datenbanktests müssen auf dem aktuellen PR-Stand erfolgreich sein.
- [ ] Alle Migrationen auf einem frischen lokalen Supabase-Projekt und anschließend auf dem produktiven Projekt fehlerfrei ausführen.
- [ ] RLS-Integrationstests mit mindestens zwei Workspaces und getrennten Testkonten: fremde Daten müssen bei SELECT, INSERT, UPDATE und DELETE jeweils gesperrt sein.
- [ ] Rollenmatrix Owner/Admin/Member einschließlich Owner-Löschung, Workspace-Kaskade, Einladung, Ablauf, falscher E-Mail, Doppelannahme und Rollenwechsel testen.
- [ ] Realtime mit zwei realen Browser-Sitzungen und getrennten Nutzern prüfen.
- [ ] Playwright-Browserabläufe und mobile Breakpoints testen; Tastaturbedienung, Screenreader-Beschriftungen und Kontraste prüfen.
- [ ] Fehler- und Rate-Limit-Verhalten von Supabase Auth und Einladungen prüfen.
- [ ] Account-/Workspace-Löschung, Datenexport und Aufbewahrungs-/Löschfristen festlegen und umsetzen.
- [ ] Datenschutzinformation, Impressum soweit erforderlich, Auftragsverarbeitung, EU-Region, Cookie-/Tracking-Verhalten und Zuständigkeiten prüfen.
- [ ] Supabase-Backups und Wiederherstellung praktisch testen; Free-Tarif-Backups nicht voraussetzen.
- [ ] Produktionsdomain, HTTPS, Auth-Redirect-Allowlist, E-Mail-Vorlagen und Absenderdomain konfigurieren.
- [ ] Vercel-Deployment mit korrekten Umgebungsvariablen durchführen; Preview- und Produktionsumgebungen trennen.
- [ ] Monitoring, Fehleralarme, Notfallzugriff und Update-Prozess festlegen.

## Bekannte Produktgrenzen der aktuellen Version
- Einladungen werden als Link erzeugt und manuell geteilt; ein E-Mail-Versand ist nicht integriert.
- Owner-Übertragung ist nicht implementiert.
- Nutzer können einen Bereich nicht selbst verlassen; Owner können andere Nicht-Owner entfernen.
- Es gibt noch keine Oberfläche für Workspace-Löschung, Kontolöschung oder Datenexport.
- Offline werden keine privaten Inhalte gespeichert oder bearbeitet.
- Eine erfolgreiche CI ersetzt keine Live-Sicherheitsprüfung und keinen Datenschutz-/Rechtscheck.
