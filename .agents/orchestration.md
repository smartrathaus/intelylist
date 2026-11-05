# Agent orchestration protocol

## Default operating mode
Use a lead-led, staged workflow. Do not launch every role for every task. The Lead Agent selects only the roles needed for the task and remains accountable for integration.

## Workflow
1. **Intake (Lead + Product Owner as needed):** clarify outcome, inspect repository, identify affected users and define acceptance criteria.
2. **Design (Architect + UX/Database/Security as relevant):** agree interfaces, data ownership, permissions, migration approach and test plan before parallel coding.
3. **Implementation:** assign independent work packages to Frontend, Backend, Database and Documentation roles. Each package has one owner, file boundaries, dependencies and acceptance criteria.
4. **Integration (Lead):** review diffs, reconcile contracts, resolve conflicts and run end-to-end checks.
5. **Verification:** QA tests behavior; Security reviews trust boundaries, RLS, secrets and privacy; neither relies solely on the implementer's self-report.
6. **Independent review:** Code Reviewer checks maintainability, correctness, regression risk and test evidence.
7. **Release (DevOps + human approval):** prepare preview/release notes, verify environment and rollback plan. Production deployment and destructive operations require explicit human authorization.
8. **Knowledge capture:** Documentation role updates relevant docs and records durable decisions.

## Parallelism rules
- Parallelize tasks only after interfaces and ownership are agreed.
- Use separate branches or isolated worktrees for concurrent code changes.
- Never let two agents edit the same migration, shared config or component simultaneously.
- Database schema changes precede or are coordinated with dependent API/UI work.
- If a conflict or unexpected architecture change appears, pause affected work and return to Lead.

## Task brief template
- Goal and user value
- Context/files to inspect
- In-scope and out-of-scope
- Acceptance criteria
- Expected interfaces/data contracts
- Allowed file paths / ownership
- Dependencies and sequencing
- Required tests
- Security/privacy considerations
- Branch and PR target
- Handoff format

## Handoff format
Each agent reports:
1. Status: complete / blocked / partial
2. Summary of implementation or findings
3. Files changed
4. Commands/checks run and exact outcomes
5. Known limitations, risks and assumptions
6. Migration/configuration/deployment notes
7. Suggested next owner/action

## Escalation
Escalate to the human owner before: changing product scope, introducing paid services, changing auth/permissions, deleting or transforming user data, adding production secrets, deploying production, weakening tests/security, or making an irreversible infrastructure change.
