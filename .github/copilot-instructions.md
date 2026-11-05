# GitHub Copilot instructions for intelylist

Follow the repository-wide rules in `/AGENTS.md` and the applicable role profile in `.agents/roles/`.

Project context:
- intelylist is a collaborative shopping-list and task-management app for households, families, shared flats and small teams.
- Read `README.md`, `docs/product-scope.md` and `docs/architecture.md` before substantial work.
- Current documented stack: TypeScript, Next.js, React, Tailwind CSS, Supabase Auth/PostgreSQL/Realtime, RLS, Drizzle ORM, Vitest and Playwright.

Engineering requirements:
- Preserve workspace-level tenant isolation and enforce authorization server-side and with PostgreSQL RLS.
- Never expose Supabase service-role credentials or other secrets to the browser or Git.
- Follow existing patterns; avoid unnecessary dependencies and unrelated refactors.
- Add tests for changed behavior and report checks actually executed.
- Use feature branches and pull requests; do not commit directly to main.
- Ask for human approval before production deployment, destructive data operations, security/permission changes or paid-service adoption.
