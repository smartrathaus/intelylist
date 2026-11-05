# intelylist

**Gemeinsam organisieren. Einfach erledigen.**

intelylist ist eine kollaborative Organisationsplattform für Haushalte, Familien, Wohngemeinschaften und kleine Teams. Sie verbindet Einkaufslisten mit allgemeinen Aufgaben- und To-do-Listen.

## Kernfunktionen
- Gemeinsame Workspaces mit mehreren Mitgliedern und Rollen
- Allgemeine Aufgaben mit Zuständigkeit, Priorität und Fälligkeit
- Einkaufslisten mit Mengen und Einheiten
- Gemeinsame Listen und Echtzeit-Synchronisierung
- Responsive Web-App und installierbare PWA

## Technologie
TypeScript, Next.js, React, Tailwind CSS, Supabase Auth/PostgreSQL/Realtime, Row Level Security, Drizzle ORM, Vitest und Playwright.

## Status
Projekt- und Datenbankgrundlage werden schrittweise aufgebaut. Supabase und Vercel sind noch nicht als produktive Dienste verbunden.

## Dokumentation
- [Produktumfang](docs/product-scope.md)
- [Architektur und Sicherheit](docs/architecture.md)
- [Bewertung kostenloser Tarife](docs/free-tier-assessment.md)
- [Agentenorganisation und Arbeitsabläufe](docs/agent-workflows/README.md)

## Lokale Entwicklung
Voraussetzungen: Node.js LTS und npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Geheimnisse und echte Zugangsdaten dürfen niemals in Git eingecheckt werden. Der Supabase Service-Role-Key darf ausschließlich serverseitig verwendet werden.
