---
title: CCDV-F Exam Guide
summary: Everything about the exam itself, condensed from Anthropic's official Exam Guide v1.0 (effective July 2026): purpose, audience, format, blueprint, scoring, registration, policies and renewal.
---

## About the certification

The **Claude Certified Developer – Foundations** credential validates that you can **build, integrate and ship production-grade applications, agents and workflows** on Anthropic's Claude platform at a foundational level — translating technical requirements into working systems through API integration, agent and tool construction, prompt and context engineering, evaluation, security and model selection.

Holders can demonstrate that they can:

- Build agents and workflows using the **Claude Agent SDK**, agentic frameworks and **custom agent loops**
- Integrate Claude into application code through the **API, client SDKs and third-party integrations**, including streaming, error handling and multi-format input
- Operate **Claude Code** across interfaces, author **Claude Skills**, and configure **CLAUDE.md, settings.json and plugins**
- Write effective **prompts** and apply **context engineering** to control behavior and prevent context drift
- Design and run **evals**, debug failure modes through **trace analysis**, validate structured output and monitor production quality
- **Select model tiers** and manage **tokens, caching and batch processing** to optimize cost and latency
- Apply **secure-by-design** principles and implement **guardrails through hooks** against prompt injection and destructive actions
- Build **custom tools, function schemas and MCP servers**, weighing trade-offs across **built-in tools, custom tools, Skills and MCPs**

## Intended audience and the minimally qualified candidate

AI/ML engineers, technical leads and senior software engineers working at the intersection of business requirements and technical implementation. The exam is targeted at the **minimally qualified candidate (MQC)**: a hands-on individual who builds, integrates and ships Claude-powered applications and understands trade-offs in **model selection (cost, latency, capability)** and **tool type (built-in, custom, Skills, MCPs)**.

Recommended (not required) experience:
- 1–5 years of software engineering
- At least 6 months hands-on with Claude or comparable LLM systems
- Proficiency in Python and/or TypeScript
- Fluency with REST APIs and CLI tools
- Working understanding of LLM fundamentals, agents, context management and MCP

There are **no prerequisites**; the credential is awarded on exam performance alone. Not intended for non-technical users or prompt-writing-only roles.

## Exam details at a glance

{{slot:exam-facts}}

## Scoring

- **Criterion-referenced**: you are measured against a fixed performance standard, not against other candidates.
- The **cut score (720 on 100–1,000)** was set in a formal standard-setting study with subject-matter experts judging the performance expected of a minimally qualified candidate.
- The score report shows **pass/fail, the scaled score, and percent correct per domain**. Domain percentages are diagnostic only; pass/fail depends on the total scaled score.
- **Multiple-response items** state how many responses to select. Assume no partial credit — select exactly the requested number.
- There is no published penalty for wrong answers: **answer every item**.

:::tip How this guide scores mocks
Anthropic doesn't publish the raw-to-scaled conversion. The mock exams here map about 70% correct to 720, linearly on both sides. Treat **80%+ on full mocks (≈ 813)** as your "ready to book" signal.
:::

## The three official sample questions

These illustrate the style and cognitive level of the exam (not from the live item bank). Try them:

{{quiz:d2-api-18}}

{{quiz:d7-sec-01}}

{{quiz:d8-mcp-01}}

Notice the pattern: each correct answer is the option that addresses the **underlying requirement with the right mechanism** (batch for latency-tolerant cost-sensitive work; isolation + guardrails for injection; MCP for reusable independent integrations), while distractors are plausible-sounding but irrelevant or unenforceable.

## How to prepare (official recommendations)

1. Study the blueprint and **self-assess against each objective** (use the [Diagnostic](#/diagnostic) and the [Progress Dashboard](#/progress)).
2. Review official Anthropic documentation for the **Claude API, models, prompt engineering, Claude Code, Skills and MCP** (each lesson links the relevant pages).
3. **Build and operate at least one Claude application** that exercises the API, integrates one or more tools, applies basic prompt and context engineering, and includes simple security and evaluation practices (see [Build Exercises](#/exercises)).
4. Practice the developer competencies: prompts and system instructions, agents and workflows, configuring Claude Code, managing tokens and cost, implementing guardrails, creating custom tools or MCP servers.
5. Complete the sample questions to learn the item style.

## Registration and scheduling

1. Go to the exam's certification page on the **Anthropic Partner Academy**.
2. Download the Exam Guide; review the Certification Terms and Conditions and the Certification Exam Policy.
3. Register and check out (the fee may reflect a partner-tier discount).
4. Create your **Pearson VUE** account and schedule.
5. Choose **online proctoring** or a **Pearson test center**.
6. Cancel or reschedule **up to 24 hours** before the appointment; later changes forfeit the fee.

## Policies

- **Identification**: valid, unexpired, government-issued photo ID; the name must match the registration exactly (name corrections: certifications-support@anthropic.com before scheduling).
- **Accommodations**: request and get approval from Pearson VUE **before** scheduling.
- **Retakes**: waiting periods of **14 days** after the 1st failure, **30 days** after the 2nd, **90 days** after the 3rd; at most **4 attempts per rolling 12 months** per exam; fee per attempt.
- **No-show / late arrival**: fee forfeited, re-registration required.

## Exam day and conduct

- Online: stay in view of the webcam; clear workspace (no notes, books, phones, second monitors); no communication with others; no copying or recording exam content.
- Prohibited items include phones, smart watches, headphones and study materials.
- Misconduct can lead to invalidation, revocation and bans. You must accept an **NDA** before the exam starts.

## Credential maintenance

- Valid for **12 months**.
- **On-time renewal is free**: review what changed and complete a non-proctored assessment on the Anthropic Partner Academy.
- A **lapsed** credential requires retaking the full exam at full fee; significant content changes may require a full retake.

## Appeals

Appeal a decision within **14 days** of notification (or of your exam date for result concerns) via Pearson VUE support. Standard-setting outcomes and individual item content are not appealable.
