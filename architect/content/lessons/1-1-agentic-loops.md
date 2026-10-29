---
skill: 1.1
title: Agentic Loops
summary: The stop_reason-driven loop at the heart of every Claude agent — what continues it, what ends it, where tool results go, and the anti-patterns the exam uses as distractors.
sources: Handling stop reasons | https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons; How to implement tool use | https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use; Building effective agents — Anthropic | https://www.anthropic.com/engineering/building-effective-agents; Agent SDK overview | https://code.claude.com/docs/en/agent-sdk/overview
---

## What you need to know

Every Claude agent — whether hand-written against the Messages API or running inside the Agent SDK — is the same loop: **send the conversation, inspect why the model stopped, execute the tools it asked for, feed the results back, repeat**. The exam does not ask you to type this loop from memory; it asks you to recognise *correct* control flow and to spot the subtle bugs that make agents stop too early, run forever or reason about stale data.

:::key The control signal is `stop_reason`
- `"tool_use"` → Claude wants one or more tools executed. Run them, append the results, call the API again.
- `"end_turn"` → Claude has finished. Exit the loop and return the final answer.

Everything else is a special case you handle explicitly — never as "done by default".
:::

## The loop, step by step

```python manual agentic loop (Python SDK)
messages = [{"role": "user", "content": task}]
for turn in range(MAX_TURNS):                      # safety net, not the control flow
    resp = client.messages.create(model=MODEL, max_tokens=4096,
                                  system=SYSTEM, tools=TOOLS, messages=messages)
    messages.append({"role": "assistant", "content": resp.content})
    if resp.stop_reason == "end_turn":
        return final_text(resp)
    if resp.stop_reason != "tool_use":
        return handle_special(resp)                # max_tokens, pause_turn, refusal …
    results = []
    for block in resp.content:
        if block.type == "tool_use":
            out = execute(block.name, block.input)
            results.append({"type": "tool_result", "tool_use_id": block.id,
                            "content": out.text, "is_error": out.failed})
    messages.append({"role": "user", "content": results})
raise BudgetExceeded("agent did not finish within MAX_TURNS")
```

Four details carry most of the exam weight:

1. **The assistant turn is appended unchanged** — including its `tool_use` blocks. Results without the matching request are rejected by the API.
2. **All tool calls in a response are answered**, each with a `tool_result` whose `tool_use_id` matches. Claude may request several tools in one turn (parallel tool use); answer them in **one** user message.
3. **Tool results go back into the conversation history.** That is how the model "sees" the environment and decides the next step. An agent that executes tools but doesn't append results is reasoning blind.
4. **Errors are results too.** Return failures as `tool_result` with `is_error: true` and a useful message, so Claude can adapt — don't crash the loop and don't hide the failure.

## Other stop reasons

| `stop_reason` | What happened | Correct handling |
|---|---|---|
| `max_tokens` | Output hit the `max_tokens` limit mid-response | The answer (or a tool call) is **truncated**. Raise the limit or continue — never treat it as finished |
| `stop_sequence` | A custom stop sequence was produced | Application-specific |
| `pause_turn` | A long-running server-tool turn was paused | Send the assistant content back unchanged so Claude continues |
| `refusal` | Claude declined for safety reasons | Surface it; do not loop retrying the same request |
| `model_context_window_exceeded` | The context window filled | Compact/trim context, then continue |

## Anti-patterns the distractors are built from

:::trap Parsing natural language to decide completion
"Stop when the reply contains 'task complete'" or "stop when Claude stops mentioning tools" is fragile — wording varies, and Claude may explain its next tool call in prose. `stop_reason` is the contract.
:::

:::trap "Stop when a text block appears"
Claude often returns text **and** `tool_use` blocks in the same turn ("Let me check the order…"). Exiting on the first text block skips the requested tool call.
:::

:::trap An iteration cap as the primary stop condition
A `MAX_TURNS` limit is a good **safety net** against runaway loops and cost blow-ups. But an agent that "finishes" because it hit turn 10 has not finished — it was cut off. If a question offers "set max iterations to 10" as the fix for an agent that stops too early or too late, it's almost always the distractor.
:::

:::trap Rebuilding the prompt instead of appending
Some designs re-send only the original task plus the latest tool result. Claude then loses its own earlier reasoning and earlier results, repeats calls and contradicts itself. Keep the full history (and manage its size deliberately — see 5.1).
:::

## Model-driven vs. pre-configured decisions

In an agent loop, **Claude decides** which tool to call next based on the context — that is the point of an agent. Pre-configured decision trees ("always call A, then B, then C") belong in a workflow (see 1.6). Exam items often contrast the two: if the order of steps is genuinely fixed and known, a workflow is simpler and more reliable; if the next step depends on what the last step returned, the model-driven loop is right — with **hooks and gates** (1.4, 1.5) enforcing the few steps that must never be skipped.

:::scenario S1 — the agent stops after its first sentence
A support agent replies "I'll look up your order now." and the conversation ends without a lookup. Logs show `stop_reason: "tool_use"` on that response. The loop exits when it finds a text block. **Fix:** branch on `stop_reason`, not on content types.
:::

## Exam traps

:::remember Checklist for any loop question
- Does the loop continue on `tool_use` and stop on `end_turn`?
- Are **all** tool calls answered, with matching IDs, in one user message?
- Are results (including errors) **appended to history**?
- Is the iteration cap a **safety net** that raises/flags, not a silent "done"?
- Are `max_tokens` and other stop reasons handled explicitly?
:::

## Practice questions

{{quiz:a1-loop-01}}

{{quiz:a1-loop-02}}

## Build exercise

:::exercise Build a stop_reason-driven support agent loop
1. Define two tools: `lookup_order(order_id)` and `get_customer(email)`, backed by an in-memory dictionary.
2. Implement the loop above with the Messages API. Branch only on `stop_reason`.
3. Return an `is_error: true` tool result for unknown order IDs and observe how Claude asks the user for the correct ID.
4. Add a `MAX_TURNS` safety net that raises a `BudgetExceeded` exception (and logs the transcript) instead of silently returning.
5. Force `max_tokens=50` once and confirm your loop reports a truncated answer instead of treating it as done.
6. Compare with the reference solution in `architect/exercises/solutions.py` (`run_agent`).
:::
