---
title: Quick Reference
summary: One-page cheat sheets for the Architect exam — decision rules, patterns and anti-patterns, Agent SDK and Claude Code configuration, structured output and reliability.
---

## The ten decision rules

| If the scenario says… | The answer is usually… |
|---|---|
| "must always", "never", compliance, money, identity | **Deterministic control** — hook, prerequisite gate, permission rule, schema — not a stronger prompt |
| The model picks the wrong tool | Improve **tool descriptions** (purpose, inputs, when to use vs. the similar tool); rename/split overlapping tools |
| A subagent lacks information the coordinator had | **Pass it explicitly** in the delegation prompt — subagents don't inherit the parent's context |
| Output must be valid JSON for a downstream system | **Tool use with a JSON schema** (or structured outputs) — then validate semantics in code |
| The model invents values that aren't in the source | Make the field **optional/nullable** and allow "unclear"; don't force a value |
| Same session generated and reviewed the code | Use an **independent review instance** without the generator's reasoning |
| Overnight / weekly / non-blocking bulk job | **Message Batches API** (50% cheaper, up to 24 h). Blocking pre-merge check → synchronous |
| Customer asks for a human | **Escalate immediately** — don't try to resolve first |
| A subagent's call fails | Return **structured error context** to the coordinator; don't fake success, don't abort everything |
| Long session keeps forgetting numbers and dates | Keep a **persistent case-facts block**; don't rely on progressive summaries |

## Agentic loop

```python agentic loop — the shape the exam expects
messages = [{"role": "user", "content": task}]
while True:
    resp = client.messages.create(model=MODEL, max_tokens=4096, tools=TOOLS, messages=messages)
    messages.append({"role": "assistant", "content": resp.content})
    if resp.stop_reason != "tool_use":          # "end_turn" → done; anything else → handle explicitly
        break
    results = [run_tool(b) for b in resp.content if b.type == "tool_use"]
    messages.append({"role": "user", "content": results})   # tool_result blocks, matching tool_use_id
```

| `stop_reason` | Meaning | Loop action |
|---|---|---|
| `tool_use` | Claude wants tools executed | Run **all** requested tools, append results, call again |
| `end_turn` | Claude finished its turn | Exit the loop, return the answer |
| `max_tokens` | Output budget hit mid-response | Raise `max_tokens` or continue; don't treat as done |
| `pause_turn` | Server tool loop paused | Send the response back to let Claude continue |
| `refusal` | Claude declined | Surface/handle; don't retry blindly |

**Anti-patterns:** checking whether the reply "sounds finished", stopping when a text block appears, iteration caps as the *primary* stop signal (a cap is a safety net, not the control flow), dropping tool results from history.

## Multi-agent orchestration

- **Hub-and-spoke:** the coordinator decomposes, delegates, routes *all* communication, aggregates and decides whether to iterate. Subagents never talk to each other directly.
- **Isolation:** each subagent has its own context; it sees only its delegation prompt (+ its system prompt, tools, CLAUDE.md where applicable).
- **Parallelism:** emit several Task/Agent tool calls **in one response** to run subagents concurrently.
- **Context passing:** include prior findings, constraints, source metadata and the expected output format in the prompt; ask subagents to return **structured data with metadata** (source URL, date, confidence).
- **Coverage gaps** usually come from the **coordinator's decomposition** (too narrow), not from the subagents.

```python Agent SDK subagent definition (Python)
options = ClaudeAgentOptions(
    allowed_tools=["Task", "Read", "Grep", "Glob"],   # the coordinator needs the Task (Agent) tool to delegate
    agents={
        "web-researcher": AgentDefinition(
            description="Searches the web for sources on one sub-question. Use for fresh external facts.",
            prompt="Return JSON: [{claim, source_url, published, excerpt}]. Never summarize away dates.",
            tools=["WebSearch", "WebFetch"],
        ),
    },
)
```

## Enforcement and hooks

| Need | Mechanism |
|---|---|
| Identity verified before `process_refund` | **Prerequisite gate**: block the tool until `get_customer` returned a verified ID |
| Refunds above $500 must go to a human | **PreToolUse hook** that blocks and redirects to escalation |
| Tools return dates as Unix time, ISO and "MM/DD" | **PostToolUse hook** that normalizes before the model sees it |
| Tell the model the house style | Prompt / CLAUDE.md (guidance is fine when 100% isn't required) |

## Tool design and MCP

- Descriptions are the **primary selection signal**: purpose, input formats, example queries, edge cases, boundaries vs. similar tools.
- Split generic tools (`analyze_document` → `extract_data_points`, `summarize_content`, `verify_claim_against_source`); rename overlapping ones.
- 4–5 focused tools per agent beat 18; give cross-role agents a **narrow** extra tool for frequent needs.
- `tool_choice`: `{"type":"auto"}` may answer in text · `{"type":"any"}` must call *some* tool · `{"type":"tool","name":"x"}` must call *x*.

```json structured MCP tool error
{
  "isError": true,
  "content": [{ "type": "text", "text": "{\"errorCategory\":\"transient\",\"isRetryable\":true,\"message\":\"Order service timed out after 5s\",\"attempted\":\"lookup_order(ORD-1182)\"}" }]
}
```

| Category | Example | Agent should |
|---|---|---|
| Transient | Timeout, 503 | Retry (with backoff) |
| Validation | Bad order ID format | Fix input, retry |
| Business | Refund exceeds policy | Explain / escalate, **don't** retry |
| Permission | Not authorized | Escalate, **don't** retry |

**Empty ≠ failed:** "0 matching orders" is a successful result; "database unreachable" is an error. Never return `[]` for a failure.

| MCP config | Location | Shared? |
|---|---|---|
| Project scope | `.mcp.json` in the repo root | Yes — version-controlled |
| User scope | `~/.claude.json` | No — personal / experimental |
| Secrets | `"env": {"TOKEN": "${GITHUB_TOKEN}"}` | Expanded at runtime; never commit tokens |

## Built-in tools

| Tool | Use for |
|---|---|
| **Grep** | Search file *contents* (function callers, error strings, imports) |
| **Glob** | Find files by *path pattern* (`**/*.test.tsx`) |
| **Read / Write** | Load a file / write a whole file |
| **Edit** | Targeted change via a **unique** anchor string; if not unique → more context or Read + Write |
| **Bash** | Run commands, tests, builds |

## Claude Code configuration

| What | Where | Loaded |
|---|---|---|
| Personal preferences | `~/.claude/CLAUDE.md` | Always, only for you (not shared) |
| Team conventions | `CLAUDE.md` or `.claude/CLAUDE.md` | Always, everyone (version-controlled) |
| Package/area conventions | `<dir>/CLAUDE.md` | When working in that directory |
| Conventions by file type across dirs | `.claude/rules/*.md` with `paths:` globs | Only when matching files are touched |
| Modular includes | `@path/to/file.md` inside CLAUDE.md | With the including file |
| Team workflow on demand | `.claude/skills/<name>/SKILL.md` or `.claude/commands/*.md` | When invoked / relevant |
| Personal workflow | `~/.claude/skills/` or `~/.claude/commands/` | Only for you |

```markdown .claude/rules/testing.md
---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
---
Use Vitest and Testing Library. One behaviour per test. No snapshot tests for logic.
```

```markdown .claude/skills/review-api/SKILL.md
---
name: review-api
description: Review an API route against our REST conventions. Use when asked to review endpoints.
argument-hint: "[path to route file]"
allowed-tools: Read, Grep, Glob
context: fork
---
Review $ARGUMENTS against docs/api-conventions.md. Report only violations, with line numbers.
```

**Plan mode** → large, multi-file, architectural, ambiguous or risky changes. **Direct** → small, clear, single-file changes. **Explore subagent** → verbose discovery without filling the main context.

## Claude Code in CI/CD

```bash CI review step
claude -p "Review the diff in this PR against CLAUDE.md. Report only bugs and security issues." \
  --output-format json --json-schema "$(cat review-schema.json)" > review.json
```

- `-p` (`--print`) = non-interactive; without it the job waits for input.
- `--output-format json` (+ `--json-schema`) → machine-parseable findings for inline PR comments.
- Put review criteria and test conventions in **CLAUDE.md** so CI gets the same context as developers.
- Review with a **separate instance** from the one that generated the code; pass **previous findings** so re-runs report only new or unresolved issues.

## Structured output and extraction

- Tool use + JSON schema → no syntax errors. Still validate **semantics** (totals add up, dates plausible).
- Optional / nullable fields where the source may lack data; enums with `"other"` + detail string and `"unclear"`.
- Few-shot: 2–4 examples of **ambiguous** cases, showing the reasoning; vary document formats.
- **Retry with feedback:** send the document, the failed output and the specific validation error. Retries can't recover data that isn't in the source.
- Self-check fields: `calculated_total` vs `stated_total`, `conflict_detected`.

## Message Batches API

| Fact | Value |
|---|---|
| Cost | **50%** of standard pricing |
| Processing window | Up to **24 hours**; no latency SLA |
| Correlation | `custom_id` per request — results may come back in any order |
| Failures | Resubmit **only** failed `custom_id`s (fix e.g. oversized documents first) |
| Not suited for | Blocking workflows (pre-merge checks), multi-turn tool loops within one request |

## Reliability and context

- **Case facts block**: amounts, dates, order IDs, commitments — kept verbatim outside the summarized history.
- **Lost in the middle**: put key findings at the start; use section headers in long inputs.
- **Trim tool output** to the fields the task needs before it accumulates.
- **Escalate** on: explicit human request, policy gap/exception, no progress. **Not** on sentiment or the model's self-rated confidence alone.
- **Ambiguous match** (two customers named J. Smith) → ask for an identifier; never guess.
- **Human review**: measure accuracy per document type and field; stratified random sampling; calibrate confidence thresholds on a labeled set.
- **Provenance**: claim → source (URL/doc, excerpt, date). Conflicting figures → keep both, attributed; explain differing dates/methods.
