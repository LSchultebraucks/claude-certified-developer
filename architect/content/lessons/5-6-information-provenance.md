---
skill: 5.6
title: Information Provenance & Uncertainty
summary: Keeping claim–source mappings through multi-agent synthesis, annotating conflicting values instead of silently choosing, carrying dates so time differences aren't mistaken for contradictions, and rendering content types appropriately.
sources: Citations | https://platform.claude.com/docs/en/build-with-claude/citations; How we built our multi-agent research system — Anthropic | https://www.anthropic.com/engineering/multi-agent-research-system; Reduce hallucinations | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations; Long context prompting tips | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/long-context-tips
---

## What you need to know

In multi-source synthesis — the research system (S3) above all — the value of the output depends on whether readers can **trace each claim** and **see where sources disagree**. Provenance is easily lost: each summarisation step drops URLs, dates and qualifiers.

:::key Claim–source mapping
Every finding travels as a structured record — **claim, source (URL or document + page), excerpt, publication/collection date** — from the subagent that found it, through the coordinator, into the synthesis. The synthesis agent is instructed to **preserve** these mappings and cite them, not to re-summarise them away.
:::

```json finding record
{"claim": "Global market reached $4.2B in 2025",
 "source": "https://example.org/market-report-2026", "title": "Market Report 2026",
 "excerpt": "…revenues of USD 4.2 billion in calendar 2025…",
 "published": "2026-01-15", "method": "vendor revenue survey"}
```

## Conflicting values

Two credible sources give different numbers (4.2B vs. 3.6B). The wrong move is to **pick one** arbitrarily (or average them) without saying so.

- Report **both values with attribution**.
- Look for explanations in **metadata**: different years, definitions, methodologies, regions.
- Mark the conflict explicitly; let the coordinator decide whether to investigate further.

## Dates prevent false contradictions

Many apparent conflicts are **temporal**: a 2022 figure and a 2025 figure aren't contradictory. Requiring `published` / `data_as_of` fields lets the synthesis present a trend instead of a conflict.

## Uncertainty and structure

- Distinguish **well-established** findings (multiple independent sources) from **contested** or single-source ones; reports can have separate sections.
- **Render content appropriately**: financial data as tables, narrative news as prose, technical findings as structured lists — forcing everything into one format obscures what kind of evidence it is.
- Built-in **citations** (API Citations feature for documents) help when synthesising from supplied documents.

:::scenario S3 — the report cites nothing for its key number
Subagents found the figure with its source, but the coordinator passed only prose summaries to the synthesis agent. **Fix:** pass structured finding records and require claim-level citations in the report format.
:::

## Exam traps

:::trap Choosing the "more reliable" source silently
Present both, attributed; explain the difference if possible.
:::

:::trap Dropping dates during summarisation
Creates false conflicts and stale conclusions.
:::

:::trap Asking the synthesis agent to "add citations" afterwards
It can't cite what it no longer has. Preserve mappings throughout.
:::

## Practice questions

{{quiz:a5-prov-01}}

{{quiz:a5-prov-02}}

## Build exercise

:::exercise Provenance-preserving synthesis
1. Have two subagents research the same statistic from different sources.
2. Pass prose summaries to the synthesis agent; check citations.
3. Pass structured finding records; require each sentence to cite a record ID.
4. Seed a conflict (different years) and confirm the report explains it as a trend; seed a true conflict and confirm both values are attributed.
:::
