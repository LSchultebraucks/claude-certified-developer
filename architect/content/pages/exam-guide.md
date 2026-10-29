---
title: CCA-F Exam Guide
summary: Everything about the exam itself — purpose, audience, format, the six scenarios, blueprint, scoring and how to prepare — condensed from the published exam information for the Claude Certified Architect – Foundations credential.
---

## About the certification

The **Claude Certified Architect – Foundations** credential (launched March 2026 through the Claude Partner Network) validates that you can **design and ship production-grade Claude solutions** — making sound architectural trade-offs across the **Claude API, the Claude Agent SDK, Claude Code and the Model Context Protocol (MCP)**.

Where the Developer exam asks "can you build it?", the Architect exam asks **"which design is right, and why?"** Almost every item presents a realistic situation and four plausible designs; the correct option is the one that addresses the *root cause* with the *most appropriate, proportionate mechanism*.

Holders can demonstrate that they can:

- Design **agentic loops** and **coordinator–subagent** systems, pass context between agents and manage sessions
- Decide when a requirement needs **deterministic enforcement** (hooks, prerequisite gates) instead of prompt guidance
- Design **tool interfaces**, **structured error responses** and **MCP integrations** that agents use reliably
- Configure **Claude Code** for teams: CLAUDE.md hierarchy, rules, skills, commands, plan mode and **CI/CD**
- Produce **reliable structured output** with schemas, few-shot examples, validation–retry loops and batch processing
- Keep long-running systems **reliable**: context preservation, escalation, error propagation, human review and provenance

## Intended audience

Solution architects, technical leads and senior engineers who design Claude-based systems for production — typically at Claude Partner Network organisations. Third-party guides consistently recommend **6+ months of hands-on experience** with the Claude API, Agent SDK, Claude Code and MCP. The exam is closed-book and taken without AI assistance.

## Exam details at a glance

{{slot:exam-facts}}

:::warn Verify administrative details
Anthropic distributes the exam guide to registered candidates through Anthropic Academy. Item count, duration, cut score, scenarios and domain weights are consistent across every public source; the **exam code** (CCA-F; some catalogues list CCAR-F), **fee**, **retake** and **validity** rules vary between sources. Confirm them on the Academy listing before you book.
:::

## The six scenarios

Each sitting draws **4 of these 6 scenarios at random**. A scenario sets the context — the system, its tools and constraints — and a group of items is asked inside it. You cannot predict which four you will get, so prepare for all six. Every practice question in this guide is tagged with its scenario, and the mock exams draw scenarios the same way.

| # | Scenario | What it typically tests |
|---|---|---|
| S1 | **Customer Support Resolution Agent** | Agent loop, prerequisite gates (identity before refunds), tool design, escalation and handoff, context preservation |
| S2 | **Code Generation with Claude Code** | CLAUDE.md hierarchy, rules, skills and commands, plan mode vs. direct execution, iterative refinement |
| S3 | **Multi-Agent Research System** | Coordinator–subagent design, context passing, parallel subagents, error propagation, provenance |
| S4 | **Developer Productivity with Claude** | Built-in tools, codebase exploration, context degradation, sessions, MCP servers |
| S5 | **Claude Code for CI/CD** | `-p` mode, JSON output, independent review instances, explicit criteria, false positives, batch vs. synchronous |
| S6 | **Structured Data Extraction** | Tool-use schemas, `tool_choice`, nullable fields, validation–retry, few-shot, human review and calibration |

## Blueprint

| Domain | Weight | Task statements |
|---|---|---|
| D1 Agentic Architecture & Orchestration | **27%** | 7 (1.1–1.7) |
| D2 Tool Design & MCP Integration | 18% | 5 (2.1–2.5) |
| D3 Claude Code Configuration & Workflows | 20% | 6 (3.1–3.6) |
| D4 Prompt Engineering & Structured Output | 20% | 6 (4.1–4.6) |
| D5 Context Management & Reliability | 15% | 6 (5.1–5.6) |

The full list of task statements with what each measures appears under *Blueprint weights* in the exam details above. Weights are published per **domain**; this guide splits each domain weight evenly across its task statements to size lessons and mocks.

## Scoring

- **Scaled score 100–1,000; 720 to pass.** The result is pass/fail with the scaled score.
- Every item is **single answer**: one correct option and three distractors. Distractors are written to be attractive to candidates with incomplete knowledge — typically a real technique applied to the wrong problem.
- **Unanswered items count as wrong** and there is no penalty for guessing: answer everything.

:::tip How this guide scores mocks
The raw-to-scaled conversion is not published. Mocks here map about 70% correct to 720, linearly on both sides. Treat **80%+ on full mocks (≈ 813)** as your "ready to book" signal.
:::

## How Architect items are built — and how to read them

Try these three; they show the patterns you will meet again and again:

{{quiz:a1-gate-01}}

{{quiz:a2-err-01}}

{{quiz:a4-schema-01}}

Notice the pattern:

1. **Deterministic beats probabilistic when the requirement is a guarantee.** Identity verification before refunds, policy limits, compliance rules → hooks and gates, not stronger wording in the prompt.
2. **Fix the root cause at the right layer.** Misrouted tool calls → better tool *descriptions*; fabricated values → *nullable* schema fields; a subagent missing facts → pass them *explicitly*.
3. **Proportionate solutions win.** The simplest mechanism that fully solves the stated problem beats a more elaborate architecture (an extra classifier, a fine-tuned model, a new agent layer) that also might.
4. **Read the qualifier.** "Most effective first step", "most reliable", "lowest cost while meeting the SLA" — several options are often *possible*; only one is *best* for the stated constraint.

## Commonly reported out-of-scope topics

Public prep material consistently lists topics the exam does **not** test in depth: fine-tuning and training (RLHF, constitutional AI), embedding models and vector-database internals, API authentication and billing administration, hosting/deploying MCP server infrastructure, computer use and vision specifics, streaming implementation details, and cloud-provider-specific configuration. Knowing that prompt caching and token counting exist is useful; implementation minutiae are not the focus.

## How to prepare

1. Read this guide and take the [Diagnostic](#/diagnostic); note the weakest domains and scenarios.
2. Work through the [Curriculum](#/learn) — Domain 1 first, it is 27% of the exam and underpins the rest.
3. **Build** — the exam rewards experience. Do the [Build Exercises](#/exercises): an agent loop with hooks, a coordinator with subagents, an MCP tool with structured errors, a CI review job and an extraction pipeline with validation–retry.
4. Drill by domain and run [Flashcards](#/flashcards) daily for patterns and anti-patterns.
5. Sit full [Mock Exams](#/mock) until you score 800+ consistently across different scenario draws.
6. Complete the official practice exam on Anthropic Academy before booking.

