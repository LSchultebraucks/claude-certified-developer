Q: Workflow vs. agent — what is the defining difference?
A: In a **workflow**, LLM calls and tools follow predefined code paths. In an **agent**, the LLM dynamically directs its own process and tool usage.
@1.1

Q: The four criteria for deciding whether a task justifies an agent?
A: **Complexity** (hard to specify in advance), **value** (justifies cost/latency), **viability** (Claude can do it), **cost of error** (errors can be caught and recovered).
@1.1

Q: Name the five workflow patterns.
A: Prompt chaining · routing · parallelization (sectioning / voting) · orchestrator-workers · evaluator-optimizer.
@1.1

Q: Parallelization vs. orchestrator-workers — how do you tell them apart?
A: Parallelization: subtasks are **predefined in code**. Orchestrator-workers: an LLM **decides the subtasks at runtime** based on the input.
@1.1

Q: Sectioning vs. voting?
A: Sectioning runs **different** independent subtasks in parallel; voting runs the **same** task several times for consensus or confidence.
@1.1

Q: What do subagents improve, and what do they cost?
A: Improve: context isolation, parallelism, specialization, cheaper models for subtasks, least privilege. Cost: more total tokens, coordination overhead, lost detail in summaries; each starts with a fresh context.
@1.1

Q: A subagent lacks facts the orchestrator had. Fix?
A: Pass the needed facts, constraints and output format **explicitly in the delegation prompt** — subagents don't inherit the parent's conversation.
@1.1

Q: What is the authoritative signal for agent loop control?
A: `stop_reason` — continue on `tool_use`, finish on `end_turn` (handle `max_tokens`, `pause_turn`, `refusal` too). Not text content, not phrases, not iteration caps.
@1.2

Q: Tool Runner vs. Agent SDK vs. Managed Agents?
A: **Tool Runner**: client-SDK helper looping over *your* tools (self-hosted). **Agent SDK**: Claude Code harness with built-in tools, hooks, sessions, subagents (self-hosted). **Managed Agents**: Anthropic runs the loop *and* hosts per-session sandboxes.
@1.2

Q: Agent SDK: `query()` vs. `ClaudeSDKClient`?
A: `query()` = one-off task, new session each call. `ClaudeSDKClient` = continuous multi-turn conversation in one session, with interrupt support.
@1.2

Q: Agent SDK: what does `allowed_tools` do — and what doesn't it do?
A: It **auto-approves** listed tools without prompting. It does not by itself remove other tools — use `disallowed_tools` (or the `tools` option) for that.
@1.2

Q: How are custom tools added in the Python Agent SDK, and how are they named?
A: `@tool(name, description, schema)` functions bundled with `create_sdk_mcp_server(...)`, passed via `mcp_servers`; named `mcp__<server>__<tool>`.
@1.2

Q: How do you continue an earlier Agent SDK session?
A: Pass its `session_id` as `resume` (optionally `fork_session=True` to branch), or `continue_conversation=True` for the most recent.
@1.2

Q: Where must all tool results for one assistant turn go?
A: Into **one user message** containing a `tool_result` for **every** `tool_use_id`.
@1.2

Q: Name four context-window management techniques for agents.
A: Tool-output pruning · context editing (clear old tool results/thinking) · compaction (summarize) · subagent isolation · external memory/notes.
@1.3

Q: How does the memory tool work?
A: Client-side tool (`memory_20250818`): Claude issues view/create/str_replace/insert/delete/rename commands on `/memories`; **your app implements storage** (validate paths, isolate users, no secrets).
@1.3

Q: LangGraph, PydanticAI, Strands — one line each.
A: **LangGraph**: graph/state-machine workflows with checkpointers and human-in-the-loop interrupts. **PydanticAI**: type-safe Python agents with validated structured outputs and DI. **Strands**: AWS's model-driven agent SDK (model + tools + prompt).
@1.3

Q: Main risk of heavy agent frameworks?
A: Abstractions obscure the actual prompts/responses, complicate debugging and lag behind new API features. Understand what's sent to the model.
@1.3

Q: Functional vs. infrastructure requirements — examples?
A: Functional: what it does (classify into 7 categories with ≥95% accuracy, JSON output). Infrastructure/non-functional: latency, throughput, residency, retention, availability, cost, security, compliance.
@2.1

Q: What should come before any prompt engineering?
A: Specific, measurable **success criteria** and an **eval set** to measure them.
@2.1

Q: Requirement "must stay in the EU" — design response?
A: Choose the processing geography (e.g., inference geography on the Claude API or an EU region on Bedrock/Vertex/Foundry) and review retention terms.
@2.1

Q: Shadow vs. canary vs. A/B?
A: **Shadow**: new version sees copied traffic, outputs not shown. **Canary**: small % of real users, expand gradually. **A/B**: split users to compare business metrics.
@2.2

Q: What happens when a model is deprecated?
A: A retirement date is announced; the model still works until retired. Migrate deliberately: evals on the replacement, prompt re-tuning, staged rollout, rollback ready.
@2.2

Q: Which grader type is fastest and most reliable when outputs are objectively checkable?
A: **Code-based** grading (exact match, schema validation, unit tests).
@2.2

Q: Required fields of a Messages API request?
A: `model`, `max_tokens`, `messages` (+ headers `x-api-key`, `anthropic-version`).
@2.3

Q: Where does the initial system prompt go?
A: The top-level `system` parameter — not a `system` role message at `messages[0]`.
@2.3

Q: List the stop reasons and their handling.
A: `end_turn` done · `tool_use` run tools · `max_tokens` truncated · `stop_sequence` custom stop · `pause_turn` resend to continue · `refusal` safety decline · `model_context_window_exceeded` window full.
@2.3

Q: Order of streaming events?
A: `message_start` → `content_block_start` → `content_block_delta` (text_delta / input_json_delta / thinking_delta) → `content_block_stop` → `message_delta` (stop_reason, usage) → `message_stop`; `ping` anywhere; `error` possible mid-stream.
@2.3

Q: Message Batches API key facts?
A: 50% cheaper · ≤ 100,000 requests / 256 MB · most < 1 h, max 24 h · results in any order → match `custom_id` · results retained 29 days.
@2.3

Q: Realtime vs. batch — decision rule?
A: User waiting or each step depends on the previous result → realtime (+ streaming). Large, latency-tolerant, cost-sensitive → Batches.
@2.3

Q: Why does a chatbot "forget" earlier turns?
A: The Messages API is **stateless**; the app must resend the history (or a summary) every request.
@2.3

Q: How do you calculate total input tokens with caching?
A: `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`.
@2.3

Q: What replaces assistant prefill on current models?
A: Structured outputs (`output_config.format` / `messages.parse()`) or system-prompt format instructions — prefill returns 400.
@2.3

Q: Third-party platforms for Claude and one caveat?
A: Amazon Bedrock, Google Vertex AI, Microsoft Foundry (plus Claude API). Same Messages shape, but **feature availability, auth and model IDs differ**.
@2.3

Q: Which HTTP methods are idempotent?
A: GET, PUT, DELETE (and HEAD/OPTIONS). POST is not — use idempotency keys for safe retries.
@2.4

Q: How do you fan out 10,000 async API calls safely?
A: Bounded concurrency (semaphore/worker pool), backoff on 429, `return_exceptions=True` — or use the Batches API.
@2.4

Q: Large refactor with Claude Code — the recommended process?
A: Plan (plan mode, plan file) → pilot on a few files → fan out (subagents / headless loop / worktrees) → verify with tests per batch → small reviewable PRs.
@2.4

Q: First step after an API key is pushed to a public repo?
A: **Revoke/rotate** the key immediately; then clean history and add secret scanning.
@2.4

Q: Strangler fig pattern?
A: Replace a legacy system incrementally by routing features one by one to the new implementation until the old one can be removed.
@2.4

Q: Claude's principal hierarchy?
A: Anthropic policies → operator (system prompt) → user. Tool results, documents and web content are **data**, not instructions.
@2.5

Q: Why may the same prompt behave differently in claude.ai and the API?
A: claude.ai adds Anthropic's product system prompt, features, memory and tools; the API has none of that — the operator must specify everything.
@2.5

Q: Content boundary best practices?
A: XML-tag untrusted inputs, state they're data, escape delimiter-like sequences, never put them in the system prompt, least-privilege tools, treat output as untrusted downstream.
@2.5

Q: Schema design to avoid hallucinated values?
A: Allow `null`/"unknown", use enums, describe every field (units/formats), `additionalProperties: false`, only truly required fields required.
@2.5

Q: Session hygiene in Claude Code?
A: One task per session, `/clear` between unrelated tasks, `/compact` with focus, subagents for exploration, `/rewind` on wrong turns, `/context` to inspect.
@2.5

Q: Plugin anatomy?
A: `.claude-plugin/plugin.json` (name required; version, description, dependencies, userConfig) + `skills/`, `commands/`, `agents/`, `hooks/hooks.json`, `.mcp.json`, `.lsp.json`. Components namespaced `/plugin-name:skill`.
@2.5

Q: Plugin install scopes?
A: **User** (you, all projects) · **project** (everyone, via committed `.claude/settings.json`) · **local** (you, this repo).
@2.5

Q: Claude Code settings precedence (high → low)?
A: Managed → CLI `--settings` → `.claude/settings.local.json` → `.claude/settings.json` → `~/.claude/settings.json`. Lists merge.
@2.6

Q: Permission rule evaluation order?
A: **deny → ask → allow**; first match wins. An allow can't override a deny.
@2.6

Q: CLAUDE.md loading rules?
A: Ancestors of the working directory at launch, subdirectories on demand; concatenated (broad → specific); `@imports` up to 4 hops; `.claude/rules/` with `paths:`; keep < 200 lines.
@2.6

Q: Guidance vs. enforcement in Claude Code?
A: CLAUDE.md = guidance (context). Permissions, hooks, sandbox, managed settings = enforcement.
@2.6

Q: How to keep secrets out of `.mcp.json`?
A: Environment-variable expansion: `${TOKEN}` / `${VAR:-default}`.
@2.6

Q: How do you make model behavior reproducible in production?
A: Pin a specific model ID in config, log it per request, upgrade deliberately with evals and staged rollout.
@2.6

Q: Claude Code components and what each is for?
A: Rules/CLAUDE.md (always-true facts) · skills (on-demand procedures) · commands (user-triggered) · subagents (isolated specialists) · memory · hooks (deterministic automation) · MCP (external systems) · plugins (distribution).
@3.1

Q: Permission modes?
A: default (ask) · acceptEdits · plan (read-only) · auto (classifier reviews) · dontAsk (deny prompts) · bypassPermissions (sandboxes only).
@3.1

Q: Headless output formats?
A: `--output-format text` (default) · `json` (result, session_id, cost, usage) · `stream-json` (NDJSON events; with `--verbose`, `--include-partial-messages`).
@3.1

Q: What does `--bare` do?
A: Skips auto-discovery of hooks, skills, plugins, MCP servers, auto memory and CLAUDE.md → reproducible CI runs; pass config explicitly.
@3.1

Q: Session commands/flags?
A: `--continue`/`-c` (latest) · `--resume`/`-r` (pick/ID) · `--fork-session` · `/clear` · `/compact` · `/rewind` · `/resume`.
@3.1

Q: What does `/init` do?
A: Analyzes the repo and creates (or suggests improvements to) CLAUDE.md with build/test commands and conventions.
@3.1

Q: Which errors are retryable?
A: 429, 500, 529 (overloaded), network/timeouts (SDKs also retry 408/409). Not 400, 401, 402, 403, 404, 413.
@4.1

Q: How do you isolate integration vs. model problems?
A: Capture and replay the exact request. Correct raw output → bug downstream (parsing/rendering). Wrong request → assembly bug. Correct request + wrong output → model behavior (prompt/context/model).
@4.1

Q: JSON fails to parse only on long outputs — first check?
A: `stop_reason == "max_tokens"` → truncation.
@4.1

Q: How should a tool failure be returned?
A: `tool_result` with `is_error: true` and an actionable message (what failed, how to fix).
@4.1

Q: How to handle `stop_reason: "refusal"`?
A: HTTP 200 safety decline: don't run that turn's tools or use partial output; show a graceful message; fall back (fallback model / human).
@4.1

Q: Context window — what does it include?
A: Input (system, tools, messages) **plus** generated output including thinking.
@5.1

Q: Does temperature 0 guarantee identical outputs?
A: No. Outputs remain non-deterministic; newest models reject sampling params anyway. Use structured outputs, code and caching for determinism.
@5.1

Q: Adaptive thinking vs. budget thinking?
A: Adaptive (`{"type":"adaptive"}`, 4.6+): model decides how much to think; steer with effort. Budget (`budget_tokens` ≥1024, < max_tokens): legacy models.
@5.1

Q: Effort levels and their use?
A: `low` (simple, high-volume, subagents) · `medium` (cost saving) · `high` (common default) · `xhigh` (coding/agentic) · `max` (correctness over cost).
@5.1

Q: Fast mode?
A: Research preview on supported Opus models: same model, much faster output, premium price; `speed: "fast"` + beta header; Claude API only.
@5.1

Q: Zero-, one-, few-shot?
A: No examples · one example · several (3–5) diverse examples.
@5.1

Q: Is thinking free when its display is omitted?
A: No — thinking is billed as output tokens regardless of display.
@5.1

Q: Which transport does Claude streaming use?
A: Server-sent events (SSE) over HTTP — not WebSockets.
@5.2

Q: When choose WebSockets for your own app?
A: Bidirectional, low-latency, persistent interaction (voice, interruptions, collaboration). SSE suffices for one-way token streaming.
@5.2

Q: SDK default retries and timeout?
A: 2 retries with exponential backoff (connection errors, 408, 409, 429, 5xx); 10-minute default timeout. Python timeout in seconds, TypeScript in **milliseconds**.
@5.2

Q: Secure way to stream Claude to a browser?
A: Browser ↔ your backend (session auth, SSE/WebSocket); backend ↔ Claude with the API key. Cancel upstream on client disconnect.
@5.2

Q: Why reuse one SDK client instance?
A: Connection pooling and consistent retry/timeout config; creating a client per request wastes connections.
@5.2

Q: Haiku vs. Sonnet vs. Opus — when?
A: Haiku: high volume, low latency, classification/routing/sub-agents. Sonnet: balanced default for most production & coding. Opus (and top-tier Fable): complex reasoning, long-horizon agents, orchestrators.
@5.3

Q: How to compare model cost properly?
A: **Cost per completed task** (all turns, retries, fixes) on your own evals — not price per token.
@5.3

Q: Typical breaking changes between model generations?
A: Removed params (sampling, budget_tokens, prefill, forced tool_choice) · tokenizer changes · new stop reasons · changed defaults (effort, thinking display) · behavior shifts (more literal).
@5.3

Q: Cache pricing multipliers?
A: Write 5-min: **1.25×** · write 1-h: **2×** · read: **~0.1×** base input. Batches: 0.5× everything.
@5.4

Q: Cache break-even points?
A: 5-minute TTL: from the 2nd request (1.25 + 0.1 < 2). 1-hour TTL: from the 3rd (2 + 0.2 < 3).
@5.4

Q: Prompt cache render order and limits?
A: tools → system → messages; exact prefix match; max 4 breakpoints; model-specific minimum length; per workspace and per model; TTL refreshed on hit.
@5.4

Q: Common silent cache invalidators?
A: Timestamps/IDs early in the prompt · unsorted JSON · varying/reordered tools · model switch · toggling thinking/effort · editing earlier messages.
@5.4

Q: What is cache check-pointing?
A: Breakpoints at stability boundaries (tools+system / docs / conversation) and moving the last breakpoint forward each turn so every request reads the prior prefix.
@5.4

Q: Cost with $3/MTok in, $15/MTok out for 10K in / 2K out?
A: 10,000×3/1M = $0.030 + 2,000×15/1M = $0.030 → **$0.060**.
@5.4

Q: Context drift vs. bloat?
A: **Bloat**: window filled with low-value tokens. **Drift**: focus moves away from original goals/constraints over a long session. Bloat feeds drift.
@6.1

Q: Context editing vs. compaction?
A: Editing **clears** stale tool results/thinking. Compaction **summarizes** history. Memory persists across sessions.
@6.1

Q: Where to place long documents and the question?
A: Documents (tagged, with metadata) at the **top**; instructions and question at the **end**. Ask for relevant quotes first.
@6.1

Q: System vs. user placement?
A: System: role, stable rules, tone, scope, global format. User: the task, data (tagged), per-request constraints.
@6.2

Q: Why drop "CRITICAL!!! ALWAYS…" on newer models?
A: Newer models follow instructions literally; aggressive emphasis causes over-triggering. Use calm, specific conditions.
@6.2

Q: Input sanitization steps?
A: Length caps · strip control/zero-width chars · escape delimiters · tag as data in the user turn · mask unneeded PII · optional injection pre-screen.
@6.2

Q: Structured outputs guarantee what — and not what?
A: Guarantee schema-valid **shape**; not factual correctness. Still validate business rules; handle refusal/max_tokens.
@6.3

Q: Defensive parsing rules?
A: Check stop_reason · select blocks by type · real JSON parsers · schema validation · handle missing fields · log raw output · never eval output.
@6.3

Q: Techniques against hallucination?
A: Allow "I don't know" · ground in documents · quotes/citations first · verify with tools · second-pass review · human review for high stakes.
@6.3

Q: Improper output handling risks?
A: XSS when rendering, SQL/command injection, path traversal, exfiltration via links/images, injection propagation to other agents.
@6.3

Q: The lethal trifecta?
A: Private data + untrusted content + ability to communicate externally. Break any leg (e.g., approval on outbound actions).
@7.1

Q: Where must authorization be enforced in a Claude app?
A: In code / data layer, server-side, per request with the user's identity — never in the prompt.
@7.1

Q: Data leakage paths to close?
A: System prompt leakage (no secrets in prompts) · cross-tenant history · over-broad RAG (ACL at retrieval) · output exfiltration · logs with PII.
@7.1

Q: Deterministic vs. probabilistic guardrails — examples?
A: Deterministic: permission rules, hooks, schemas, sandboxes, code checks. Probabilistic: prompts, examples, classifiers.
@7.2

Q: Guardrail layers?
A: Input (auth, limits, screening, redaction) · model call (system prompt, least-privilege tools) · actions (hooks, approvals, sandbox) · output (validation, encoding) · system (logging, monitoring, red-team, kill switch).
@7.2

Q: Safety pre-screen times out — what now?
A: **Fail closed** on high-risk paths (block/escalate), alert on failure rates.
@7.2

Q: Hook exit codes?
A: **0** success (JSON on stdout optional) · **2** block (stderr → Claude) · other non-zero = non-blocking error (action proceeds).
@7.3

Q: PreToolUse JSON decision fields?
A: `hookSpecificOutput.permissionDecision`: allow / deny / ask (+ `permissionDecisionReason`), `updatedInput` to rewrite args, `additionalContext`.
@7.3

Q: Which hook blocks finishing until tests pass?
A: A **Stop** hook returning `decision: "block"` with the failure as the reason.
@7.3

Q: Why can't PostToolUse prevent a destructive action?
A: It runs **after** the tool executed. Prevention needs PreToolUse or deny rules.
@7.3

Q: Where may API keys live?
A: Env vars injected at runtime, secret managers, CI secret stores, `apiKeyHelper`, vaults. Never in code, prompts, CLAUDE.md, clients or logs.
@7.4

Q: Why separate keys/workspaces per environment?
A: Contain blast radius, set per-workspace rate/spend limits, attribute cost, rotate independently.
@7.4

Q: How should agents access user data in third-party systems?
A: With the **user's delegated, scoped credentials** (OAuth), not a shared admin account.
@7.4

Q: Leaked key runbook?
A: Revoke → rotate → check usage/audit logs → notify → fix root cause (secret scanning).
@7.4

Q: Elements of a good tool definition?
A: Descriptive name · rich description (what, when/when not, returns, limits) · typed schema with enums/descriptions · `strict: true` · optional examples.
@8.1

Q: `tool_choice` options?
A: `auto` (default) · `any` · `tool` (forced — rejected on newest models) · `none` · plus `disable_parallel_tool_use`.
@8.1

Q: Client vs. server tools?
A: Client: your app executes (custom, bash, text editor, memory, computer use). Server: Anthropic executes (web search, web fetch, code execution, tool search).
@8.1

Q: Tool set best practices?
A: Fewer task-shaped tools · no overlap · namespacing · concise high-signal results · actionable errors · tool search for large catalogs · approvals for side effects.
@8.1

Q: MCP participants?
A: Host (AI app) → one client per server → server (exposes tools/resources/prompts).
@8.2

Q: MCP primitives and controllers?
A: Tools — model-controlled · Resources — application-controlled · Prompts — user-controlled.
@8.2

Q: MCP transports?
A: **stdio** (local subprocess; stdout = protocol, log to stderr) · **Streamable HTTP** (remote, OAuth) · legacy HTTP+SSE.
@8.2

Q: Classic MCP lifecycle?
A: `initialize` (version + capabilities) → server capabilities → `notifications/initialized` → list/call/read/get; `list_changed` notifications.
@8.2

Q: How to test an MCP server?
A: **MCP Inspector**; in Claude Code `/mcp` and `--debug`.
@8.2

Q: How to add an MCP server to Claude Code?
A: `claude mcp add --transport stdio|http …` with scope local/project(`.mcp.json`)/user; tools become `mcp__server__tool`.
@8.2

Q: Built-in tool vs. custom tool vs. Skill vs. MCP?
A: Built-in: generic capability Anthropic provides. Custom tool: app-specific action in one app. Skill: procedural know-how loaded on demand. MCP: reusable integration across apps, independently maintained.
@8.3

Q: Claude has access but does the task "not our way" — what to add?
A: A **Skill** (procedures, templates, checklists, scripts) — the gap is know-how, not capability.
@8.3
