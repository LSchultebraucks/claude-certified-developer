---
skill: 3.4
title: Plan Mode vs Direct Execution
summary: Plan mode for large, multi-file, architectural or ambiguous work; direct execution for small, clear changes; the Explore subagent for discovery; and combining planning with execution.
sources: Claude Code: Permission modes | https://code.claude.com/docs/en/permission-modes; Common workflows | https://code.claude.com/docs/en/common-workflows; Claude Code subagents | https://code.claude.com/docs/en/sub-agents; Claude Code best practices | https://www.anthropic.com/engineering/claude-code-best-practices
---

## What you need to know

In **plan mode** (Shift+Tab to cycle modes, or `--permission-mode plan`) Claude explores read-only and proposes a plan **without editing files**. You review, adjust, then let it execute. **Direct execution** skips the separate planning step.

:::key Decision rule
| Choose **plan mode** when… | Choose **direct execution** when… |
|---|---|
| The change spans **many files** or services | The change is small and **well-scoped** |
| There are **architectural decisions** or several valid approaches | The fix is clear (e.g. a stack trace points to one line) |
| Requirements are **ambiguous** | Requirements are precise |
| Mistakes are **expensive** to undo | A wrong attempt is cheap to revert |
| You need to understand an **unfamiliar** area first | You know the code |
:::

Examples:
- Migrate a monolith's logging library across 45 files → **plan**.
- Restructure services into a new module layout → **plan**.
- Add a null check where the stack trace points → **direct**.
- Rename a variable in one function → **direct**.

## The Explore subagent

Discovery in a big codebase produces a lot of output: file listings, search hits, file contents. Doing it in the main session fills the context and degrades later work (5.4). The built-in **Explore subagent** runs that discovery in an **isolated context** (read-only tools) and returns a **summary**. Use it in plan mode and whenever you'd otherwise "look around" at length.

## Combining the two

The typical high-quality flow is **explore → plan → implement → verify**:

1. Plan mode: explore (often via Explore), propose an approach, list affected files and risks.
2. Review and refine the plan (ask for alternatives if needed).
3. Switch to execution and implement step by step.
4. Verify with tests; commit.

Planning is not a separate tool you trade off against execution — it's a **first phase** for work that warrants it.

:::scenario S2 — "add a feature" vs "change our auth architecture"
Adding a field to a form and its validation: direct execution. Replacing session cookies with token-based auth across API, web and mobile clients: plan mode first, so the approach and touched components are agreed before edits start.
:::

## Exam traps

:::trap Plan mode for every change
Overhead for trivial edits. Match the mode to complexity and risk.
:::

:::trap Direct execution on a sweeping, ambiguous refactor
Claude commits to an approach before alternatives were weighed; rework follows.
:::

:::trap Doing verbose discovery in the main context
Use the Explore subagent so only the summary lands in the session.
:::

## Practice questions

{{quiz:a3-plan-01}}

{{quiz:a3-plan-02}}

## Build exercise

:::exercise Plan vs direct on the same repo
1. Pick a cross-cutting change (swap a logging library). Run it in plan mode; review the plan; then execute.
2. Pick a one-line bug with a stack trace; fix it directly.
3. Repeat the cross-cutting change directly without a plan; compare rework and review effort.
4. Ask "how is authentication wired?" with and without the Explore subagent and compare context usage (`/context`).
:::
