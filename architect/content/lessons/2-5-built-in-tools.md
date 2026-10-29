---
skill: 2.5
title: Built-in Tools
summary: Choosing between Read, Write, Edit, Bash, Grep and Glob — content search versus path patterns, unique anchors for Edit and the Read + Write fallback, and incremental exploration instead of reading everything.
sources: Claude Code settings — tools available | https://code.claude.com/docs/en/settings; Claude Code best practices | https://www.anthropic.com/engineering/claude-code-best-practices; Agent SDK overview | https://code.claude.com/docs/en/agent-sdk/overview; Common workflows | https://code.claude.com/docs/en/common-workflows
---

## What you need to know

Claude Code and the Agent SDK ship with built-in tools. The exam tests picking the **right one for the job** — and building exploration strategies that don't flood the context.

| Tool | Does | Use for |
|---|---|---|
| **Grep** | Searches file **contents** (regex) | All callers of `processRefund`, every place an error message is raised, imports of a module |
| **Glob** | Matches file **paths** by pattern | All `**/*.test.tsx`, every `migrations/*.sql`, config files by name |
| **Read** | Reads a file (or a range) | Inspect specific files found via Grep/Glob |
| **Write** | Writes a whole file | New files, or full rewrites |
| **Edit** | Replaces an exact, **unique** string | Targeted modifications |
| **Bash** | Runs shell commands | Tests, builds, git, project scripts |

:::key Grep vs. Glob
Content → **Grep**. Name/path → **Glob**. "Find all test files" is Glob; "find all tests that mock the payment client" is Grep.
:::

## Edit and its fallback

Edit replaces `old_string` with `new_string` and requires `old_string` to be **unique** in the file (unless replacing all occurrences). When the anchor occurs several times:

1. Include **more surrounding context** to make the anchor unique, or
2. Fall back to **Read + Write**: read the file, produce the full modified content, write it back.

Don't switch to `sed` through Bash to dodge the uniqueness check — that loses the safety the tool provides.

## Incremental exploration

The efficient way to understand unfamiliar code is **targeted and incremental**:

1. **Grep** for entry points (route names, the function in the bug report).
2. **Read** those files.
3. Follow **imports** and calls with further Grep/Read.
4. Stop when the question is answered.

:::scenario S4 — tracing a function across wrappers
To find every caller of `charge_card`, the agent first Greps for the name, then discovers it's re-exported as `billing.charge` in a wrapper module, and Greps again for the wrapper name — tracing usage across wrapper modules rather than assuming one search found everything.
:::

Reading every file "to get the full picture" fills the context with irrelevant code, degrades later answers (5.4) and costs tokens. For broad discovery, delegate to the **Explore subagent** (3.4).

## Exam traps

:::trap Glob to find function callers
Glob matches paths only. Use Grep.
:::

:::trap Reading the whole codebase up front
Context degradation and cost. Explore incrementally or delegate exploration.
:::

:::trap Retrying the same non-unique Edit
It will fail again. Add context or use Read + Write.
:::

## Practice questions

{{quiz:a2-bit-01}}

{{quiz:a2-bit-02}}

## Build exercise

:::exercise Tool choice drills in a real repo
1. In an open-source repo, ask Claude Code to "find all test files" and "find all tests that use the HTTP client"; check it uses Glob then Grep.
2. Pick a duplicated code line; ask for an Edit and watch it handle non-uniqueness.
3. Ask a "how does X work?" question and count files read; then ask again with "explore incrementally, start from the entry point" and compare.
4. Use the Explore subagent for the same question and compare the main-context size.
:::
