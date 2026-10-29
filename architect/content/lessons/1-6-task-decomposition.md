---
skill: 1.6
title: Task Decomposition Strategies
summary: Fixed prompt chains versus dynamic, adaptive decomposition; per-file local passes plus a cross-file integration pass; and matching the decomposition to how predictable the work is.
sources: Building effective agents — Anthropic | https://www.anthropic.com/engineering/building-effective-agents; Chain complex prompts | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/chain-prompts; Claude Code best practices | https://www.anthropic.com/engineering/claude-code-best-practices; How we built our multi-agent research system — Anthropic | https://www.anthropic.com/engineering/multi-agent-research-system
---

## What you need to know

Decomposition is the decision of **how to split a large task into steps** — and **who decides** the steps. The exam contrasts two strategies and expects you to pick by how predictable the work is.

| Strategy | Who decides the steps | Fits |
|---|---|---|
| **Prompt chaining** (fixed sequential pipeline) | Your code, in advance | Predictable, multi-aspect work: "check security, then performance, then style" for every PR; extract → validate → summarise |
| **Dynamic / adaptive decomposition** | The model, at runtime, based on findings | Open-ended investigation: "add tests to this legacy codebase", "find why checkout is slow" |

:::key Rule of thumb
If you can write the steps down before seeing the input, **chain** them — it's cheaper, more predictable and easier to test. If the next step depends on what the previous one discovered, let the agent **decompose adaptively**, usually starting by mapping the problem (structure, dependencies, high-impact areas) and then prioritising.
:::

## Adaptive decomposition in practice

For "add comprehensive tests to a legacy codebase", a good agent plan is not "write tests for every file alphabetically". It is:

1. Map the structure (entry points, modules, dependencies).
2. Identify **high-impact** areas (core business logic, frequently changed, bug-prone).
3. Create a prioritised plan; start with the highest value.
4. **Adapt** as discoveries arrive (an untestable module needs refactoring first; shared fixtures emerge).

## Splitting large reviews: local + integration passes

A single pass over a 40-file pull request produces **attention dilution**: detailed comments on the first files, superficial ones on the rest, and inconsistent standards (the same pattern flagged in one file, approved in another).

:::scenario S5 — inconsistent review depth on a large PR
**Fix:** split into **per-file local passes** (each file reviewed with the same criteria and full attention) and a separate **cross-file integration pass** that looks at data flow, interface contracts and duplicated logic across files. The passes can run in parallel; the integration pass receives the per-file summaries.
:::

The same shape works for document sets (per-document extraction, then a reconciliation pass) and codebases (per-module analysis, then architecture synthesis).

## Choosing the granularity

- **Too coarse** — one giant prompt; dilution and missed items.
- **Too fine** — dozens of tiny calls; coordination overhead, lost cross-cutting context, and (for coordinators) coverage gaps between narrow subtasks (1.2).
- Aim for steps that are **independently verifiable** — each has a clear output you could check.

## Exam traps

:::trap Running an autonomous agent for a fixed checklist
If the steps are known and identical every time, a prompt chain beats an agent on cost, latency and reliability.
:::

:::trap Forcing a fixed pipeline on open-ended investigation
A hard-coded sequence can't react to what it finds. Use an agent that plans and re-plans.
:::

:::trap "Use a larger context window" for a shallow review
More context doesn't fix attention dilution; splitting the work does.
:::

## Practice questions

{{quiz:a1-decomp-01}}

{{quiz:a1-decomp-02}}

## Build exercise

:::exercise Two decompositions of a PR review
1. Collect a pull request with 15+ changed files (or synthesise one).
2. Review it in **one** prompt. Count findings per file.
3. Review it with a **chain**: per-file local passes using identical criteria, then an integration pass that receives only the per-file summaries plus the interface definitions.
4. Compare the distribution of findings, the consistency of verdicts on the same pattern, and total tokens.
5. Write down which tasks in your own work are "chain" tasks and which need adaptive decomposition.
:::
