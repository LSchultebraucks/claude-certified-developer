---
title: Study Plan
summary: Weighted schedules for passing CCA-F — a 3-week plan (≈ 1.5 h per day) and a 10-day intensive plan — plus a readiness checklist.
---

## How the time is allocated

The plan follows the domain weights. Domain 1 (27%) gets more than a quarter of the study time, and because its patterns — loops, delegation, enforcement — reappear in every scenario, it comes first.

| Domain | Weight | Share of study time |
|---|---|---|
| D1 Agentic Architecture & Orchestration | 27% | ~28% |
| D3 Claude Code Configuration & Workflows | 20% | ~19% |
| D4 Prompt Engineering & Structured Output | 20% | ~20% |
| D2 Tool Design & MCP Integration | 18% | ~18% |
| D5 Context Management & Reliability | 15% | ~15% |

## Daily routine (every plan)

- [ ] 10 minutes of **flashcards** (due cards) — patterns, anti-patterns and configuration facts.
- [ ] Read the day's lessons and answer the embedded scenario questions.
- [ ] **Drill** 10–15 questions for the day's task statements ("Unseen first").
- [ ] Do at least part of one **build exercise**.
- [ ] Re-drill yesterday's **missed questions** and write down *why* the distractor was attractive.

## 3-week plan (≈ 1.5 hours per day)

| Day | Focus | Tasks |
|---|---|---|
| 1 | Baseline | Read the [Exam Guide](#/guide) and the six scenarios; take the [Diagnostic](#/diagnostic) |
| 2 | D1 | 1.1 Agentic Loops — build the stop_reason loop exercise |
| 3 | D1 | 1.2 Multi-Agent Orchestration; 1.3 Subagent Invocation & Context Passing |
| 4 | D1 | 1.4 Workflow Enforcement & Handoff; 1.5 Agent SDK Hooks — build the refund gate |
| 5 | D1 | 1.6 Task Decomposition; 1.7 Sessions; drill Domain 1 (25 q) |
| 6 | D2 | 2.1 Tool Interface Design; 2.2 Structured Error Responses |
| 7 | D2 | 2.3 Tool Distribution & tool_choice; 2.4 MCP Integration; 2.5 Built-in Tools; drill Domain 2 |
| 8 | Checkpoint | [Quick mock](#/mock) (30 q); review every miss |
| 9 | D3 | 3.1 CLAUDE.md Hierarchy; 3.2 Commands & Skills — configure a sample repo |
| 10 | D3 | 3.3 Path-Specific Rules; 3.4 Plan Mode vs Direct Execution |
| 11 | D3 | 3.5 Iterative Refinement; 3.6 CI/CD Integration; drill Domain 3 |
| 12 | D4 | 4.1 Explicit Criteria; 4.2 Few-Shot Prompting |
| 13 | D4 | 4.3 Structured Output; 4.4 Validation & Retry — build the extraction exercise |
| 14 | D4 | 4.5 Batch Processing; 4.6 Multi-Pass Review; drill Domain 4 |
| 15 | D5 | 5.1 Preserving Context; 5.2 Escalation; 5.3 Error Propagation |
| 16 | D5 | 5.4 Large Codebases; 5.5 Human Review; 5.6 Provenance; drill Domain 5 |
| 17 | Mock 1 | Full [Mock Exam](#/mock); review by scenario |
| 18 | Repair | Re-read lessons for your three weakest task statements; adaptive drill |
| 19 | Mock 2 | Second full mock (different scenario draw) |
| 20 | Repair | Missed-questions drill; [Quick Reference](#/reference) end to end |
| 21 | Final | Flashcards (all), Anthropic Academy practice exam, rest |

## 10-day intensive plan (≈ 3 hours per day)

| Day | Focus |
|---|---|
| 1 | Exam Guide, Diagnostic, 1.1–1.3 |
| 2 | 1.4–1.7; drill Domain 1 |
| 3 | 2.1–2.5; drill Domain 2 |
| 4 | 3.1–3.3; configure a sample repository |
| 5 | 3.4–3.6; drill Domain 3 |
| 6 | 4.1–4.3 |
| 7 | 4.4–4.6; drill Domain 4 |
| 8 | 5.1–5.6; drill Domain 5 |
| 9 | Full mock; repair weakest areas |
| 10 | Second full mock; Quick Reference; flashcards |

## Readiness checklist

- [ ] I can explain why `stop_reason` — not text content or an iteration counter — drives the agent loop.
- [ ] I can tell when a requirement needs a hook or prerequisite gate instead of a prompt instruction.
- [ ] I know what a subagent does and does not inherit, and how to pass context to it.
- [ ] I can design a structured MCP error (category, retryable, description) and distinguish "no results" from "lookup failed".
- [ ] I can place CLAUDE.md content, rules, skills and commands at the right scope (user / project / directory / path).
- [ ] I know when to use plan mode, the Explore subagent and direct execution.
- [ ] I can configure Claude Code for CI with `-p`, JSON output and an independent reviewer.
- [ ] I can make extraction reliable: schema via tool use, `tool_choice`, nullable fields, validation–retry, few-shot.
- [ ] I know which workloads suit the Message Batches API and which do not.
- [ ] I can design escalation triggers, error propagation, human-review sampling and provenance tracking.
- [ ] I score **800+ on two full mocks** with different scenario draws.
