---
skill: 2.1
title: Tool Interface Design
summary: Tool descriptions are the primary signal Claude uses to choose tools — what a good description contains, how to resolve overlapping tools by renaming and splitting, and how system-prompt wording can accidentally override tool choice.
sources: Writing effective tools for agents — Anthropic | https://www.anthropic.com/engineering/writing-tools-for-agents; Tool use overview | https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview; How to implement tool use | https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use; Building effective agents — Anthropic | https://www.anthropic.com/engineering/building-effective-agents
---

## What you need to know

Claude decides which tool to call from the **tool name, description and input schema**. Of these, the **description** carries the most weight. Anthropic's guidance on the agent–computer interface (ACI) is to invest in tools the way you would in a UI for a new colleague: clear, unambiguous, hard to misuse.

:::key What a good tool description contains
- **What it does** and **what it returns** — in plain language.
- **When to use it** — and when to use a *different* tool instead.
- **Input formats** with examples (`order_id like "ORD-12345"`, ISO dates).
- **Example queries** it is meant for.
- **Edge cases and limits** (max results, what happens if nothing matches).
Aim for several sentences, not a fragment.
:::

## The classic failure: overlapping tools

```json before — minimal, overlapping descriptions
{"name": "get_customer", "description": "Retrieves customer information."}
{"name": "lookup_order", "description": "Retrieves order information."}
```

When a customer writes "check my order #12345", Claude sometimes calls `get_customer` — both descriptions are vague and both "retrieve information". The **first fix** is the descriptions:

```json after — explicit purpose and boundaries
{"name": "get_customer",
 "description": "Find and verify a customer account by email or phone. Returns customer_id, name, tier and verification status. Use this FIRST when you need to know who the customer is. Do NOT use it to look up orders — use lookup_order."}
{"name": "lookup_order",
 "description": "Get one order's status, items, amounts and shipping events by order ID (format ORD-12345, also accepts #12345). Use when the customer mentions an order number or asks where an order is. Requires no customer lookup first."}
```

:::compare Description fix vs. heavier alternatives
Few-shot examples, a routing classifier or merging tools can also help — but they add cost and complexity and don't fix the **root cause** (Claude can't tell the tools apart). The exam's "most effective first step" is almost always: **rewrite the descriptions**.
:::

## Splitting and renaming

- **Split generic tools.** `analyze_document` that "extracts, summarizes or verifies depending on parameters" is hard to use correctly. Prefer `extract_data_points`, `summarize_content`, `verify_claim_against_source` — each with a precise contract.
- **Rename to remove ambiguity.** If a custom `analyze_dependencies` keeps being confused with the built-in Grep, rename it to `extract_web_results` / `build_import_graph` — names that say exactly what is different.
- **Consolidate** when tools are always called together in sequence (e.g. `get_user` → `get_user_orders`) — one well-described tool can reduce turns. Balance this against keeping contracts simple.

## Return values are part of the interface

Return **meaningful, compact** data: names over opaque IDs where possible, only the fields the agent needs, and clear errors (2.2). Huge raw payloads waste context (5.1).

## System prompts can override tool choice

A system prompt that says "always **analyze** the customer's documents carefully" may push Claude toward any tool with "analyze" in its name. When a tool is chosen for the wrong reason, check the **system prompt for keyword-sensitive instructions** that conflict with the tool descriptions.

## Exam traps

:::trap "Add a routing classifier" as the first fix
Over-engineered for a problem caused by unclear descriptions.
:::

:::trap "Merge the two tools into one"
Sometimes valid, but it usually hides the ambiguity inside parameters instead of resolving it.
:::

:::trap Few-shot examples as the primary fix for tool confusion
They help, cost tokens on every call, and don't scale to new cases. Fix the descriptions first.
:::

## Practice questions

{{quiz:a2-tool-01}}

{{quiz:a2-tool-02}}

## Build exercise

:::exercise Measure description quality
1. Create 30 test prompts for your support agent, labelled with the correct tool.
2. Run them with one-line descriptions; record tool-selection accuracy.
3. Rewrite descriptions with purpose, when-to-use, input format, examples and boundaries; rerun.
4. Add a system-prompt line "Always analyze requests thoroughly" plus a tool named `analyze_ticket`; observe the selection shift. Remove it.
5. Split one generic tool into two purpose-specific tools and measure again.
:::
