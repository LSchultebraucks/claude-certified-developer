---
skill: 4.1
title: Explicit Criteria & Precision
summary: Replacing vague instructions with concrete, checkable criteria — what to report and what to skip, severity definitions with examples — and restoring trust when false positives have made a reviewer noise.
sources: Prompting best practices | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices; Prompt engineering overview | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview; Define success criteria | https://platform.claude.com/docs/en/test-and-evaluate/define-success; Increase output consistency | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
---

## What you need to know

Claude follows instructions precisely — which means **vague instructions produce vague behaviour**. "Be conservative", "only report important issues", "flag anything suspicious" give no decision boundary, so precision varies from run to run and between categories.

:::key Explicit criteria
State **what to report**, **what to skip**, and **how to decide severity** — with concrete examples.

| Vague | Explicit |
|---|---|
| "Only report high-confidence issues" | "Report a finding only if you can name the input that triggers it and the incorrect result" |
| "Flag comments that may be inaccurate" | "Flag a comment only when it **contradicts** the code it describes (e.g. says 'returns null' but the function throws)" |
| "Be careful about style" | "Skip formatting, naming and import order — the linter handles them" |
| "Mark critical issues" | "**Critical** = data loss, security exposure or wrong money amounts; **Major** = incorrect behaviour in a supported path; **Minor** = everything else" |
:::

## Why false positives matter so much

A review bot with a high false-positive rate in **some** categories trains developers to ignore **all** its comments — including the accurate ones. Trust is a system property.

:::scenario S5 — developers dismiss everything
Security and correctness findings are accurate, but "possible performance issue" and "style" findings are mostly wrong, and developers have started dismissing every comment. **Fast, effective step:** temporarily **disable the high-false-positive categories** so the accurate ones regain credibility, then improve those categories' criteria (with examples) before re-enabling them.
:::

## Writing criteria that work

- **Define the decision**, not the attitude. Replace adjectives ("important", "risky") with conditions.
- **Give examples per severity level**, including borderline ones — code snippets for code review, clauses for contract review.
- **Say what to ignore**, especially things other tools already check, and local conventions the team accepts.
- **Explain why** a rule exists; Claude generalises better when it knows the purpose ("we skip style because the linter enforces it").
- Make output **structured** (category, severity, evidence) so you can measure precision per category and catch drift.

## Exam traps

:::trap "Tell the model to be more conservative"
Doesn't define a boundary; precision barely moves. Explicit criteria do.
:::

:::trap Confidence thresholds as the main fix
"Only report findings with confidence > 0.8" relies on self-reported confidence, which is poorly calibrated without validation (4.6, 5.5). Criteria first.
:::

:::trap Keeping noisy categories on while you tune
Every false positive erodes trust in the accurate categories.
:::

## Practice questions

{{quiz:a4-crit-01}}

{{quiz:a4-crit-02}}

## Build exercise

:::exercise Measure precision per category
1. Run a review prompt ("find issues, be conservative") on 20 diffs and label every finding true/false positive by category.
2. Rewrite the prompt with explicit report/skip rules and severity definitions with code examples.
3. Re-run and compare precision per category.
4. Disable the worst category and re-measure how many findings developers would act on.
:::
