---
skill: 2.3
title: Tool Distribution & tool_choice
summary: Why too many tools degrade selection, how to scope tools per agent role, when a cross-role agent deserves one narrow extra tool, and how tool_choice auto, any and forced tool control behaviour.
sources: How to implement tool use | https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use; Tool use overview | https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview; Agent SDK: Subagents | https://code.claude.com/docs/en/agent-sdk/subagents; Writing effective tools for agents — Anthropic | https://www.anthropic.com/engineering/writing-tools-for-agents
---

## What you need to know

Two levers control *which* tools an agent uses: **which tools it has** (distribution) and **whether it must use one** (`tool_choice`).

## Distribution: fewer, role-specific tools

Giving one agent every tool in the system — 18 tools spanning search, documents, billing and reporting — **degrades selection reliability**: more similar options, longer tool lists to reason over, and agents wandering outside their role (a synthesis agent starting web searches itself).

:::key Scope tools to the role
- Each agent gets the **4–5 tools** its role needs.
- A web-search subagent gets search/fetch; a document subagent gets Read/Grep; a synthesis agent gets none or only verification.
- Restricting tools is also **least privilege** — a review subagent without Write can't modify code.
:::

### The cross-role exception

Sometimes an agent frequently needs one capability from another role. Example: the synthesis agent often needs to **verify a single fact**, and each round-trip through the coordinator to the search agent adds latency. Options:

- Give it the **full** search toolset → it starts doing research itself (role creep).
- Give it a **narrow, scoped tool** such as `verify_fact(claim, source_url)` → handles the frequent simple case; complex research still goes through the coordinator. ✔

## tool_choice

| Value | Behaviour | Use for |
|---|---|---|
| `{"type": "auto"}` (default) | Claude may call a tool **or** answer in text | Normal agent turns |
| `{"type": "any"}` | Claude **must** call a tool — any of the provided ones | Guarantee structured output when several schemas/tools are valid |
| `{"type": "tool", "name": "extract_invoice"}` | Claude **must** call that tool | Force a specific step (e.g. always run `extract_metadata` first) |
| `{"type": "none"}` | No tool calls | Final summarisation turns |

```python guarantee structured output, unknown document type
resp = client.messages.create(
    model=MODEL, max_tokens=2048,
    tools=[invoice_schema_tool, receipt_schema_tool, contract_schema_tool],
    tool_choice={"type": "any"},          # never a plain-text reply
    messages=[{"role": "user", "content": doc}],
)
```

With `auto`, Claude might reply "This looks like an invoice from …" in prose — a parse failure downstream. With `any`, it must pick one of the extraction tools. When you need a *specific* first step, force that tool, then continue with `auto` in later turns.

:::warn Forced tool use and extended thinking
`any` and forced-tool `tool_choice` are not compatible with extended thinking; use `auto` (with clear instructions) when thinking is enabled.
:::

## Exam traps

:::trap "Give every agent all tools for flexibility"
Selection reliability drops and roles blur. Scope tools.
:::

:::trap Using `auto` when the requirement is "always return structured data"
`auto` allows a text reply. Use `any` (or a forced tool).
:::

:::trap Forcing a specific tool when the correct tool depends on the input
Forced choice is for a known step. When the document type is unknown, `any` lets Claude choose among schemas.
:::

## Practice questions

{{quiz:a2-dist-01}}

{{quiz:a2-dist-02}}

## Build exercise

:::exercise Tool scoping and tool_choice experiments
1. Give one agent 15 tools; run 30 labelled prompts and record selection accuracy.
2. Split into three role agents with 4–5 tools each behind a coordinator; rerun.
3. For extraction, run 20 mixed documents with `auto` and count text replies; switch to `any`.
4. Force `extract_metadata` for the first turn, then switch to `auto`.
5. Add a narrow `verify_fact` tool to the synthesis agent and measure latency saved.
:::
