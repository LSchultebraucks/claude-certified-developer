---
skill: 8.1
title: Tool Implementation
summary: Function calling end to end — tool definitions and descriptions, tool_choice, parallel calls, results and errors, harness dispatch, client vs. server tools, approval patterns, and how to construct a good tool set.
sources: Tool use overview | https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview; Implement tool use | https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use; Writing tools for agents — Anthropic | https://www.anthropic.com/engineering/writing-tools-for-agents; Tool search tool | https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool; Programmatic tool calling | https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling
---

## What you need to know

Tools are how Claude acts on the world. Claude never executes a client tool itself: it **emits a structured request** (`tool_use`), **your harness executes it** and returns a `tool_result`. Exam questions test the mechanics, the description-writing craft, error handling, approval patterns and tool-set design.

## Anatomy of a tool definition

```json
{
  "name": "search_orders",
  "description": "Search a customer's orders by status and date range. Use this when the user asks about past or current orders, deliveries or returns. Returns at most 20 orders, newest first, each with order_id, status, total and created_at. Does not return payment details; use get_invoice for those.",
  "input_schema": {
    "type": "object",
    "properties": {
      "status": {"type": "string", "enum": ["pending", "shipped", "delivered", "returned"],
                 "description": "Filter by order status. Omit to include all."},
      "since":  {"type": "string", "format": "date", "description": "Earliest order date, ISO 8601 (YYYY-MM-DD)."},
      "limit":  {"type": "integer", "description": "Max results, 1-20. Default 10."}
    },
    "required": [],
    "additionalProperties": false
  },
  "strict": true
}
```

| Element | Purpose |
|---|---|
| `name` | Unique, descriptive, verb-based (`search_orders`, not `orders`); namespace related tools (`crm_search_contacts`, `crm_update_contact`) |
| `description` | **The most important part**: what it does, **when to use it (and when not)**, what it returns, limitations, side effects. Aim for at least 3–4 sentences for non-trivial tools |
| `input_schema` | JSON Schema: types, enums, formats, per-parameter descriptions, required fields |
| `strict: true` | Guarantees the `input` validates against the schema (requires `additionalProperties: false`) |
| `input_examples` | Optional example inputs to show correct usage for complex schemas |

## The tool-use flow

1. Request with `tools` (+ optional `tool_choice`).
2. Response `stop_reason: "tool_use"` with one or more `tool_use` blocks (`id`, `name`, `input`), possibly preceded by text.
3. Your harness validates and executes each call.
4. Send a **user** message with `tool_result` blocks (`tool_use_id`, `content`, optional `is_error`) — **all results in one message**, matching every `tool_use`.
5. Repeat until `stop_reason: "end_turn"`.

### `tool_choice`

| Value | Behavior |
|---|---|
| `{"type": "auto"}` (default) | Claude decides whether and which tools to use |
| `{"type": "any"}` | Must use at least one tool |
| `{"type": "tool", "name": "x"}` | Must use the named tool |
| `{"type": "none"}` | No tools this turn |
| `disable_parallel_tool_use: true` | At most one tool call per response |

Note: the newest models (Fable 5.1, Opus 5.5, Sonnet 5.5) reject forced `any`/`tool`; use `auto` + explicit prompt instruction, `strict: true`, or structured outputs instead — and verify a call was made.

### Parallel tool calls
Claude can request several independent calls in one turn. Execute them concurrently (when safe), and return **all results together in one user message**. Splitting results across messages degrades future parallel behavior.

## Tool results and error handling

```json
{"type": "tool_result", "tool_use_id": "toolu_01A…",
 "content": "No orders found with status 'returned' since 2026-01-01. The customer has 3 delivered orders; try status='delivered'.",
 "is_error": false}
```

```json
{"type": "tool_result", "tool_use_id": "toolu_01B…", "is_error": true,
 "content": "Invalid date '2026-13-01' for 'since'. Use YYYY-MM-DD, e.g. 2026-01-31."}
```

- Return **errors as `tool_result` with `is_error: true`** and an **actionable message** (what went wrong, how to fix it, valid examples) — Claude then retries or adapts. Don't crash the loop, don't drop the result, don't return empty strings.
- Distinguish **retryable** (timeout → "try again") from **permanent** (not found, permission denied) errors in the message.
- Results can be text, JSON, images or documents (content blocks).
- Keep results **token-efficient and high-signal**: relevant fields only, human-readable identifiers alongside opaque IDs, pagination/truncation with guidance ("showing 20 of 340; refine with `since`").
- **Validate inputs** before executing (types, ranges, authorization) — even with `strict`, business rules need checks.

## Agentic harness dispatch

The harness maps tool names to implementations, validates, executes, and returns results:

```python dispatch.py
TOOLS = {
    "search_orders": search_orders,     # registry: name → function
    "get_invoice":   get_invoice,
}
REQUIRES_APPROVAL = {"issue_refund", "delete_account"}

def execute(block, user):
    fn = TOOLS.get(block.name)
    if fn is None:
        return error(block.id, f"Unknown tool {block.name}")
    try:
        args = SCHEMAS[block.name].validate(block.input)          # validate first
        if block.name in REQUIRES_APPROVAL and not ask_human(user, block):
            return error(block.id, "The user declined this action.")
        return ok(block.id, fn(user=user, **args))                # run with the USER's permissions
    except ValidationError as e:
        return error(block.id, f"Invalid input: {e}")
    except TransientError as e:
        return error(block.id, f"Temporary failure, retry may succeed: {e}")
```

Responsibilities of the harness: registry/dispatch, validation, authorization (user context), timeouts, concurrency for parallel calls, approvals, logging/auditing, result formatting, loop control and limits. The **Tool Runner** and **Agent SDK** implement much of this for you.

## Client-side vs. server-side tools

| | Client tools | Server tools |
|---|---|---|
| Who executes | **Your application** | **Anthropic's infrastructure** |
| Examples | Your custom functions; Anthropic-defined client tools: bash, text editor, memory, computer use | Web search, web fetch, code execution, tool search, advisor |
| Definition | Custom: name/description/input_schema. Anthropic-defined: `type` + `name` only (schema is built in) | `type` (versioned, e.g. `web_search_…`) + `name`, optional config (`max_uses`, domain filters) |
| Flow | `tool_use` → you run it → `tool_result` | Runs inside the API call; results appear as `server_tool_use` + `*_tool_result` blocks; long loops may return `pause_turn` |
| You control | Execution environment, security, data access | Configuration (allowed/blocked domains, max uses); not the execution |

## Approval patterns

| Pattern | How | When |
|---|---|---|
| **Auto-execute** | Run immediately | Read-only, low-risk tools |
| **Human-in-the-loop confirmation** | Pause, show the proposed call (with arguments), execute only on approval | Irreversible / external effects: sending email, payments, deleting, deploying |
| **Policy-based auto-approval** | Code/hook decides (amount < €50 → auto; else ask) | Mixed-risk tools |
| **Two-phase (plan → execute)** | Agent proposes a plan or dry-run diff; human approves the whole plan | Batch changes, migrations |
| **Permission modes / rules** | Claude Code & Agent SDK `allow`/`ask`/`deny`, `can_use_tool` callbacks, PreToolUse hooks | Agent frameworks |

When a user declines, return a `tool_result` that says so — the model can then propose alternatives.

## Tool set construction best practices

- **Fewer, more capable tools** beat many thin wrappers: consolidate multi-step operations that are always done together (`schedule_event` that finds availability and books, instead of `list_users` + `list_events` + `create_event`).
- **Avoid overlapping tools** with ambiguous boundaries; if two tools could answer the same request, sharpen descriptions or merge them.
- **Namespace** by service/resource (`asana_search`, `jira_search`) when many tools coexist.
- **Return meaningful context**, not raw dumps; support a `response_format` (concise/detailed) when useful.
- **Design for the agent's workflow** (search before read; filters instead of listing everything).
- **Make errors instructive**.
- **Evaluate tools** with realistic tasks and read transcripts to improve descriptions.
- **Scale**: for very large tool libraries, use **tool search** (load definitions on demand, `defer_loading`) or MCP servers per domain; consider **programmatic tool calling** for many chained calls.
- **Security**: least privilege per tool, user-scoped credentials, approvals for side effects, treat tool outputs as untrusted.

## Exam traps

:::trap Vague one-line tool descriptions
"Gets data" gives Claude nothing to decide with. Descriptions should state purpose, when to use, inputs, outputs and limits.
:::

:::trap Raising exceptions out of the loop on tool failure
Return `is_error: true` with an actionable message so Claude can recover.
:::

:::trap Exposing 60 granular API endpoints as 60 tools
Too many overlapping tools confuse selection and waste context. Consolidate around tasks; use tool search for large catalogs.
:::

:::trap Executing write actions without confirmation because "the model is accurate"
Irreversible actions need approval gates regardless of model quality.
:::

## Practice questions

{{quiz:d8-tool-01}}

{{quiz:d8-tool-02}}

{{quiz:d8-tool-03}}

## Build exercise

:::exercise A well-designed tool set with approvals
1. Design 4 tools for a library system: `search_catalog`, `get_member_loans`, `renew_loan`, `cancel_reservation`. Write descriptions of 3–5 sentences each with when-to-use guidance, enums and formats; set `strict: true`.
2. Implement a dispatcher with a registry, schema validation, user-scoped authorization, and approval required for `cancel_reservation`.
3. Return actionable errors for invalid IDs and overdue-renewal rules.
4. Test with 15 realistic requests (including ambiguous ones). Read the transcripts; fix every wrong tool selection by editing descriptions only.
5. Add a server tool (web search restricted to your library's domain) and observe `server_tool_use` blocks.
6. Compare: merge `search_catalog` + `get_member_loans` into one tool where it makes sense, and measure turns/tokens per task.
:::
