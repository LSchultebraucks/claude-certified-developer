---
skill: 3.2
title: Custom Slash Commands & Skills
summary: Project versus personal commands and skills, SKILL.md frontmatter (context fork, allowed-tools, argument-hint), and when a workflow belongs in a skill rather than CLAUDE.md.
sources: Claude Code: Skills | https://code.claude.com/docs/en/skills; Claude Code: Slash commands | https://code.claude.com/docs/en/commands; Equipping agents for the real world with Agent Skills — Anthropic | https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills; Agent Skills overview | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
---

## What you need to know

Custom **slash commands** and **skills** package reusable workflows. Commands are Markdown prompt files invoked as `/name`; skills are folders with a `SKILL.md` (plus optional scripts and resources) that can be invoked as `/name` **or** loaded automatically when relevant. Current Claude Code treats commands as a simple form of skill; both keep working.

| Scope | Commands | Skills | Shared? |
|---|---|---|---|
| **Project** | `.claude/commands/review.md` | `.claude/skills/review/SKILL.md` | Yes — version-controlled |
| **Personal** | `~/.claude/commands/` | `~/.claude/skills/` | No |

:::key Team availability
A `/review` command every developer should have on clone or pull → **`.claude/commands/`** (or `.claude/skills/`) in the repository. Personal variants go in `~/.claude/` — under a **different name** so they don't shadow or confuse the team version.
:::

## SKILL.md frontmatter

```markdown .claude/skills/codebase-audit/SKILL.md
---
name: codebase-audit
description: Audit a directory for dead code and risky patterns. Use when asked to audit or assess code health.
argument-hint: "[directory]"
allowed-tools: Read, Grep, Glob
context: fork
---
Audit $ARGUMENTS. Report a table: file, issue, severity, suggested fix.
Do not modify files.
```

| Field | Effect |
|---|---|
| `description` | When Claude should use the skill (it's matched like a tool description) |
| `argument-hint` | Prompts the user for the right argument when invoking `/codebase-audit` |
| `allowed-tools` | Restricts tools while the skill runs — e.g. read-only audits can't write |
| `context: fork` | Runs the skill in an **isolated sub-agent context**; verbose output stays out of the main conversation and only the result returns |
| `$ARGUMENTS` | Replaced by the text after the command |

`context: fork` is the answer whenever a skill produces **lots of exploratory output** (audits, brainstorming several alternatives) that would otherwise clutter the session.

## Skills vs. CLAUDE.md

| Put it in… | When |
|---|---|
| **CLAUDE.md** | The guidance should apply **always** — conventions, commands, architecture |
| **Skill** | A **task-specific workflow** used on demand — release checklist, migration procedure, review routine |

Putting every procedure into CLAUDE.md bloats every session's context with instructions that are irrelevant most of the time.

## Exam traps

:::trap Personal location for a team command
`~/.claude/commands/` isn't shared. Use `.claude/commands/` in the repo.
:::

:::trap A verbose skill without `context: fork`
It floods the main context. Fork it.
:::

:::trap Read-only workflow without `allowed-tools`
Restrict tools to make "audit, don't modify" deterministic.
:::

## Practice questions

{{quiz:a3-skl-01}}

{{quiz:a3-skl-02}}

## Build exercise

:::exercise Ship a team review skill
1. Create `.claude/skills/review-pr/SKILL.md` with `argument-hint`, `allowed-tools: Read, Grep, Glob, Bash(git diff:*)` and `context: fork`.
2. Commit it; clone the repo elsewhere and confirm `/review-pr` is available.
3. Create a personal variant `~/.claude/skills/review-pr-strict/` with stricter criteria.
4. Run the skill with and without `context: fork` and compare the main session's context usage.
:::
