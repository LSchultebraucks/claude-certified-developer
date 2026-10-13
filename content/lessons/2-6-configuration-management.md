---
skill: 2.6
title: Configuration Management
summary: Manage CLAUDE.md files, settings.json scopes and precedence, model version pinning, prompt versioning and plugin dependencies as versioned, reviewable configuration.
sources: Claude Code memory (CLAUDE.md) | https://code.claude.com/docs/en/memory; Claude Code settings | https://code.claude.com/docs/en/settings; Model configuration (Claude Code) | https://code.claude.com/docs/en/model-config; Models overview | https://platform.claude.com/docs/en/about-claude/models/overview; MCP in Claude Code | https://code.claude.com/docs/en/mcp; Plugin manifest reference | https://code.claude.com/docs/en/plugins/manifest-reference
---

## What you need to know

Claude systems have many configuration artifacts: instruction files, settings, model IDs, prompts, tool schemas, MCP configs, plugins. Configuration management means each one is **versioned, reviewed, scoped to the right audience, reproducible across environments, and free of secrets**. Questions usually ask *where* a configuration belongs or *how* to keep behavior stable.

## CLAUDE.md files

CLAUDE.md files are Markdown instructions Claude Code loads into context at session start. They are **context, not enforced configuration**.

| Scope | Location | Shared with | Use for |
|---|---|---|---|
| Managed policy | OS-specific system path (e.g. `/etc/claude-code/CLAUDE.md`, `C:\Program Files\ClaudeCode\CLAUDE.md`) or `claudeMd` in managed settings | Everyone on the machine; cannot be excluded | Company standards, compliance reminders |
| User | `~/.claude/CLAUDE.md` | Only you, all projects | Personal preferences |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team via git | Build/test commands, architecture, conventions |
| Local | `./CLAUDE.local.md` (gitignored) | Only you, this project | Personal sandbox URLs, test data |
| Rules | `.claude/rules/*.md` (optionally `paths:` frontmatter) and `~/.claude/rules/` | Team / you | Modular topic files; path-scoped rules load only when matching files are touched |

Loading behavior:
- Files in the working directory **and every ancestor directory** load at launch; files in **subdirectories load on demand** when Claude reads files there.
- All files are **concatenated, not overridden**: broader scopes first, more specific later (closer to the working directory is read last). Conflicting instructions make behavior arbitrary — keep them consistent.
- `@path/to/file` **imports** other files (relative to the importing file, up to 4 hops deep). Imports organize but don't reduce context cost.
- Keep each file **concise (target < 200 lines)**; move procedures into **skills** and area-specific guidance into **path-scoped rules**.
- `/init` generates a starter CLAUDE.md from the codebase; `/memory` opens memory files; `/context` shows what loaded.
- Repos using `AGENTS.md` can be read in place of CLAUDE.md when no CLAUDE.md exists.

:::key Guidance vs. enforcement
"Never edit files in `migrations/`" in CLAUDE.md makes Claude *likely* to comply. A `permissions.deny` rule like `Edit(./migrations/**)` in settings **enforces** it. Put behavioral guidance in CLAUDE.md, enforcement in settings/hooks.
:::

## settings.json

| Scope | File | Applies to | Committed? |
|---|---|---|---|
| Managed | `managed-settings.json`, MDM/OS policy, or server-managed from the admin console | Organization | Deployed by IT |
| Command line | `claude --settings <file-or-json>` | One session | — |
| Project local | `.claude/settings.local.json` | You, this project | No (gitignored) |
| Shared project | `.claude/settings.json` | Everyone in the repo | **Yes** |
| User | `~/.claude/settings.json` | You, all projects | — |

**Precedence (highest first): managed → command line → local → project → user.** A key set at a higher level overrides lower ones — *but list-valued keys such as `permissions.allow`/`deny` merge* across files, and a `deny` anywhere beats an `allow` anywhere (evaluation order: deny → ask → allow). Nothing overrides managed settings.

```json .claude/settings.json (committed)
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": ["Bash(npm run test *)", "Bash(npm run lint)"],
    "deny":  ["Read(./.env)", "Read(./secrets/**)", "Bash(curl *)"]
  },
  "env": { "NODE_ENV": "development" },
  "hooks": {
    "PostToolUse": [{ "matcher": "Edit|Write",
      "hooks": [{ "type": "command", "command": "npx prettier --write \"$CLAUDE_PROJECT_DIR\"" }] }]
  },
  "enabledPlugins": { "deploy-tools@acme-marketplace": true }
}
```

Other useful keys: `model`, `availableModels` (allowlist), `env`, `hooks`, `apiKeyHelper` (script that returns a credential — keeps keys out of files), `additionalDirectories`, `defaultMode` (permission mode), `enabledPlugins`, `extraKnownMarketplaces`, `claudeMdExcludes` (skip irrelevant CLAUDE.md files in monorepos), sandbox settings. Settings files are strict JSON (no comments, no trailing commas); `/status` shows which sources loaded.

## MCP server configuration

- Project-shared MCP servers live in **`.mcp.json`** at the repo root (committed); Claude Code asks each user to approve project servers.
- Scopes: **local** (default, you in this project), **project** (`.mcp.json`), **user** (all your projects). Add via `claude mcp add --transport stdio|http <name> …` with `--scope`.
- Use **environment-variable expansion** (`${API_TOKEN}`, `${VAR:-default}`) in `.mcp.json` so tokens are not committed.

## Model version pinning

Model behavior changes between releases. Production systems should be **reproducible**:

- Reference a **specific model ID** in configuration (e.g., `claude-opus-5-5`, or a dated snapshot ID such as `claude-haiku-4-5-20251001` for models that have them) rather than relying on whatever a moving alias or "latest" default points to.
- Keep the model ID in **config / environment**, not hard-coded in many places, so upgrades are one reviewed change.
- Pin the model per **route/feature**, record it in logs, and **upgrade deliberately** with evals, a branch, and staged rollout (lesson 2.2). Watch deprecation notices for retirement dates.
- In Claude Code, set `model` in settings (or `ANTHROPIC_MODEL`); organizations can restrict choices with `availableModels`. Pin the models behind the `opus`/`sonnet`/`haiku` aliases with env vars such as `ANTHROPIC_DEFAULT_SONNET_MODEL` when you must control what an alias resolves to.
- On Bedrock / Vertex AI, use the platform's versioned model IDs and check regional availability.

## Prompt versioning

Prompts are code. Treat them that way:

- Store prompts (system prompts, templates, tool descriptions, few-shot examples) in **version control**, separate from application logic (e.g., `prompts/support_v7.md`) or in a prompt registry.
- Give each prompt a **version identifier** and **log it with every request** alongside model ID and parameters — so any output can be traced and reproduced.
- **Review** prompt changes like code; run the **eval suite in CI** on every prompt change; keep a changelog explaining *why* each change was made.
- Use **templates with variables** (`{{customer_name}}`) instead of copy-pasted variants; keep the static part stable for prompt caching.
- Roll out prompt versions with **feature flags / canaries**, and keep the previous version deployable for rollback.
- Tie prompt versions to model versions: a prompt tuned for one model may need re-tuning for the next.

## Plugin dependencies

- `plugin.json` can declare `dependencies` (`"name"`, `"name@marketplace"`, or `{ "name", "marketplace", "version" }` with a version constraint); dependent plugins are enabled together.
- Setting `version` in `plugin.json` pins users to that release until the author bumps it; marketplaces distribute updates.
- Teams declare required plugins in the committed `.claude/settings.json` (`enabledPlugins`, `extraKnownMarketplaces`) so everyone gets the same set; organizations enforce allowed marketplaces with managed settings.
- Review dependency updates like any third-party code — plugins can run hooks and MCP servers.

## Environments and secrets

- Separate **dev / staging / prod** configuration: different API keys, workspaces, rate limits, model choices and logging levels.
- **Never put secrets** in CLAUDE.md, prompts, `.claude/settings.json` or `.mcp.json`. Use environment variables, secret managers, `apiKeyHelper`, or vaults; deny Claude Code read access to secret files.
- Infrastructure-as-code for the surrounding infrastructure; configuration changes go through pull requests.

## Exam traps

:::trap Putting enforcement in CLAUDE.md
CLAUDE.md shapes behavior but does not enforce it. Use `permissions.deny`, sandboxing or hooks for "must never".
:::

:::trap Expecting a project `allow` to override a user `deny`
Permission lists merge across scopes and deny rules take precedence over allow rules regardless of where they're defined.
:::

:::trap Committing personal settings or secrets
Personal overrides go in `.claude/settings.local.json` / `CLAUDE.local.md` (gitignored); secrets go in environment variables or secret stores.
:::

:::trap Using an unpinned/moving model reference in production
An alias or default that moves to a new model can change behavior overnight. Pin, log, and upgrade deliberately.
:::

## Practice questions

{{quiz:d2-cfg-01}}

{{quiz:d2-cfg-02}}

## Build exercise

:::exercise Make a repository "Claude-ready" and reproducible
1. Run `/init` in a real repo; trim the generated CLAUDE.md to < 100 lines of verifiable instructions (build, test, conventions).
2. Move API-specific conventions into `.claude/rules/api.md` with `paths: ["src/api/**/*.ts"]`; confirm with `/context` that it loads only when touching API files.
3. Create a committed `.claude/settings.json` with allow rules for test/lint commands and deny rules for `.env` and `secrets/**`; put your personal model preference in `.claude/settings.local.json`.
4. Add a `.mcp.json` for a GitHub or database MCP server using `${ENV_VAR}` expansion for the token.
5. In your app, move the model ID and prompt version into config; log `{model, prompt_version, request_id, usage}` per request.
6. Add a CI job that fails if a prompt file changes without the eval score file being updated.
:::
