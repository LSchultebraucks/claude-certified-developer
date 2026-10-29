---
skill: 3.1
title: CLAUDE.md Hierarchy & Organization
summary: User, project and directory-level CLAUDE.md files, what is shared through version control, @import and .claude/rules/ for modular organisation, and /memory for diagnosing what is loaded.
sources: Claude Code: Memory (CLAUDE.md) | https://code.claude.com/docs/en/memory; Claude Code best practices | https://www.anthropic.com/engineering/claude-code-best-practices; Claude Code settings | https://code.claude.com/docs/en/settings; Features overview | https://code.claude.com/docs/en/features-overview
---

## What you need to know

`CLAUDE.md` files are Claude Code's **memory**: standing instructions loaded into context at the start of a session. Several levels combine; more specific levels add to (and can refine) broader ones.

| Level | Location | Shared via git? | Use for |
|---|---|---|---|
| **User** | `~/.claude/CLAUDE.md` | **No** — only you | Personal preferences: your editor habits, how you like explanations |
| **Project** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | **Yes** | Team conventions: build/test commands, architecture, coding standards |
| **Directory** | `./packages/api/CLAUDE.md` etc. | Yes | Conventions specific to one area, loaded when Claude works there |
| (Local, personal) | `./CLAUDE.local.md` (git-ignored) | No | Your personal notes for this project |
| (Enterprise) | Managed policy location | Org-wide | Organisation policies |

:::key The diagnostic pattern
"A new team member's Claude doesn't follow our conventions" → the conventions are in someone's **user-level** file, not the **project** file. Move them to the project CLAUDE.md and commit.
:::

## Modular organisation

A single 1,500-line CLAUDE.md is hard to maintain and loads everything into every session. Two tools keep it modular:

**`@import`** — include other files:

```markdown CLAUDE.md
# Payments service
Build: `make build` · Test: `make test` · Never edit generated files in /gen.

@docs/architecture.md
@docs/api-conventions.md
@~/.claude/my-shortcuts.md
```

**`.claude/rules/`** — topic-specific rule files (e.g. `testing.md`, `api.md`, `security.md`). Without frontmatter they load like CLAUDE.md content; with **`paths:`** frontmatter they load only for matching files (3.3).

Different packages can import only the standards relevant to them — the backend imports API and database conventions; the frontend imports component guidelines.

## What belongs in CLAUDE.md

- Commands Claude can't guess (build, test, lint, deploy).
- Architecture and where things live.
- Conventions that **always** apply.
- Gotchas ("integration tests need `docker compose up` first").

Task-specific procedures that only matter sometimes belong in **skills** (3.2); file-type conventions in **path-scoped rules** (3.3).

## Diagnosing

Run **`/memory`** to see which memory files are loaded and open them for editing. When Claude "ignores" an instruction, first check it's actually loaded — and at the expected level.

## Exam traps

:::trap Putting team conventions in `~/.claude/CLAUDE.md`
Works on your machine only.
:::

:::trap One giant CLAUDE.md for a monorepo
Split with `@import`, directory-level files and `.claude/rules/`.
:::

:::trap Debugging "ignored instructions" by rewording them first
Check with `/memory` whether the file loads at all.
:::

## Practice questions

{{quiz:a3-md-01}}

{{quiz:a3-md-02}}

## Build exercise

:::exercise Restructure a monorepo's memory
1. Create a repo with `packages/api` and `packages/web`.
2. Write a project CLAUDE.md with build/test commands; import `docs/architecture.md`.
3. Add `packages/api/CLAUDE.md` with API conventions; confirm via `/memory` it loads when you work there.
4. Put a preference in `~/.claude/CLAUDE.md` and verify a teammate's clone doesn't get it.
5. Move testing guidance into `.claude/rules/testing.md`.
:::
