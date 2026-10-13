---
skill: 7.3
title: Claude Hooks
summary: Use Claude Code and Agent SDK hooks as deterministic guardrails — events, matchers, exit codes, JSON decisions — to block destructive actions, enforce policy and audit tool use.
sources: Hooks reference | https://code.claude.com/docs/en/hooks; Hooks guide | https://code.claude.com/docs/en/hooks-guide; Agent SDK hooks | https://code.claude.com/docs/en/agent-sdk/hooks; Permissions | https://code.claude.com/docs/en/permissions
---

## What you need to know

Only 1% of the exam, but the concept is central to Domain 7: **hooks are code that the harness runs at fixed lifecycle points, every time, regardless of what the model decides.** That makes them the right tool when an action must *never* (or *always*) happen.

## Where hooks exist

- **Claude Code**: configured in `settings.json` (user, project, local, managed), plugins (`hooks/hooks.json`), and skill/subagent frontmatter. Handlers can be **command** (shell), **http**, **mcp_tool**, **prompt** (an LLM judges) or **agent** types.
- **Claude Agent SDK**: Python/TypeScript **callbacks** registered with `hooks={...}` and `HookMatcher` — same event model, implemented as functions in your app.
- (Messages API apps implement the equivalent themselves: check every tool call in the loop before executing it.)

## Key events for guardrails

| Event | When | Guardrail use |
|---|---|---|
| **PreToolUse** | Before a tool call executes | **Block** dangerous commands/paths, require approval (`ask`), **rewrite** input (`updatedInput`) |
| **PermissionRequest** | A permission decision is needed | Auto-allow/deny based on policy |
| **PostToolUse** | After a tool succeeds | Run formatters/linters/tests; audit logging; feed problems back to Claude |
| **UserPromptSubmit** | Before a prompt is processed | Block prompts with secrets; inject context |
| **Stop / SubagentStop** | Claude wants to finish | Block stopping until criteria met (tests pass) |
| **SessionStart** | Session begins/resumes | Load context, set environment |
| **PreCompact**, **SessionEnd**, **Notification**, … | Lifecycle | Backups, cleanup, alerts |

## Configuration (Claude Code)

```json .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/block-destructive.sh" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [ { "type": "command", "command": "npx prettier --write \"$CLAUDE_PROJECT_DIR\"" } ]
      }
    ]
  }
}
```

- Structure: **event → matcher group → handlers**. Matchers match tool names (`Bash`, `Edit|Write`, `mcp__github__.*`).
- Handler input arrives as **JSON on stdin** (`session_id`, `cwd`, `hook_event_name`, `tool_name`, `tool_input`, `permission_mode`, …).
- `$CLAUDE_PROJECT_DIR` points to the project root.

```bash .claude/hooks/block-destructive.sh
#!/usr/bin/env bash
cmd=$(jq -r '.tool_input.command // ""')
if echo "$cmd" | grep -Eq 'rm -rf /|git push (-f|--force)|DROP TABLE|mkfs'; then
  echo "Blocked by policy: destructive command '$cmd'" >&2
  exit 2          # exit code 2 = block; stderr is fed back to Claude
fi
exit 0
```

### Exit codes and JSON output

| Result | Meaning |
|---|---|
| **Exit 0** | Success; stdout may contain a JSON decision object |
| **Exit 2** | **Blocking error** on events that can block (PreToolUse, UserPromptSubmit, Stop, …); **stderr is shown to Claude** as the reason |
| **Other non-zero** (e.g., 1) | **Non-blocking** error — the action proceeds and an error notice is shown. Use exit 2 to enforce policy |

Structured decisions (exit 0 + JSON on stdout) for PreToolUse:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Writes to production config are not allowed"
  }
}
```

`permissionDecision` can be `allow`, `deny` or `ask` (prompt the user); `updatedInput` can rewrite the tool arguments (e.g., add `--dry-run`). Universal fields: `continue: false` + `stopReason` stops Claude entirely; `systemMessage` warns the user. Stop hooks use `"decision": "block"` with a `reason` to make Claude keep working.

## Hooks in the Agent SDK

```python
from claude_agent_sdk import ClaudeAgentOptions, HookMatcher

async def protect_prod(input_data, tool_use_id, context):
    path = input_data["tool_input"].get("file_path", "")
    if path.startswith("/etc/") or "prod.env" in path:
        return {"hookSpecificOutput": {"hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": "Production files are read-only"}}
    return {}

options = ClaudeAgentOptions(hooks={"PreToolUse": [HookMatcher(matcher="Write|Edit", hooks=[protect_prod])]})
```

## Typical guardrail hooks

- Block `rm -rf`, force pushes, `DROP`/`TRUNCATE`, writes outside the repo, edits to `.env`/secrets/migrations.
- Require approval (`ask`) for deploy commands or network calls to unknown domains.
- Scan prompts or written files for secrets (API keys) and block them.
- Audit every tool call to a SIEM (PostToolUse).
- Enforce quality gates: run tests on Stop; block finishing while tests fail.
- Add `--dry-run` automatically to risky CLI tools via `updatedInput`.

## Hooks vs. other controls

| Control | Nature | Best for |
|---|---|---|
| CLAUDE.md / system prompt | Guidance (probabilistic) | Conventions, preferences |
| Permission rules (`allow`/`ask`/`deny`) | Declarative, deterministic pattern matching | Simple tool/path/command policies |
| **Hooks** | **Programmable, deterministic** | Conditional logic, content inspection, external checks, auditing, rewriting input |
| Sandbox | OS-level isolation | Containing everything a process can touch, including subprocesses |
| Managed settings | Organization-enforced configuration | Policies users can't override (`allowManagedHooksOnly`, deny rules) |

:::warn Hooks run with your privileges
Command hooks execute shell commands as your user. Review hooks from repositories and plugins before enabling them; organizations can restrict hooks to managed ones.
:::

## Exam traps

:::trap Using exit code 1 to block
Exit 1 is non-blocking; the tool call still runs. Use exit 2 (or a JSON `deny`).
:::

:::trap Relying on CLAUDE.md for "never delete production data"
Guidance can be ignored or overridden by injected content. A PreToolUse hook or deny rule enforces it.
:::

:::trap Using PostToolUse to prevent an action
PostToolUse runs after the tool has already executed. Prevention needs PreToolUse (or permission rules).
:::

## Practice questions

{{quiz:d7-hook-01}}

{{quiz:d7-hook-02}}

## Build exercise

:::exercise Guardrail hooks for a coding agent
1. Write a PreToolUse Bash hook that blocks `rm -rf`, `git push --force` and `curl … | sh` with exit 2 and a clear reason; test it by asking Claude to run each.
2. Write a PreToolUse Edit|Write hook that returns a JSON `deny` for paths matching `**/.env*` or `migrations/**`.
3. Add a PostToolUse hook that appends `{timestamp, tool_name, tool_input}` to an audit log.
4. Add a Stop hook that blocks stopping while `npm test` fails, returning the failures as the reason.
5. Port the first two hooks to the Agent SDK as Python callbacks and verify the same behavior.
:::
