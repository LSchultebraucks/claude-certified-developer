---
skill: 5.1
title: Preserving Critical Context
summary: Keeping exact numbers, dates and commitments alive across long interactions — case-facts blocks instead of lossy summaries, the lost-in-the-middle effect, trimming verbose tool output and positioning key findings.
sources: Effective context engineering for AI agents | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents; Long context prompting tips | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/long-context-tips; Context windows | https://platform.claude.com/docs/en/build-with-claude/context-windows; Compaction | https://platform.claude.com/docs/en/build-with-claude/compaction
---

## What you need to know

Long interactions — a 40-turn support conversation, a multi-hour research run — eventually need context management. The common technique, **progressive summarisation**, saves tokens but is **lossy in exactly the wrong places**: "the customer was offered a partial refund" survives; "$137.50 on order ORD-1182, approved on 3 March, to be processed within 5 days" does not.

:::key Case facts block
Keep a **persistent, structured block** of critical facts — amounts, dates, IDs, order numbers, promises made, verification status — **outside** the summarised history and include it verbatim in every request (e.g. at the top of the system prompt or first user turn). Summaries may compress the narrative; they must never be the only home of a number.
:::

```xml case facts block (re-sent every turn)
<case_facts>
customer_id: C-20931 (verified 2026-03-03 via email + last4)
order: ORD-1182 · delivered 2026-02-27 · item: Blender X200
issue: motor failure; customer requests refund
agreed: partial refund $137.50 to original card, within 5 business days
open: confirm return label sent
</case_facts>
```

## Lost in the middle

Models attend most reliably to the **beginning and end** of long inputs; facts buried in the middle of a large context are more likely to be missed. Mitigations:

- Put **key findings and instructions at the start** (and restate the task at the end for very long inputs).
- Use **clear section headers / XML tags** so content is navigable.
- For aggregated research, place a **summary of key findings first**, details after.

## Trim tool output

An order-lookup tool that returns 40 fields (warehouse codes, internal flags, audit timestamps) for a task that needs 5 fills the context quickly and pushes important facts toward the middle. **Trim** results to relevant fields before they accumulate — in the tool itself, or in a PostToolUse hook (1.5).

## Structured state from subagents

In multi-agent systems, ask subagents to return **structured results with metadata** rather than prose (1.3). Downstream agents get compact, unambiguous facts, and the coordinator can keep a running facts table instead of a growing transcript.

:::scenario S1 — the refund amount drifts
Late in a long conversation the agent confirms "$130" though "$137.50" was agreed earlier; the history had been summarised twice. **Fix:** case facts block maintained by the application and re-sent each turn.
:::

## Exam traps

:::trap "Use a model with a bigger context window"
Delays the problem; doesn't stop summaries from dropping numbers or the middle from being under-attended.
:::

:::trap Relying on progressive summaries for amounts and dates
Keep them verbatim in a facts block.
:::

:::trap Passing full raw tool payloads forward "just in case"
Trim to what the task needs.
:::

## Practice questions

{{quiz:a5-ctx-01}}

{{quiz:a5-ctx-02}}

## Build exercise

:::exercise Case facts vs. summaries
1. Script a 30-turn support conversation with several numbers and commitments.
2. Run it with progressive summarisation every 10 turns; ask at the end for the agreed amount, date and order.
3. Add an application-maintained `<case_facts>` block re-sent every turn; repeat.
4. Trim `lookup_order` output to five fields and compare total tokens.
:::
