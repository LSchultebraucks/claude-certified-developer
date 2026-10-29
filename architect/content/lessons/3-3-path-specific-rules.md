---
skill: 3.3
title: Path-Specific Rules
summary: .claude/rules/ files with paths glob frontmatter that load only when matching files are touched — and why they beat directory-level CLAUDE.md for conventions that span the tree.
sources: Claude Code: Memory (CLAUDE.md) | https://code.claude.com/docs/en/memory; Claude Code best practices | https://www.anthropic.com/engineering/claude-code-best-practices; Features overview | https://code.claude.com/docs/en/features-overview; Claude Code settings | https://code.claude.com/docs/en/settings
---

## What you need to know

Some conventions apply to a **kind of file**, not a **place**: every test file, every Terraform module, every database migration. These files are often **spread across many directories**. Directory-level CLAUDE.md files can't express that without duplicating the rules in dozens of places.

**Path-specific rules** solve it: Markdown files in **`.claude/rules/`** with a **`paths:`** list of glob patterns in YAML frontmatter. Claude loads them **only when working with files that match**.

```markdown .claude/rules/react-tests.md
---
paths:
  - "**/*.test.tsx"
  - "**/*.test.ts"
---
# Test conventions
- Vitest + Testing Library; query by role, not test IDs.
- One behaviour per test; name tests "does X when Y".
- Mock network with MSW handlers from `test/handlers.ts`, never fetch directly.
```

```markdown .claude/rules/terraform.md
---
paths:
  - "terraform/**/*"
  - "**/*.tf"
---
Pin provider versions. Tag every resource with owner and cost-center. Never hard-code account IDs.
```

## Why path scoping is better here

| Approach | Problem / benefit |
|---|---|
| Rules in root CLAUDE.md | Loaded in **every** session even when no tests are touched — wasted context, more instructions competing for attention |
| A CLAUDE.md in each test directory | Duplicated in 40 places, drifts out of sync, misses co-located tests next to source files |
| **`.claude/rules/` with `paths:`** | One source of truth; loads exactly when relevant, wherever the file lives ✔ |

Directory-level CLAUDE.md remains right for conventions tied to **one area** of the tree (e.g. everything under `packages/billing/`).

:::scenario S2 — tests next to components
A React codebase co-locates `Button.test.tsx` beside `Button.tsx` in hundreds of folders. The team wants consistent test conventions applied automatically. **Answer:** a `.claude/rules/` file with `paths: ["**/*.test.tsx"]`.
:::

## Exam traps

:::trap Directory CLAUDE.md for cross-cutting file types
Can't follow files spread across the tree without duplication.
:::

:::trap Everything in root CLAUDE.md "so it's always available"
Irrelevant context in every session. Scope it.
:::

:::trap A skill for always-applicable conventions
Skills are on-demand workflows; rules apply automatically when matching files are edited.
:::

## Practice questions

{{quiz:a3-rule-01}}

{{quiz:a3-rule-02}}

## Build exercise

:::exercise Path-scoped conventions
1. Create `.claude/rules/tests.md` with `paths: ["**/*.test.ts"]` and two distinctive conventions.
2. Ask Claude to edit a source file — confirm (`/memory` or by behaviour) the rule isn't applied.
3. Ask it to write a test anywhere in the tree — confirm the conventions are applied.
4. Add a second rule for `migrations/**/*.sql` and verify both scope correctly.
:::
