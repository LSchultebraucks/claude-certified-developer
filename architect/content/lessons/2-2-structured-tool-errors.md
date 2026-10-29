---
skill: 2.2
title: Structured Error Responses for MCP Tools
summary: The isError flag, error categories that tell the agent whether to retry, distinguishing "no results" from "lookup failed", and recovering locally before propagating to the coordinator.
sources: MCP — Server concepts | https://modelcontextprotocol.io/docs/learn/server-concepts; Writing effective tools for agents — Anthropic | https://www.anthropic.com/engineering/writing-tools-for-agents; How to implement tool use | https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use; Errors (Claude API) | https://platform.claude.com/docs/en/api/errors
---

## What you need to know

Agents recover from errors only as well as the errors describe themselves. A tool that returns `"Operation failed"` gives Claude nothing to work with; one that says **what kind** of failure happened, **whether retrying can help**, and **what to do instead** lets the agent self-correct.

In MCP, a tool result sets **`isError: true`** to signal failure (in the raw Messages API the equivalent is `is_error: true` on the `tool_result`). The content of the error is yours to design.

## Error categories

| Category | Examples | Retryable? | Agent should |
|---|---|---|---|
| **Transient** | Timeout, 503, connection reset, rate limit | Yes | Retry with backoff (ideally inside the tool), then report |
| **Validation** | Malformed order ID, missing field, bad date | Yes, after fixing input | Correct the input or ask the user |
| **Business** | Refund exceeds policy, order already shipped | No | Explain to the user, offer alternatives, escalate |
| **Permission** | Not authorised, identity not verified | No | Escalate or complete the prerequisite |

```json structured error from an MCP tool
{
  "isError": true,
  "content": [{
    "type": "text",
    "text": "{\"errorCategory\": \"business\", \"isRetryable\": false, \"message\": \"Order ORD-1182 shipped on 2026-03-02 and can no longer be cancelled. A return can be started after delivery.\", \"suggestedAction\": \"offer_return\"}"
  }]
}
```

The human-readable message matters as much as the category: Claude will often relay it to the customer.

## Empty result ≠ failure

:::key The most-tested distinction in this task statement
- `search_orders(email)` **succeeded** and found nothing → return a normal result: `{"orders": [], "searched": "email=…"}`.
- `search_orders(email)` **failed** (database unreachable) → return an **error** with `isError: true`.

If a failure is returned as an empty list, the agent concludes "this customer has no orders" and acts on false information. If an empty result is returned as an error, the agent retries pointlessly or escalates.
:::

## Local recovery before propagation

In multi-agent systems, a subagent should handle what it can **locally** — retry transient failures, fix validation errors — and only propagate what it cannot resolve. When it does propagate, it returns **structured context**: failure type, what was attempted, partial results, alternatives (see 5.3). The coordinator then decides: retry elsewhere, continue with partial coverage, or escalate.

## Exam traps

:::trap Generic "Operation failed" errors
They prevent appropriate recovery. Categories + retryability + description.
:::

:::trap Retrying business or permission errors
"Refund exceeds limit" will fail every time. Retrying wastes turns and annoys the customer.
:::

:::trap Swallowing exceptions and returning `[]`
Silent failure presented as success — the worst option on almost every exam item.
:::

## Practice questions

{{quiz:a2-err-01}}

{{quiz:a2-err-02}}

## Build exercise

:::exercise Structured errors for an MCP server
1. Build a small MCP server with `lookup_order` and `process_refund` (Python `mcp` SDK, stdio transport).
2. Implement a `tool_error(category, retryable, message, **extra)` helper returning `isError: true` with a JSON body.
3. Simulate each category; check Claude's behaviour: retry for transient, corrected input for validation, explanation for business, escalation for permission.
4. Make one lookup return an empty list and one raise a connection error; confirm the agent treats them differently.
5. Compare with `tool_error` and its tests in `architect/exercises/`.
:::
