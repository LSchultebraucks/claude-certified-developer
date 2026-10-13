---
title: Quick Reference
summary: Dense cheat sheets for last-minute review — the facts, numbers, decision rules and syntax most likely to appear on the CCDV-F exam.
---

## Exam at a glance

| | |
|---|---|
| Items / time | **53** items · **120** min (≈ 2 min 15 s per item) |
| Formats | Multiple choice and **multiple response** (item states how many to select) |
| Pass | **720** scaled (100–1,000), criterion-referenced |
| Fee / validity | **$125** per attempt · valid **12 months** · free on-time renewal |
| Retakes | wait **14 / 30 / 90** days · max **4** attempts per rolling 12 months |
| Biggest skills | 2.5 App Design **8.6%** · 2.4 SWE **7.4%** · 2.3 API **6.8%** · 5.2 Tech fundamentals **6.1%** · 1.2 Agent construction **5.3%** · 5.1 LLM fundamentals **5.2%** |
| Domains | D1 14.7 · **D2 33.1** · D3 3.1 · D4 2.6 · D5 16.8 · D6 11.0 · D7 8.1 · D8 10.6 |

## Universal answer heuristics

1. **Simplest adequate solution** wins (single call → workflow → agent → multi-agent).
2. **"Must always / must never"** → deterministic control (code gate, hook, permission rule, schema, sandbox), not a prompt.
3. **Untrusted content** (web, email, docs, tool results) → delimit as data, least privilege, approvals; never into the system prompt.
4. **Authorization** lives in code/data layer, never in the prompt.
5. **Measure** (success criteria + evals) before and after changes; change one thing at a time.
6. **Cost**: free wins first (caching, batching, trimming, output hygiene), then trade-offs (effort, smaller model).
7. **Reusable integration across apps** → MCP server; **app-specific action** → custom tool; **know-how** → Skill; **generic capability** → built-in tool.
8. Distractors often: "bigger model", "raise temperature", "add CAPITALS to prompt", "iteration cap as primary stop", "retry 400s".

## Messages API

```text
POST https://api.anthropic.com/v1/messages
headers: x-api-key · anthropic-version: 2023-06-01 · content-type: application/json · [anthropic-beta]
body:    model*, max_tokens*, messages* (user first, alternate), system, tools, tool_choice,
         stream, thinking, output_config {effort, format}, stop_sequences, metadata {user_id}
```

| `stop_reason` | Action |
|---|---|
| `end_turn` | Done |
| `tool_use` | Run tools → one user msg with all `tool_result`s → call again |
| `max_tokens` | Truncated → raise limit / continue; don't parse as complete |
| `stop_sequence` | Custom stop hit |
| `pause_turn` | Server-tool loop paused → resend to continue |
| `refusal` | Safety decline (HTTP 200) → no tools from this turn; fallback |
| `model_context_window_exceeded` | Window full → reduce input |

- API is **stateless** — resend history. Initial system prompt = top-level `system`.
- **Prefill** not supported on current models → structured outputs. **Sampling params** rejected on newest models.
- `usage`: total input = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`; thinking billed as **output**.
- Other endpoints: `/v1/messages/count_tokens`, `/v1/messages/batches`, `/v1/files`, `/v1/models`.

### Streaming (SSE, not WebSockets)
`message_start` → `content_block_start` → `content_block_delta` (`text_delta` · `input_json_delta` · `thinking_delta`) → `content_block_stop` → `message_delta` (stop_reason, usage) → `message_stop` · `ping` anytime · `error` can arrive mid-stream. Same cost; better TTFT; avoids timeouts.

### Message Batches
**50% off** · ≤ **100,000** requests / **256 MB** · most < 1 h, max **24 h** · results **any order → match `custom_id`** · results kept 29 days · statuses `succeeded / errored / canceled / expired`.

### Thinking & effort
- Current models: `thinking: {"type": "adaptive"}` + `output_config.effort`: `low · medium · high · xhigh · max`.
- Legacy: `{"type": "enabled", "budget_tokens": N}` (≥ 1024, < max_tokens) on older models (e.g., Haiku 4.5).
- Pass thinking blocks back **unchanged** in tool loops; display (`summarized`/`omitted`) doesn't change billing.
- **Fast mode** (Opus, research preview): faster output, premium price, `speed: "fast"` + beta.

### Vision / PDF / files / citations
Image blocks (base64 / URL / file_id) — place before the question; ≈ ⌈w/28⌉×⌈h/28⌉ visual tokens; oversized images downscaled; ≤ 600 images/request. PDFs = text + page images. **Files API** upload once → `file_id`. **Citations** on documents → `cited_text` + location; incompatible with structured outputs.

### Platforms
Claude API (features first) · **Bedrock** (IAM, `anthropic.` model prefix) · **Vertex AI** (GCP ADC, project+region) · **Foundry** (Azure). Same Messages shape; feature availability differs.

## Tools

| `tool_choice` | |
|---|---|
| `auto` | default, model decides |
| `any` / `tool` | force (rejected on newest models → use auto + prompt / strict / structured outputs) |
| `none` | no tools |
| `disable_parallel_tool_use` | ≤ 1 call per turn |

- Definition: `name`, **`description` (when to use!)**, `input_schema`, optional `strict: true` (+ `additionalProperties: false`), `input_examples`.
- Results: one user message, every `tool_use_id` answered, errors as `is_error: true` with actionable text.
- **Client tools** (you run): custom, bash, text editor, memory, computer use. **Server tools** (Anthropic runs): web search, web fetch, code execution, tool search, advisor.
- Many tools → **tool search** (`defer_loading`); many chained calls → **programmatic tool calling**.
- Side effects → **approval gates**; authorization with the **user's** scope.

## Agent construction

| | Harness | Hosting | Built-in tools |
|---|---|---|---|
| Manual loop | you | you | none |
| Tool Runner (`client.beta.messages.tool_runner`) | SDK helper | you | none |
| **Agent SDK** (`claude-agent-sdk`) | Claude Code harness | **you** | Read/Write/Edit/Bash/Glob/Grep/Web…, subagents, MCP, hooks, sessions |
| **Managed Agents** (beta) | Anthropic | **Anthropic** (per-session sandbox) | bash/files/code exec, Skills, MCP; versioned agents, sessions, vaults |

Agent SDK: `query()` (one-off) vs `ClaudeSDKClient` (multi-turn) · `allowed_tools` = auto-approve · `disallowed_tools` = deny · `permission_mode` · `can_use_tool` · `setting_sources` · `mcp_servers` · `@tool` + `create_sdk_mcp_server` → `mcp__server__tool` · `hooks={"PreToolUse": [HookMatcher(...)]}` · `resume` / `fork_session` · `max_turns`, `max_budget_usd` · `ResultMessage.total_cost_usd`.

## Workflow patterns

| Pattern | Signal in the question |
|---|---|
| Prompt chaining | fixed sequential steps, gates between |
| Routing | distinct input categories / cheap vs. expensive model |
| Parallelization – sectioning | independent different subtasks at once (e.g., answer + guardrail) |
| Parallelization – voting | same task N times for consensus |
| Orchestrator-workers | subtasks **unknown in advance**, decided at runtime |
| Evaluator-optimizer | clear criteria, iterative refinement |
| Agent | open-ended, unpredictable steps, environment feedback |

Should it be an agent? **Complexity · Value · Viability · Cost of error**.

## Claude Code

**CLAUDE.md**: managed → `~/.claude/CLAUDE.md` → `./CLAUDE.md` or `./.claude/CLAUDE.md` → `./CLAUDE.local.md`. Ancestors at launch, subdirectories on demand, concatenated. `@imports` (≤ 4 hops). `.claude/rules/*.md` with `paths:`. Target < 200 lines. Context, **not enforcement**.

**settings.json precedence**: managed → CLI `--settings` → `.claude/settings.local.json` → `.claude/settings.json` → `~/.claude/settings.json`. Lists merge. Rules evaluated **deny → ask → allow**.

| Permission mode | |
|---|---|
| `default` | ask on first use |
| `acceptEdits` | auto-accept edits + common fs commands |
| `plan` | read-only planning |
| `auto` | classifier reviews actions instead of prompts |
| `dontAsk` | deny anything that would prompt |
| `bypassPermissions` | skip prompts — isolated sandboxes only |

Rule syntax: `Bash(npm run test *)` · `Read(./.env)` · `Edit(src/**)` · `WebFetch(domain:x.com)` · `mcp__github__*`.

Components: **rules** (CLAUDE.md) · **skills** (`SKILL.md`, on demand; `disable-model-invocation`, `allowed-tools`, `context: fork`, `$ARGUMENTS`, `` !`cmd` ``) · **commands** (`.claude/commands/*.md` = skills) · **subagents** (`.claude/agents/*.md`: name, description, tools, model; own context) · **memory** (auto memory) · **hooks** · **MCP** (`.mcp.json`) · **plugins** (`.claude-plugin/plugin.json`, `/plugin-name:skill`).

Commands: `/init` `/memory` `/clear` `/compact` `/context` `/rewind` `/resume` `/model` `/effort` `/config` `/status` `/permissions` `/hooks` `/agents` `/mcp` `/plugin` `/review` `/security-review` `/doctor`.

Headless: `claude -p "…" --output-format text|json|stream-json [--verbose --include-partial-messages] --allowedTools … --permission-mode … --max-turns N --json-schema … --resume <id> --bare`. Streaming input: `--input-format stream-json`.

Sessions: `--continue` / `-c`, `--resume` / `-r`, `--fork-session`, `/clear`, `/compact [focus]`, `/rewind`.

## Hooks

Events: `PreToolUse` (block/modify) · `PermissionRequest` · `PostToolUse` (format/lint/audit) · `UserPromptSubmit` · `Stop`/`SubagentStop` (block finishing) · `SessionStart` · `PreCompact` · `Notification` · `SessionEnd` …
Config: event → `matcher` (tool name/regex) → handlers (`command`, `http`, `mcp_tool`, `prompt`, `agent`). Input: JSON on **stdin**.
Exit **0** = ok (JSON on stdout optional) · **2 = block** (stderr → Claude) · other = non-blocking error.
JSON: `hookSpecificOutput.permissionDecision: allow | deny | ask` (+ reason), `updatedInput`, `additionalContext`; `decision: "block"` (Stop etc.); `continue: false` + `stopReason`.

## MCP

Host → client (1 per server) → server. JSON-RPC 2.0. Transports: **stdio** (local subprocess; **stdout = protocol, log to stderr**) · **Streamable HTTP** (remote, OAuth) · legacy HTTP+SSE.
Lifecycle (classic): `initialize` → capabilities → `notifications/initialized` → `*/list`, `tools/call`, `resources/read`, `prompts/get`; `list_changed` notifications.

| Primitive | Controlled by | |
|---|---|---|
| Tools | model | actions |
| Resources | application | read-only context (URIs, templates) |
| Prompts | user | templates / slash commands |

Client features: elicitation, roots, (sampling — deprecated in newest spec). Author with the official SDKs (Python `MCPServer`/legacy `FastMCP` + `@mcp.tool()`; TypeScript `McpServer.registerTool`). Test with **MCP Inspector**. Claude Code: `claude mcp add --transport stdio|http`, scopes local/project(`.mcp.json`)/user, tools `mcp__server__tool`. API: **MCP connector** (`mcp_servers` + `mcp_toolset`, remote only).

## Customization decision

| Need | Use |
|---|---|
| Generic capability (web, code exec, files) | built-in tool |
| App-specific action/data in one app | custom tool |
| Reusable integration, independent maintenance | MCP server |
| Procedure / expertise / templates on demand | Skill |
| Always-true project facts | CLAUDE.md / rules |
| Isolation, parallel work, specialist | subagent |
| Must-always/must-never | hook / permission rule |
| Distribute bundles | plugin |

## Cost & caching

| Token type | × base input |
|---|---|
| Cache write 5 min | **1.25×** |
| Cache write 1 h | **2×** |
| Cache read | **~0.1×** |
| Batch | **0.5×** everything |
| Output | ≈ 5× input price |

- Prefix order **tools → system → messages**; any byte change invalidates everything after. **≤ 4 breakpoints**; model-specific minimum length; TTL refreshed on hit; per workspace and per model.
- Break-even: 5-min TTL from the **2nd** request; 1-h TTL from the **3rd**.
- Invalidators: timestamps/IDs early, unsorted JSON, varying tools, model switch, thinking/effort toggles, history edits.
- **Check-pointing**: breakpoints at stability boundaries (tools/system → docs → conversation); move the last one forward each turn.
- Lever order: caching · trimming · output hygiene · batches → effort · model tier · routing.

## Models

| Tier | Use |
|---|---|
| Haiku | high volume, low latency, classification, routing, sub-agents |
| Sonnet | balanced default for most production & coding |
| Opus | complex reasoning, long-horizon agents, orchestrators |
| Fable (top) | most demanding work where quality ≫ cost |

Choose by **cost per completed task** on **your evals**. Upgrades: removed params, tokenizer changes, new stop reasons, changed defaults, behavior shifts → eval, re-tune, canary, rollback ready. Adaptive thinking: 4.6+; budget thinking: older.

## Errors

| | Retry? |
|---|---|
| 400 invalid_request · 401 auth · 402 billing · 403 permission · 404 not_found · 413 too large | **No** — fix |
| 429 rate_limit (honor `retry-after`) · 500 api_error · **529 overloaded** · network | **Yes** — backoff + jitter |

SDKs retry 408/409/429/5xx/connection **2×** by default. Catch typed exceptions most-specific-first. Log request IDs. Isolate: replay the exact request → correct? bug is downstream (integration) : check request assembly → then model behavior.

## Prompting

Clear & specific (who/what/why/format/length) · role in **system**, data in **user** (XML-tagged) · 3–5 diverse examples in `<example>` · long docs **top**, question **bottom** · ask for quotes first · step-by-step or adaptive thinking · prompt chaining · one change at a time with evals · newer models are literal → drop SHOUTING · sanitize inputs (length, control/zero-width chars, escape delimiters).

## Security

Injection: direct & **indirect** · lethal trifecta (private data + untrusted content + exfiltration) → break a leg · least privilege · approvals · deterministic gates · output encoding · RAG ACLs at retrieval · PII minimization/redaction · secrets never in prompts/clients/repos · per-env keys & workspaces with spend limits · delegated user-scoped credentials · OAuth for remote MCP · monitor usage and audit logs · revoke-then-rotate on leaks.
