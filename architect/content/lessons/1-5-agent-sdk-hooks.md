---
skill: 1.5
title: Agent SDK Hooks
summary: Intercepting tool calls with PreToolUse and PostToolUse hooks — blocking policy violations, redirecting to escalation, normalising heterogeneous tool data — and choosing hooks over prompts when guarantees are needed.
sources: Agent SDK: Hooks | https://code.claude.com/docs/en/agent-sdk/hooks; Claude Code hooks reference | https://code.claude.com/docs/en/hooks; Hooks guide | https://code.claude.com/docs/en/hooks-guide; Agent SDK Python reference | https://code.claude.com/docs/en/agent-sdk/python
---

## What you need to know

Hooks are **your code**, invoked by the agent harness at defined lifecycle events. Because they run outside the model, they are **deterministic**: they fire every time, and their decision is final. The two events the exam focuses on:

| Event | Fires | Typical use |
|---|---|---|
| **PreToolUse** | After Claude requests a tool, **before** it runs | Block or modify calls that violate policy; redirect to another path (escalation); require approval |
| **PostToolUse** | **After** a tool returns, before Claude sees the result | Normalise formats, strip noise, enrich, redact, validate, log |

Other events exist (UserPromptSubmit, Stop, SubagentStop, PreCompact, SessionStart …), but tool interception is the core of this task statement.

## Blocking and redirecting: PreToolUse

```python PreToolUse hook — refund policy
async def refund_policy(input_data, tool_use_id, context):
    if input_data["tool_name"] != "mcp__billing__process_refund":
        return {}
    amount = input_data["tool_input"]["amount"]
    if amount > 500:
        return {"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason":
                "Refunds over $500 need human approval. Call escalate_to_human "
                "with the case summary instead."}}
    return {}

options = ClaudeAgentOptions(hooks={
    "PreToolUse": [HookMatcher(matcher="mcp__billing__process_refund", hooks=[refund_policy])]})
```

The **reason** is returned to Claude, so the agent changes course (escalates) rather than retrying. That is the "redirect" part of the pattern.

## Normalising data: PostToolUse

Real systems are messy: one MCP server returns Unix timestamps, another ISO 8601, a legacy API `"03/04/26"`; status codes are numeric in one system and strings in another. Asking the model to interpret every variant wastes tokens and invites mistakes (is `03/04` March 4 or April 3?).

```python PostToolUse hook — normalise dates and statuses
async def normalize(input_data, tool_use_id, context):
    result = input_data["tool_response"]
    result = convert_dates_to_iso(result)          # 1709337600 / "03/04/26" → "2024-03-02"
    result = map_status_codes(result)              # 3 → "shipped"
    return {"hookSpecificOutput": {"hookEventName": "PostToolUse",
                                   "additionalContext": json.dumps(result)}}
```

Normalising in a hook gives the model **one consistent representation**, and the logic is testable code instead of prompt text. (`additionalContext` adds the normalised view next to the raw result; for MCP tools, Claude Code hooks can also replace the output outright with `updatedMCPToolOutput`. If you own the tool, normalising at the source is simplest of all.)

## Hooks vs. prompts vs. tool changes

| Requirement | Best mechanism |
|---|---|
| Must hold every time (limits, compliance, identity) | **Hook** or gate in the tool |
| Can't modify the tool (third-party MCP server) | **Hook** around it |
| Consistent data format across tools | **PostToolUse** hook (or fix at source if you own it) |
| Preference / style / approach | Prompt or CLAUDE.md |

:::compare Claude Code hooks vs. Agent SDK hooks
Same idea, different packaging. In **Claude Code** hooks are shell commands configured in `settings.json` (exit code 2 blocks a PreToolUse call). In the **Agent SDK** they are callback functions registered in `ClaudeAgentOptions(hooks=...)`. The exam expects you to pick "hook" as the mechanism; the syntax details matter less.
:::

## Exam traps

:::trap Adding "never refund more than $500" to the system prompt
Probabilistic. A PreToolUse hook that denies the call is deterministic.
:::

:::trap Asking the model to "convert all dates to ISO before reasoning"
Costs tokens on every call and still fails sometimes. Normalise in a PostToolUse hook.
:::

:::trap Blocking without guidance
A deny without a reason makes Claude retry the same call. Always say what to do instead.
:::

## Practice questions

{{quiz:a1-hook-01}}

{{quiz:a1-hook-02}}

## Build exercise

:::exercise Two hooks for the support agent
1. Wrap your billing tools in an MCP server (or SDK tools) and register a **PreToolUse** hook that denies refunds above a limit with a redirecting reason.
2. Make `lookup_order` return dates in three different formats; add a **PostToolUse** hook that normalises them to ISO 8601.
3. Write unit tests for both hook functions — they're plain code.
4. Run a conversation that asks for a $750 refund and confirm the agent escalates instead of retrying.
:::
