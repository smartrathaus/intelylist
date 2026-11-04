# Produktumfang

## Leitidee
intelylist ist eine gemeinsame Plattform für alltägliche Organisation. Einkäufe und allgemeine Aufgaben nutzen dieselbe Zusammenarbeitsschicht: Nutzer arbeiten in gemeinsamen Bereichen, sehen Änderungen zeitnah und verteilen Verantwortlichkeiten.

## Zielgruppe
Private Nutzung im kleinen Kreis: Familie, Freunde, Paare und Wohngemeinschaften. Ein öffentliches kommerzielles SaaS ist nicht geplant.

## Bereiche und Rollen
Ein Bereich (Workspace) ist ein gemeinsamer Raum, beispielsweise „Zuhause“, „Urlaub“ oder „WG“. Ein Nutzer kann mehreren Bereichen angehören. Daten sind ausschließlich für Mitglieder sichtbar.

- **Owner:** verwaltet Bereich und Mitglieder; es gibt genau einen initialen Owner.
- **Admin:** unterstützt die Verwaltung im Rahmen klar begrenzter Rechte.
- **Member:** erstellt und bearbeitet Listen und Einträge.

Rollenwechsel und Einladungen müssen serverseitig und transaktional umgesetzt werden; die Datenbankgrundlage ist hierfür noch nicht vollständig.

## Module
- **Aufgaben:** Titel, Beschreibung, Status, Priorität, Zuständigkeit und Fälligkeit.
- **Einkauf:** Artikel, Menge, Einheit, Kategorie und Erledigt-Status.
- **Gemischte Listen:** Aufgaben und Einkaufspositionen können gemeinsam geführt werden.

## Umsetzungsstand
### Angelegt
Dashboard/Bereichsauswahl, Auth-Grundablauf, Bereiche und Listen anlegen, Listeneinträge hinzufügen/abhaken/löschen, Realtime-Grundintegration und initiale RLS-Migrationen.

### Noch umzusetzen für Version 1
Einladungen samt sicherer Annahme, Mitgliederverwaltung, Passwort-Reset, Bearbeiten aller Eintragsfelder, Zuweisungen, Fälligkeiten, Kategorien, Mengen/Einheiten im Formular, leere Zustände/Fehlermeldungen vervollständigen, PWA-Installationsdetails, Browser- und Barrierefreiheitstests.

### Nicht in Version 1
Native iOS-/Android-Apps, komplexes Enterprise-Projektmanagement, kostenpflichtige Produktdatenbanken und KI-Dienste.

## UX-Leitlinien
Premium, minimalistisch, ruhig und übersichtlich; mobile-first, barrierebewusst und mit wenigen Schritten für häufige Aktionen.
