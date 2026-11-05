# Agent workflows

## Recommended operating model
Use one Lead Agent as coordinator and invoke specialist roles only when needed. Start with a repository audit and plan; do not begin by launching every role at once.

### Sequential start
1. Lead Agent: audit repository and current branch; create a plan.
2. Product Owner + Architect: agree user outcome, acceptance criteria and technical design.
3. UX/UI, Database, Security: define interaction, schema and threat constraints as applicable.
4. Frontend and Backend: implement independent work packages in parallel after contracts are agreed.
5. QA and Security: verify behavior and controls.
6. Independent Reviewer: review the PR diff.
7. DevOps: prepare preview/release after human approval.
8. Documentation: finalize user/developer docs.

### When to work in parallel
Parallelize only when file ownership and interfaces are explicit. Good examples: UI work in one branch and isolated server service in another; docs alongside implementation; independent test planning. Do not parallelize shared migrations, shared configuration or tightly coupled refactors.

## How to start manually
In a coding-agent product:
- Start a session with the Lead Agent profile.
- Provide the goal and ask for audit/plan first.
- If subagents are supported, ask the Lead Agent to delegate bounded tasks using the role files.
- If subagents are not supported, open separate sessions and paste the relevant role file plus task brief. Use isolated branches/worktrees.
- Bring all results back to the Lead Agent for integration and review.

Example kickoff:
```text
Act as the intelylist Lead Agent. Read AGENTS.md, .agents/README.md,
.agents/orchestration.md and .agents/roles/lead-agent.md.
Audit the current repository and report: current architecture, incomplete
work, risks, available checks, and a prioritized plan. Do not modify files
until the audit and plan are presented.
```

## Human approval gates
Require explicit human approval before production deploys, destructive database changes, changes to auth/RLS semantics, adding paid services, rotating credentials or materially changing product scope.
