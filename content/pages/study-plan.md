---
title: Study Plan
summary: Weighted schedules for passing CCDV-F — a 3-week plan (≈ 1.5 h per day) and a 10-day intensive plan — plus a readiness checklist.
---

## How the time is allocated

The plan follows the blueprint weights. Domain 2 (33.1%) gets about a third of the study time; Claude Code (3.1%) and Debugging (2.6%) get less — but don't skip them: they are quick points, and their concepts appear inside other domains.

| Domain | Weight | Share of study time |
|---|---|---|
| D2 Applications & Integration | 33.1% | ~32% |
| D5 Model Selection & Optimization | 16.8% | ~16% |
| D1 Agents & Workflows | 14.7% | ~15% |
| D6 Prompt & Context Engineering | 11.0% | ~11% |
| D8 Tools & MCPs | 10.6% | ~11% |
| D7 Security & Safety | 8.1% | ~8% |
| D3 Claude Code | 3.1% | ~4% |
| D4 Eval, Testing & Debugging | 2.6% | ~3% |

## Daily routine (every plan)

- [ ] 10 minutes of **flashcards** (due cards) — numbers and distinctions stick through repetition.
- [ ] Read the day's lessons; answer the embedded practice questions.
- [ ] **Drill** 10–15 questions for the day's skills (Drill Mode, "Unseen first").
- [ ] Do at least part of one **build exercise** — hands-on experience is the strongest predictor of passing.
- [ ] Re-drill yesterday's **missed questions** ("Only questions I got wrong").

## 3-week plan (≈ 1.5 hours per day)

| Day | Focus | Tasks |
|---|---|---|
| 1 | Baseline | Read the [Exam Guide](#/guide); take the [Diagnostic](#/diagnostic); note your three weakest domains |
| 2 | D1 | 1.1 Agent Architecture; workflow-pattern flashcards |
| 3 | D1 | 1.2 Agent Construction; build exercise steps 1–2 (manual loop + Tool Runner) |
| 4 | D1 | 1.3 Patterns & Frameworks; drill Domain 1 (25 q) |
| 5 | D2 | 2.1 Requirements; 2.2 Systems Life Cycle |
| 6 | D2 | 2.3 API Mechanics (part 1: requests, stop reasons, streaming) — run the workbench exercise |
| 7 | D2 | 2.3 API Mechanics (part 2: vision, PDFs, thinking, platforms, batches); drill 2.3 |
| 8 | D2 | 2.4 Software Engineering Foundations; async exercise |
| 9 | D2 | 2.5 Claude Application Design (heaviest skill!) |
| 10 | D2 | 2.6 Configuration Management; drill Domain 2 (40 q) |
| 11 | Checkpoint | **Quick mock** (27 q / 60 min); review every wrong answer |
| 12 | D3 + D4 | 3.1 Claude Code Operation (set up a real repo); 4.1 Debugging |
| 13 | D5 | 5.1 LLM Fundamentals; 5.2 Technical Fundamentals |
| 14 | D5 | 5.3 Model Selection; 5.4 Cost & Tokens (do the caching calculations by hand) |
| 15 | D6 | 6.1 Context Engineering; 6.2 Prompt Engineering |
| 16 | D6 + D7 | 6.3 Output Handling; 7.1 AI Application Security |
| 17 | D7 | 7.2 Guardrails; 7.3 Hooks (write a blocking hook); 7.4 Identity & Secrets |
| 18 | D8 | 8.1 Tool Implementation; 8.2 MCP (build and inspect a server) |
| 19 | D8 + review | 8.3 Agentic Customization; drill "weakest skills first" (40 q) |
| 20 | Simulation | **Full mock #1** (53 q / 120 min) under exam conditions; review |
| 21 | Final | Quick Reference end to end; drill missed questions; **Full mock #2**. Book the exam when you score 800+ twice |

## 10-day intensive plan (≈ 3 hours per day)

| Day | Focus |
|---|---|
| 1 | Exam Guide · Diagnostic · Domain 1 (all three lessons) |
| 2 | 2.1, 2.2, 2.3 · drill 2.3 |
| 3 | 2.4, 2.5 · drill 2.5 |
| 4 | 2.6, 3.1, 4.1 · Quick mock |
| 5 | Domain 5 (all four) · cost calculations |
| 6 | Domain 6 (all three) · prompt iteration exercise |
| 7 | Domain 7 (all four) · hooks exercise |
| 8 | Domain 8 (all three) · build an MCP server |
| 9 | Full mock #1 · review · drill weakest skills |
| 10 | Quick Reference · flashcards (all) · Full mock #2 |

## Readiness checklist

You are ready to book when you can say "yes" to all of these:

- [ ] Two full mocks in a row at **≥ 800** (≈ 80% correct), each finished within 120 minutes
- [ ] No domain below **70%** in your last full mock
- [ ] You have written a manual tool-use loop handling `tool_use`, `end_turn`, `max_tokens` and tool errors
- [ ] You can explain when to choose: workflow vs. agent; Tool Runner vs. Agent SDK vs. Managed Agents; built-in tool vs. custom tool vs. Skill vs. MCP
- [ ] You can compute a cached vs. uncached request cost and explain the 5-minute vs. 1-hour TTL break-even
- [ ] You know the settings precedence, CLAUDE.md hierarchy and permission-rule evaluation order in Claude Code
- [ ] You can name the hook exit-code semantics and write a PreToolUse hook that blocks a command
- [ ] You can list MCP primitives and who controls each, and when to use stdio vs. Streamable HTTP
- [ ] You can describe at least three defenses against indirect prompt injection and why prompts alone aren't enough
- [ ] You know which HTTP errors to retry and how to isolate integration vs. model problems

## On exam day

- Read the **last sentence** of each item first; note qualifiers such as *best*, *most effective*, *first*, *LEAST*.
- For multiple-response items, select **exactly** the stated number.
- Eliminate options that rely on hope (prompt wording, bigger model, temperature) when a deterministic mechanism is offered.
- Never leave an item blank; flag and return.
- Budget: ~2 minutes per item; leave ~15 minutes for flagged items.
