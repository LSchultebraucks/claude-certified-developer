---
skill: 4.6
title: Multi-Instance & Multi-Pass Review
summary: Why self-review in the same session underperforms, independent reviewer instances, per-file plus cross-file passes, and using calibrated confidence to route findings to humans.
sources: Building effective agents — Anthropic | https://www.anthropic.com/engineering/building-effective-agents; Claude Code best practices | https://www.anthropic.com/engineering/claude-code-best-practices; Claude Code GitHub Actions | https://code.claude.com/docs/en/github-actions; Develop tests | https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
---

## What you need to know

Review quality depends as much on **who reviews and how the work is split** as on the prompt.

## The self-review limitation

A model asked to review output it generated **in the same session** retains the reasoning that produced it. It tends to re-justify its choices and miss its own errors — even when told to be critical. Instructions like "review your work carefully" or extended thinking in the same session help only marginally.

:::key Independent review instance
Run the review in a **separate instance/session** that receives the artifact (code, extraction, report) and the **criteria** — but **not** the generator's reasoning. It evaluates the output on its merits, like a human reviewer seeing a PR for the first time.
:::

This is the evaluator-optimizer pattern with proper separation: generator and evaluator are different contexts.

## Multi-pass review

For large inputs, one pass suffers attention dilution (1.6). Split by focus:

1. **Per-file (local) passes** — each file with the same criteria and full attention: bugs, error handling, security within the file.
2. **Cross-file (integration) pass** — interactions: API contracts, data flow, consistency of shared types, duplicated logic.

Passes can also be split by **concern** (security pass, correctness pass) when categories need different expertise and criteria.

:::scenario S5 — reviewer misses a broken contract
Per-file comments are good, but a renamed field breaks a consumer in another package and nobody notices. **Add** a cross-file integration pass that receives the per-file summaries plus interface definitions.
:::

## Confidence for routing

Asking reviewers (or extractors) to output a **confidence** per finding enables routing: high-confidence findings auto-post, low-confidence ones go to a human or a second pass. But self-reported confidence is only useful once **calibrated** against labelled data (5.5) — treat raw scores as a routing hint, not truth.

## Exam traps

:::trap "Ask the same session to double-check its work"
Self-confirmation. Use an independent instance.
:::

:::trap One mega-pass over 40 files
Inconsistent depth. Per-file + integration.
:::

:::trap Uncalibrated confidence as an auto-approve gate
Validate thresholds on labelled data first.
:::

## Practice questions

{{quiz:a4-review-01}}

{{quiz:a4-review-02}}

## Build exercise

:::exercise Generator vs. independent reviewer
1. Have Claude implement a function with a subtle bug seeded in the spec.
2. Ask the **same session** to review; record what it finds.
3. Start a **new session**, give it the code and criteria only; record what it finds.
4. Add a cross-file pass for a two-module change and check it catches a contract mismatch the per-file passes miss.
:::
