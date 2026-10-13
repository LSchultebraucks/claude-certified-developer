---
skill: 3.1
title: Claude Code Operation
summary: Claude Code's core components (rules, skills, commands, agents, memory), session management, built-in and custom slash commands, headless and streaming modes, permission modes including auto mode, the CLAUDE.md hierarchy, /init and settings.json.
sources: Claude Code overview | https://code.claude.com/docs/en/overview; Run Claude Code programmatically (headless) | https://code.claude.com/docs/en/headless; CLI reference | https://code.claude.com/docs/en/cli-reference; Slash commands | https://code.claude.com/docs/en/commands; Skills | https://code.claude.com/docs/en/skills; Subagents | https://code.claude.com/docs/en/sub-agents; Memory | https://code.claude.com/docs/en/memory; Permission modes | https://code.claude.com/docs/en/permission-modes; Claude Code best practices | https://www.anthropic.com/engineering/claude-code-best-practices
---

## What you need to know

Claude Code is Anthropic's agentic coding tool. It runs in the **terminal (CLI)**, **IDE extensions** (VS Code, JetBrains), the **desktop app**, the **web** (claude.ai/code), **GitHub Actions / CI**, and programmatically through the **Agent SDK**. It reads your codebase, edits files, runs commands, and integrates with git and MCP servers — always within a **permission system** you control.

Only 3.1% of the exam, but Claude Code concepts reappear across Domains 2, 7 and 8 (configuration, hooks, MCP, skills). Know the components and which one to use for what.

## Core components

| Component | What it is | Where it lives | Loaded |
|---|---|---|---|
| **Rules** (CLAUDE.md & `.claude/rules/`) | Persistent instructions: conventions, commands, architecture | Managed / user / project / local CLAUDE.md; rules files (optionally `paths:`-scoped) | At session start (subdirectory files and path-scoped rules on demand) |
| **Skills** | Folder with `SKILL.md` (+ scripts/references): a reusable procedure or expertise | `~/.claude/skills/`, `.claude/skills/`, plugins | Description always in context; full body when invoked (by Claude or by `/skill-name`) |
| **Commands** | Slash commands: **built-in** (`/init`, `/clear`, …) and **custom** (`.claude/commands/*.md`, now merged into skills) | Same as skills | On `/command` |
| **Agents** (subagents) | Specialized assistants with their own context window, system prompt, tool set, model and permissions | `.claude/agents/*.md`, `~/.claude/agents/`, plugins, `--agents` | Description always; run on delegation |
| **Agent memory** | **Auto memory**: notes Claude writes itself (preferences, corrections, learnings) per repository; subagents can have their own persistent memory | Under `~/.claude/projects/…/memory/`; subagent `memory: user\|project\|local` | First lines loaded each session |
| **Hooks** | Shell/HTTP/prompt/agent handlers on lifecycle events (PreToolUse, PostToolUse, Stop, …) | settings.json, plugins, skill/agent frontmatter | Fire deterministically on events |
| **MCP servers** | External tools/resources via Model Context Protocol | `.mcp.json` (project), user/local config, plugins | Connected at start |
| **Plugins** | Bundles of the above, installed from marketplaces | `~/.claude/plugins/` | When enabled |

```markdown .claude/skills/release-notes/SKILL.md
---
name: release-notes
description: Draft release notes from merged PRs since the last tag. Use when the user asks for release notes or a changelog.
disable-model-invocation: true      # only the user can trigger it (has side effects / workflow)
allowed-tools: Bash(git log *) Bash(gh pr list *)
---
## Recent history
!`git log --oneline $(git describe --tags --abbrev=0)..HEAD`

Write release notes grouped by Features / Fixes / Breaking changes for: $ARGUMENTS
```

```markdown .claude/agents/test-runner.md
---
name: test-runner
description: Runs the test suite and reports only failing tests with likely causes. Use proactively after code changes.
tools: Bash, Read, Grep
model: haiku
---
You run tests and summarize failures concisely. Never edit files.
```

:::compare Which component for which job?
- **Always-true project facts** (build command, style rules) → CLAUDE.md / rules.
- **A repeatable procedure or domain expertise loaded only when relevant** → skill.
- **A user-triggered workflow** (deploy, release notes) → skill with `disable-model-invocation: true` (invoked as `/name`).
- **Isolated, verbose or parallel work with its own tools/model** → subagent.
- **Something that must happen every time** (format after edit, block `rm -rf`) → hook.
- **Access to an external system** (Jira, database, browser) → MCP server.
- **Share all of the above** → plugin.
:::

## The CLAUDE.md hierarchy and repository initialization

- **Managed policy** CLAUDE.md (organization) → **user** `~/.claude/CLAUDE.md` → **project** `./CLAUDE.md` or `./.claude/CLAUDE.md` → **local** `./CLAUDE.local.md` (gitignored).
- Files in the working directory **and ancestors** load at launch; **subdirectory** CLAUDE.md files load on demand when Claude works there.
- Content is **concatenated**; more specific/closer files come later.
- `@path` imports; `.claude/rules/*.md` with optional `paths:` globs; `/memory` to edit; `/context` to inspect what's loaded.
- **`/init`** analyzes the repository and generates a starter CLAUDE.md (build/test commands, conventions); if one exists, it suggests improvements. Refine it with knowledge Claude can't infer.

## settings.json essentials

- Scopes and precedence: **managed → CLI `--settings` → `.claude/settings.local.json` → `.claude/settings.json` → `~/.claude/settings.json`**.
- Key areas: `permissions` (`allow` / `ask` / `deny`, `defaultMode`, `additionalDirectories`), `hooks`, `env`, `model`, `enabledPlugins`, `apiKeyHelper`, sandbox.
- Permission rules: `Bash(npm run test *)`, `Read(./.env)`, `Edit(src/**)`, `WebFetch(domain:docs.example.com)`, `mcp__github__*`. Evaluation order **deny → ask → allow**.

## Permission modes (cycle with Shift+Tab in the CLI)

| Mode | Behavior |
|---|---|
| `default` ("Manual") | Asks before the first use of tools that need approval (edits, most Bash, web) |
| `acceptEdits` | Auto-accepts file edits and common filesystem commands in the working directories |
| `plan` | Read-only exploration and planning; no edits to source files until you approve the plan |
| `auto` | No routine prompts; a **background classifier** reviews actions (shell commands, network requests) and blocks those that don't align with your request or look risky |
| `dontAsk` | Denies anything that would prompt; only pre-allowed and no-approval actions run (locked-down CI) |
| `bypassPermissions` | Skips prompts (except protected actions) — only in isolated sandboxes/containers; can be disabled by managed policy |

## Session management

| Action | How |
|---|---|
| Continue the most recent session | `claude --continue` (`-c`) |
| Pick/resume a specific session | `claude --resume` (`-r`) or `/resume`; by ID `--resume <id>` |
| Branch a session | `--fork-session` with resume |
| Start fresh context | `/clear` |
| Summarize to free context | `/compact [instructions]` (auto-compaction near the limit) |
| Undo to a checkpoint | `/rewind` (or Esc Esc) — restores code and/or conversation |
| Inspect context usage | `/context` |
| Interrupt Claude | Esc |

## Built-in slash commands to know

`/init` (create CLAUDE.md) · `/memory` (edit memory files) · `/clear` · `/compact` · `/context` · `/rewind` · `/resume` · `/model` (switch model) · `/effort` · `/config` & `/status` · `/permissions` (view/edit rules) · `/hooks` (browse hooks) · `/agents` (subagents) · `/mcp` (MCP servers & auth) · `/plugin` (marketplaces & plugins) · `/code-review` (alias `/review`) and `/security-review` (review changes) · `/add-dir` · `/usage` (alias `/cost`) · `/doctor` (diagnose installation and config) · `/help`.

**Custom commands**: a Markdown file in `.claude/commands/name.md` or a skill in `.claude/skills/name/SKILL.md` both create `/name`; `$ARGUMENTS` (or `$0`, `$1`, …) inserts arguments; `` !`cmd` `` injects command output before Claude sees the prompt; frontmatter can restrict tools and set the model.

## Headless mode (non-interactive)

Run Claude Code from scripts and CI with **`-p` / `--print`**:

```bash
claude -p "Run the test suite and fix any failures" \
  --allowedTools "Bash(npm test *),Read,Edit" \
  --permission-mode acceptEdits \
  --max-turns 20 \
  --output-format json
```

| Flag | Purpose |
|---|---|
| `-p "<prompt>"` | Non-interactive run; reads stdin too (`cat log.txt \| claude -p "explain"`) |
| `--output-format text \| json \| stream-json` | Plain text (default), one JSON result (with `result`, `session_id`, `total_cost_usd`, usage), or newline-delimited JSON events |
| `--json-schema '<schema>'` | With `json` output: schema-conforming `structured_output` |
| `--allowedTools` / `--disallowedTools` | Pre-approve or deny tools (permission rule syntax) |
| `--permission-mode` | `acceptEdits`, `dontAsk`, `auto`, `plan`, … |
| `--max-turns`, `--max-budget-usd` | Bound runaway runs |
| `--append-system-prompt` / `--system-prompt` | Add to or replace the system prompt |
| `--continue` / `--resume <id>` | Multi-step scripted conversations |
| `--mcp-config`, `--settings`, `--agents`, `--plugin-dir` | Supply configuration explicitly |
| `--bare` | Skip auto-discovery of hooks, skills, plugins, MCP, CLAUDE.md, memory — reproducible CI runs |

Exit code 0 on success, non-zero on failure — scripts can branch on it.

## Streaming mode

- **Streaming output**: `--output-format stream-json` (with `--verbose`, optionally `--include-partial-messages` for token-level deltas) emits one JSON object per line: a `system/init` event (model, tools, MCP servers, plugins), assistant/user messages (tool calls and results), optional `stream_event`s, and a final `result` message with cost and session metadata. Useful for live UIs and log processing.
- **Streaming input**: `--input-format stream-json` lets a program feed multiple user messages into one running session over stdin (multi-turn, interruptible) — the mechanism the Agent SDK uses.

## Interfaces and integrations

- **IDE**: diffs shown in the editor, selection/diagnostics shared as context.
- **Desktop/web**: parallel sessions, cloud sessions, remote control.
- **GitHub Actions**: `@claude` mentions in issues/PRs; CI automation with secrets.
- **Agent SDK**: the same harness in Python/TypeScript for your own products.
- **Third-party providers**: Claude Code can run against Amazon Bedrock, Google Vertex AI or Microsoft Foundry via environment configuration.

## Effective operating practices

1. **Explore → plan → implement → verify**: use plan mode for non-trivial changes; give Claude a way to verify (tests, linters, screenshots).
2. **Be specific** in prompts (files, constraints, acceptance criteria).
3. **Manage context**: `/clear` between tasks; subagents for investigations; `/compact` with focus.
4. **Encode recurring corrections** in CLAUDE.md; procedures in skills; must-always behaviors in hooks.
5. **Parallelize** with multiple sessions / git worktrees; review with a fresh session.

## Exam traps

:::trap Using CLAUDE.md for a workflow that should be a skill
Multi-step procedures that matter only sometimes belong in skills (loaded on demand), not in CLAUDE.md (loaded every session).
:::

:::trap Assuming `-p` without `--allowedTools` can edit files in CI
In non-interactive runs nobody can answer permission prompts. Pre-approve the needed tools or set an appropriate permission mode; otherwise actions that would prompt are denied.
:::

:::trap Choosing `bypassPermissions` on a developer laptop for convenience
It skips safety prompts; reserve it for isolated containers/VMs. Prefer `acceptEdits`, allow rules, or auto mode.
:::

:::trap Thinking subagents share the main conversation's context
Subagents get their own context; only their final result returns. That's the point — and why the delegation prompt must contain what they need.
:::

## Practice questions

{{quiz:d3-cc-01}}

{{quiz:d3-cc-02}}

{{quiz:d3-cc-03}}

## Build exercise

:::exercise Configure Claude Code for a real repository
1. Run `/init`, then trim and correct the generated CLAUDE.md. Check `/context` to see what loads.
2. Create a `/release-notes` skill with `disable-model-invocation: true`, `` !`git log …` `` dynamic context and `$ARGUMENTS`.
3. Create a `test-runner` subagent (Haiku, tools `Bash, Read, Grep`, "use proactively after code changes"); verify Claude delegates to it.
4. Add a committed `.claude/settings.json` with allow rules for test/lint, deny rules for secrets, and a PostToolUse formatter hook.
5. Try each permission mode with Shift+Tab; do a small change in plan mode first, then accept the plan.
6. Write a CI script: `claude --bare -p "…" --allowedTools … --output-format json --max-turns 15` and parse `result` and `total_cost_usd` with `jq`. Then try `--output-format stream-json --verbose` and watch the event types.
7. Resume your interactive session from the command line with `claude --continue`, then use `/rewind` to undo a change.
:::
