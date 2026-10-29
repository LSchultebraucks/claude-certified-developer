---
skill: 5.3
title: Error Propagation in Multi-Agent Systems
summary: How failures should travel from subagents to the coordinator — structured context instead of silence or total abort — local recovery first, and coverage annotations in the final output.
sources: How we built our multi-agent research system — Anthropic | https://www.anthropic.com/engineering/multi-agent-research-system; Agent SDK: Subagents | https://code.claude.com/docs/en/agent-sdk/subagents; Writing effective tools for agents — Anthropic | https://www.anthropic.com/engineering/writing-tools-for-agents; Errors (Claude API) | https://platform.claude.com/docs/en/api/errors
---

## What you need to know

In a multi-agent system, a failure in one subagent is information the **coordinator** needs to decide what to do. Two opposite mistakes dominate exam distractors:

:::key Two anti-patterns
1. **Silent suppression** — the subagent catches the error and returns an empty result **as if successful**. The coordinator concludes "no sources exist" and the final report is confidently incomplete.
2. **Total abort** — one subagent's timeout terminates the entire workflow, discarding everything the other subagents found.
:::

The correct pattern sits between them: **recover locally where possible; otherwise propagate structured error context and let the coordinator decide.**

## Local recovery first

Subagents should handle **transient** failures themselves (retry with backoff), fix **validation** problems (reformulate the query), and only propagate what they can't resolve. This keeps the coordinator's context free of noise.

## What to propagate

```json subagent result with a partial failure
{
  "status": "partial",
  "results": [{"claim": "...", "source": "...", "date": "2025-11-02"}],
  "error": {
    "type": "timeout",
    "attempted": "search: 'EU AI Act enforcement fines 2026' (3 attempts)",
    "partial": "2 of 5 planned sources retrieved",
    "alternatives": ["query official EU press releases", "search national regulator sites"]
  }
}
```

With **failure type, attempted query, partial results and alternatives**, the coordinator can retry with a different query, delegate to another subagent, proceed with partial coverage, or escalate.

## Coverage annotations

When the system proceeds despite gaps, the output must **say so**: "Regulatory enforcement data for 2026 could not be retrieved (search timeout); figures in section 3 cover 2025 only." This is graceful degradation — useful partial results with honest boundaries.

## Distinguish access failures from empty results

As in 2.2: "searched, found nothing" is valid evidence of absence; "couldn't search" is not. The structured status (`ok` / `empty` / `partial` / `failed`) keeps that distinction through the pipeline.

:::scenario S3 — the web subagent times out
**Wrong:** return `[]` (suppression) or raise and stop the run (abort). **Right:** retry locally; then return partial results with the structured error; the coordinator re-delegates with an alternative query or annotates the gap in the report.
:::

## Exam traps

:::trap Returning empty success on failure
The most damaging option: wrong conclusions with no signal.
:::

:::trap Aborting everything on one failure
Throws away valid work.
:::

:::trap Propagating raw stack traces
Unstructured noise; the coordinator needs type, attempt, partial results and alternatives.
:::

## Practice questions

{{quiz:a5-prop-01}}

{{quiz:a5-prop-02}}

## Build exercise

:::exercise Propagation in a research pipeline
1. Make one search subagent fail randomly with timeouts.
2. Version A: swallow errors and return `[]`. Version B: raise and abort. Version C: retry locally, then return structured partial results.
3. Compare final reports for accuracy and honesty about coverage.
4. Add coverage annotations to the synthesis prompt for any `partial`/`failed` inputs.
:::
