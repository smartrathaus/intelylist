# Agent instructions for intelylist

## Project and architecture
- intelylist is a private collaborative Next.js App Router application for shared workspaces, task lists and shopping lists.
- Stack: Next.js 16, React 19, TypeScript, Supabase Auth/Postgres/RLS/Realtime, Zod, Vitest and Vercel.
- Keep user-facing language German unless the surrounding UI is already English.
- Supabase migrations live in `supabase/migrations/`; database integration tests live in `supabase/tests/`; app unit tests use Vitest.
- Use the package scripts in `package.json`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; database tests use `npx supabase test db`.

## Mandatory workflow
1. Read this file and the relevant local code/migrations/tests before editing.
2. Work only on the assigned feature branch. For the current project workflow, use `feat/initial-app` and keep PR #1 targeted at `main`.
3. Never push directly to `main`, merge a PR, change production configuration, or deploy to production without explicit user approval.
4. Before changing database schema or RLS, inspect existing policies, grants, helper functions, triggers, and migration history. Add a new migration; do not rewrite migrations already applied to the shared Supabase project.
5. Keep changes small and reviewable. Do not claim tests passed unless they were actually run; distinguish local CI tests from tests against the connected Supabase project.
6. After changes, run the relevant lint, typecheck, unit, database, and build checks. If a check cannot be run, state exactly why.
7. Review the diff for accidental secrets, environment files, generated artifacts, and unrelated changes.

## Security rules
- RLS is the authoritative tenant boundary. UI checks and Server Action checks do not replace RLS.
- Treat Supabase anonymous users as role `authenticated`; explicitly distinguish anonymous users from permanent users where authorization requires it (for example, `auth.jwt() ->> 'is_anonymous'` or the trusted auth user record). Do not assume `TO authenticated` excludes anonymous users.
- Every exposed table containing user or workspace data must have RLS enabled and least-privilege grants.
- Keep SECURITY DEFINER helpers in the non-exposed `private` schema, set an empty or tightly controlled search_path, fully qualify object names, and explicitly revoke/grant EXECUTE.
- Validate ownership and tenant boundaries in database policies and server-side functions. Test both permitted and forbidden cross-workspace access.
- Guest QR access must be scoped to exactly one invited list, time-limited and revocable. Guests must not read workspace/member data or assign entries to workspace users.
- Never expose service-role/secret keys to client code or commit secrets. Never log raw invite tokens, passwords, session cookies or access tokens.
- Avoid generic error messages that hide the diagnostic category during development; keep user-visible messages safe and non-sensitive.

## Change completion report
Report: changed files, migration impact, tests actually run and results, unresolved risks, deployment/PR status. A passing build is not proof of authorization correctness.
