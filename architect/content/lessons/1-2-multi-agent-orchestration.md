---
skill: 1.2
title: Multi-Agent Orchestration
summary: Coordinator–subagent (hub-and-spoke) systems — what the coordinator owns, why subagents are isolated, how decomposition causes coverage gaps, and when multi-agent is the wrong answer.
sources: How we built our multi-agent research system — Anthropic | https://www.anthropic.com/engineering/multi-agent-research-system; Building effective agents — Anthropic | https://www.anthropic.com/engineering/building-effective-agents; Agent SDK: Subagents | https://code.claude.com/docs/en/agent-sdk/subagents; Effective context engineering for AI agents | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
---

## What you need to know

The reference architecture for multi-agent Claude systems is **hub-and-spoke**: one **coordinator** (lead agent) and several specialised **subagents**. The Multi-Agent Research System scenario (S3) is built entirely on it, and parts of the support and productivity scenarios use it too.

:::key Responsibilities of the coordinator
1. **Decompose** the request into subtasks.
2. **Select** which subagents to invoke (and how many — scale effort to complexity).
3. **Delegate** with complete context (1.3).
4. **Route all communication** — subagents report only to the coordinator.
5. **Aggregate** and reconcile results, resolve conflicts, keep provenance.
6. **Evaluate coverage** and iterate: re-delegate if gaps or contradictions remain.
:::

## Why hub-and-spoke

- **Context isolation.** Each subagent starts with a clean context containing only its subtask. Verbose searching and reading stays in the subagent; the coordinator receives a condensed result.
- **Observability and control.** All information flows through one place, so you can log it, apply consistent error handling (5.3) and enforce policy.
- **Specialisation.** Subagents can have different prompts, tools and models — a web-search agent with search tools, a document agent with file tools, a cheaper model for simple extraction.
- **Parallelism.** Independent subtasks run concurrently, reducing wall-clock time.

Subagents talking directly to each other ("mesh") loses these properties: duplicated work, untraceable information flow and no single place to resolve conflicts. On the exam, **"route through the coordinator"** beats "let subagents share a channel".

## Decomposition decides quality

The most frequently tested failure: a report that is well-written and well-sourced but **covers only part of the question**. Each subagent did exactly what it was asked — the coordinator asked for too little.

:::scenario S3 — "impact of AI on creative industries"
The final report discusses only visual art. Logs show the coordinator created three subtasks: "AI in digital art", "AI in graphic design", "AI in photography". The search and synthesis agents performed well. **Root cause:** overly narrow decomposition by the coordinator — music, writing, film and games were never delegated. **Fix:** improve the coordinator's decomposition (enumerate the dimensions of the topic, check coverage before synthesis), not the subagents.
:::

Good coordinator prompts therefore include: identify the dimensions of the question, map each to a subtask with a clear objective and output format, avoid overlap, and **check coverage against the original question** before synthesising.

## Iterative refinement by the coordinator

A coordinator should not just fan out once and concatenate. After results return it evaluates them: are claims supported, do sources conflict, are there gaps? If so it issues **targeted follow-up delegations** ("find primary data for the 2025 figure", "search for counter-evidence on X") and re-synthesises. This is the orchestrator-workers pattern with an evaluation step.

## When multi-agent is wrong

Multi-agent systems cost more tokens (Anthropic measured research agents at many times the tokens of a chat) and add coordination overhead. They pay off for **broad, parallelisable, high-value** work. They are a poor fit when:

- subtasks are **tightly coupled** and each needs the full shared context (many coding tasks);
- the task is a **fixed sequence** a workflow can handle;
- the request is **simple** — one agent with the right tools suffices.

:::compare Coordinator–subagent vs. prompt chain
A **prompt chain** has steps fixed in code. A **coordinator** decides subtasks at runtime from the input. If the question says "the sub-questions vary by request", choose the coordinator; if they are always the same, choose the chain.
:::

## Exam traps

:::trap Blaming the subagents for a coverage gap
If every subagent performed its assigned task well, the gap is in **what was assigned**. The fix is the coordinator's decomposition logic.
:::

:::trap Letting subagents communicate directly to "save a hop"
It removes observability and conflict resolution. Keep communication coordinator-mediated.
:::

:::trap "Always run every subagent"
Effort should scale with the query. A simple factual question needs one subagent (or none), not the full pipeline.
:::

## Practice questions

{{quiz:a1-orch-01}}

{{quiz:a1-orch-02}}

## Build exercise

:::exercise Build a coordinator with two research subagents
1. With the Agent SDK, define a coordinator with `allowed_tools` including `Task`, and two subagents: `web-researcher` (web search/fetch) and `doc-analyst` (Read/Grep on a local folder of PDFs converted to text).
2. Prompt the coordinator to list the **dimensions** of the question first, then delegate one subtask per dimension.
3. Ask subagents to return JSON findings with `claim`, `source`, `date`.
4. Add a coverage check: the coordinator compares findings to its dimension list and re-delegates for any uncovered dimension.
5. Run a broad question ("impact of AI on creative industries") with and without the dimension step; compare coverage.
:::
