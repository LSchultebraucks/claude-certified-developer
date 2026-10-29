---
skill: 5.4
title: Context in Large Codebase Exploration
summary: Recognising context degradation in long sessions and countering it with scratchpad files, subagent delegation, phase summaries, deliberate /compact and crash-recovery manifests.
sources: Effective context engineering for AI agents | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents; Claude Code best practices | https://www.anthropic.com/engineering/claude-code-best-practices; Claude Code subagents | https://code.claude.com/docs/en/sub-agents; Claude Code slash commands | https://code.claude.com/docs/en/commands
---

## What you need to know

Exploring a large, unfamiliar codebase is the Developer Productivity scenario (S4) in a nutshell. The longer a session runs, the more its context fills with file contents, search results and dead ends.

:::key Symptom of context degradation
Early in the session Claude cites specific classes and functions it read. Later it starts saying things like "this probably follows the typical repository pattern" — generic statements instead of the concrete code it saw an hour ago. Answers become inconsistent with earlier findings.
:::

## Countermeasures

| Technique | How it helps |
|---|---|
| **Scratchpad / findings file** | Claude writes key findings (entry points, data flow, decisions) to a file such as `NOTES.md` as it goes; later questions reference the file instead of relying on old context |
| **Subagent delegation** | Verbose searches run in subagents (or the Explore subagent); only summaries return, keeping the main context focused |
| **Summarise between phases** | Before moving from "map the system" to "plan the change", write a structured summary; start the next phase from it |
| **`/compact`** (with focus instructions) | Compresses history deliberately at a good moment — "compact, keep the list of call sites and the migration decisions" |
| **`/clear` + summary** | When a phase is done, clear and continue from the written summary |
| **Crash-recovery manifest** | For long multi-step jobs, a manifest of completed steps, outputs and next steps lets work resume after a crash or reset without redoing everything |

```markdown NOTES.md — scratchpad maintained during exploration
## Findings (updated 14:20)
- Payment entry: api/routes/checkout.py::create_payment → services/billing.py::charge
- charge() re-exported as billing.charge_card in legacy/wrappers.py (3 callers)
- Retries: tenacity, 3 attempts, no idempotency key  ← risk
## Decisions
- Migrate callers to services.billing.charge, keep wrapper deprecated
## Next
- Check webhooks/ for direct Stripe calls
```

## Combine with incremental exploration

Context management complements good exploration habits (2.5): Grep and targeted Reads instead of reading everything, and the Explore subagent for broad questions.

:::scenario S4 — three-hour legacy investigation
After two hours, answers contradict earlier ones. **Better approach:** findings file from the start, delegate module surveys to subagents, summarise and `/compact` at phase boundaries; if a fresh session is needed, start it from the findings file (1.7).
:::

## Exam traps

:::trap "Use a model with a larger context window"
Doesn't remove noise; degradation still occurs.
:::

:::trap Reading the whole repository into context first
Accelerates degradation.
:::

:::trap Compacting without guidance at a random moment
Compact at phase boundaries with instructions about what to keep.
:::

## Practice questions

{{quiz:a5-code-01}}

{{quiz:a5-code-02}}

## Build exercise

:::exercise Long exploration with a findings file
1. Pick a large open-source repo and a cross-cutting question.
2. Session A: explore freely for an hour; ask a detail question about something found early.
3. Session B: instruct Claude to maintain `NOTES.md`, use the Explore subagent for surveys and `/compact` at phase boundaries; ask the same question.
4. Kill session B midway and resume from `NOTES.md` in a fresh session.
:::
