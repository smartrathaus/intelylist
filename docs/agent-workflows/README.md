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

## Starting the repository agents with GitHub Copilot

This repository includes Copilot custom agent profiles in `.github/agents/*.agent.md`. After the branch containing these files is merged or checked out locally:

### VS Code
1. Open the intelylist repository as your workspace.
2. Open GitHub Copilot Chat and switch to **Agent** mode.
3. Open the agent picker at the bottom of the chat.
4. Select **Intelylist Lead Agent**. If it is not listed, reload the VS Code window and verify the files are on the checked-out branch.
5. Give it the kickoff prompt below. The Lead Agent can use the `agent` tool to delegate to specialist profiles when the runtime supports subagents.

### GitHub Copilot CLI
In the repository directory, start Copilot CLI and select the Lead Agent using `/agent`, or use the CLI's agent selection option supported by your installed version. The custom profile ID is `lead-agent`. Specialist profile IDs are the filenames without `.agent.md`.

### GitHub.com
When the repository custom agents are available to Copilot coding agent on GitHub.com, select the desired profile in the Agents panel or when assigning an issue. Availability depends on the user's Copilot entitlement and current product support.

## Recommended first prompt

```text
Act as the intelylist Lead Agent. Read AGENTS.md, .agents/README.md,
.agents/orchestration.md and .agents/roles/lead-agent.md.
Audit the current repository and report: current architecture, incomplete
work, risks, available checks, and a prioritized plan. Do not modify files
until the audit and plan are presented. After I approve the plan, delegate
independent, bounded tasks to suitable specialist agents where supported.
```

## If subagents are not supported
Open separate agent sessions manually and select the corresponding profile:
- Product Owner / Architect for requirements and design.
- Frontend / Backend / Database for implementation after interfaces are agreed.
- QA / Security for verification.
- Independent Code Reviewer for a separate review.
Use isolated branches or worktrees for concurrent code changes and return all findings to the Lead Agent.

## Human approval gates
Require explicit human approval before production deploys, destructive database changes, changes to auth/RLS semantics, adding paid services, rotating credentials or materially changing product scope.
