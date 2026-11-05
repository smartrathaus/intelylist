# intelylist agent team

This directory contains portable role instructions for human-operated or platform-hosted AI coding agents. These Markdown files define responsibilities and handoffs; **they do not create or start autonomous processes by themselves**.

## How to use
1. Start a Lead Agent in your chosen coding-agent environment and ask it to read `AGENTS.md`, `.agents/orchestration.md` and its role profile.
2. Give it one bounded goal and ask for a repository audit and task plan first.
3. Let it delegate to specialist agents only if the platform supports subagents/multi-agent orchestration. Otherwise start separate agent sessions manually with the relevant role file and task brief.
4. Use separate branches/worktrees for concurrent coding tasks. Avoid concurrent edits to the same files.
5. Require pull requests, CI evidence and independent review before merging.

## Role catalogue
- `roles/lead-agent.md` — coordination and delivery
- `roles/product-owner.md` — requirements and prioritization
- `roles/software-architect.md` — architecture and technical decisions
- `roles/frontend-developer.md` — Next.js/React UI
- `roles/backend-developer.md` — server logic and APIs
- `roles/database-engineer.md` — PostgreSQL, Supabase, RLS and migrations
- `roles/ux-ui-designer.md` — interaction and visual design
- `roles/qa-test-engineer.md` — test strategy and automation
- `roles/security-privacy-engineer.md` — threat modelling and privacy
- `roles/devops-release-engineer.md` — CI/CD and deployment
- `roles/independent-code-reviewer.md` — independent code review
- `roles/documentation-knowledge-engineer.md` — project documentation
- `roles/product-innovation-performance.md` — improvement discovery and performance

## Platform notes
- GitHub Copilot coding agent, Codex and other agent products have different invocation and delegation capabilities. Configure platform-specific agents separately; do not assume these files automatically register agents in every platform.
- GitHub Actions workflows are automation, not autonomous coding agents. Keep credentials least-privileged and require human approval for production actions.
