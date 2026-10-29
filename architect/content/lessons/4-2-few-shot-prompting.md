---
skill: 4.2
title: Few-Shot Prompting
summary: Using 2–4 targeted examples — chosen for ambiguous cases and showing the reasoning — to get consistent format and judgment, generalise to new patterns and reduce hallucination in extraction.
sources: Multishot prompting | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/multishot-prompting; Use XML tags | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/use-xml-tags; Reduce hallucinations | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations; Prompting best practices | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
---

## What you need to know

Few-shot prompting means including a handful of **worked examples** in the prompt. It is one of the most effective tools for **consistency** — of format and of judgment — when instructions alone leave room for interpretation.

:::key How to choose examples
- **2–4 examples** is usually enough; more adds tokens with diminishing returns.
- Choose **ambiguous / borderline** cases, not the obvious ones Claude already handles.
- **Show the reasoning**: why this action/category was chosen over the plausible alternative.
- **Vary** them (formats, lengths, edge cases) so Claude learns the pattern, not one surface form.
- Wrap them in tags (`<example>`) so they're clearly separated from the real input.
:::

```xml example for an ambiguous support decision
<example>
Customer: "The blender I bought 40 days ago stopped working, I want my money back."
Decision: offer_replacement_or_repair
Reasoning: Outside the 30-day refund window but within the 1-year warranty. A refund
would be a policy exception; warranty service is in policy. Escalate only if the
customer rejects warranty options.
</example>
```

## What few-shot fixes

| Symptom | Few-shot helps because… |
|---|---|
| Output format varies between runs | Examples demonstrate the exact structure |
| Inconsistent decisions on borderline cases | Examples with reasoning show where the boundary is |
| Extraction fails on unusual layouts (tables vs. prose, citations inline vs. bibliography) | Examples show how to handle each structure |
| Model invents values for missing fields | Examples show `null` returned when the source lacks the value |
| Review flags acceptable local patterns | Examples distinguish acceptable code from real issues |

Good examples **generalise**: Claude applies the demonstrated judgment to novel cases that resemble them, rather than matching only identical inputs.

:::scenario S6 — varied document structures
Research papers cite methodology inline in some, in a separate section in others, and in tables in a third group. Extraction misses fields in the less common layouts. **Fix:** add few-shot examples covering each structure, including one where a field is absent and returns null.
:::

## Few-shot vs. other tools

- **Explicit criteria** (4.1) define the rule; **examples** show how to apply it at the boundary. Use both.
- For **tool selection** problems, fix descriptions first (2.1); examples are a secondary aid.
- For **guaranteed** structure, use a schema (4.3); examples improve the *content* within the structure.

## Exam traps

:::trap Ten obvious examples
They cost tokens and don't teach the boundary. Choose ambiguous cases.
:::

:::trap Examples without reasoning
Claude copies the label but not the judgment; similar-but-different cases go wrong.
:::

:::trap Few-shot as a substitute for a schema
Examples make valid JSON likely; a schema makes it guaranteed.
:::

## Practice questions

{{quiz:a4-shot-01}}

{{quiz:a4-shot-02}}

## Build exercise

:::exercise Targeted examples
1. Take a classification task with 5 categories and 30 labelled tickets; run zero-shot and record per-category accuracy.
2. Add 3 examples of **easy** cases; re-measure.
3. Replace them with 3 **borderline** cases including reasoning; re-measure.
4. For an extraction task, add one example where a field is missing and returns `null`; count hallucinated values before and after.
:::
