# Agent instructions for intelylist

These instructions apply to every AI coding agent working in this repository. More specific instructions may be added in nested `AGENTS.md` files; when instructions conflict, follow the most specific applicable instruction unless it violates security or the user's explicit direction.

## Product and stack
- Product: collaborative household, family, shared-flat and small-team organization for shopping lists and general tasks.
- Stack documented by the project: TypeScript, Next.js, React, Tailwind CSS, Supabase Auth/PostgreSQL/Realtime, RLS, Drizzle ORM, Vitest and Playwright.
- Read `README.md`, `docs/product-scope.md`, `docs/architecture.md` and relevant code before proposing or changing architecture.
- Do not assume documentation is proof that a service is currently deployed or configured. Verify repository and environment evidence.

## Operating rules
1. Start each task by inspecting repository status, current branch, relevant files, tests and existing conventions.
2. State the task, assumptions, scope, risks and acceptance criteria before implementation.
3. Work only on a dedicated feature/fix/docs branch. Never commit directly to `main`.
4. Keep changes focused. Avoid unrelated refactors and do not overwrite existing user work.
5. Do not introduce dependencies, services, paid APIs or infrastructure without explaining the need and trade-offs.
6. Never expose, request, log, commit or copy secrets. Never place service-role credentials in client code. Use placeholders in examples.
7. Preserve workspace isolation. Every access to workspace-owned data must be authorized server-side and enforced by database RLS where applicable.
8. Validate inputs at trust boundaries. Treat client input, external data and generated content as untrusted.
9. Add or update tests for changed behavior, including authorization and cross-workspace cases when relevant.
10. Run the relevant lint, typecheck, unit, integration and build checks that are available. Report checks that could not be run; never claim success without evidence.
11. Update documentation when behavior, configuration, data model or operational procedures change.
12. Provide a concise handoff: files changed, design decisions, tests/results, risks, migration/deployment steps and follow-up work.

## Collaboration and handoffs
- The Lead Agent coordinates scope and dependencies; specialist agents own bounded deliverables.
- Parallelize only tasks with distinct file ownership or clearly separated interfaces. Agree contracts before parallel implementation.
- Do not have multiple agents edit the same file or migration concurrently.
- Specialists must report assumptions, changed paths, test evidence and blockers to the Lead Agent.
- The independent reviewer must not approve its own implementation. QA and Security report findings separately.
- Resolve review findings before merge. Human approval is required for production deployment, destructive data changes, secrets/configuration changes and scope-changing product decisions.

## Git and release safety
- Use pull requests into `main`; prefer small, reviewable PRs.
- Do not force-push, delete branches, rewrite history, merge PRs, alter branch protections or deploy to production unless explicitly authorized.
- Database migrations must be additive and reviewed where possible; describe backup, rollback and compatibility implications.
- Never run destructive SQL or migrations against a production project without explicit approval.
- A passing CI run is necessary but not sufficient for security-sensitive changes.

## Definition of done
A task is done only when acceptance criteria are met, relevant checks pass (or limitations are clearly recorded), documentation is updated where needed, no secrets are introduced, and a reviewable handoff/PR is available.
