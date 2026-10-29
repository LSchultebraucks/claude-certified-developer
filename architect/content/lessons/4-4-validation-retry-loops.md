---
skill: 4.4
title: Validation, Retry & Feedback Loops
summary: Validating extractions in code and retrying with the specific error, recognising when retries can't help, self-correction fields that expose inconsistencies, and detected_pattern fields for learning from dismissals.
sources: Increase output consistency | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency; Reduce hallucinations | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations; Structured outputs | https://platform.claude.com/docs/en/build-with-claude/structured-outputs; Building effective agents — Anthropic | https://www.anthropic.com/engineering/building-effective-agents
---

## What you need to know

Schemas catch shape errors; **validation code** catches semantic errors. What you do *after* validation fails decides the system's accuracy.

## Retry with error feedback

```python validation–retry loop
def extract(doc, max_retries=2):
    messages = [{"role": "user", "content": doc}]
    for attempt in range(max_retries + 1):
        data = call_extraction(messages)
        errors = validate(data)              # e.g. totals, date order, required semantics
        if not errors:
            return data, "ok"
        messages += [
            {"role": "assistant", "content": as_tool_use(data)},
            {"role": "user", "content": tool_result(
                f"Validation failed: {errors}. Re-check the document and correct "
                f"only these fields. If the value is not in the document, return null.")},
        ]
    return data, "needs_review"
```

:::key A good retry includes
1. The **original document** (still in the conversation),
2. The **failed output**, and
3. The **specific validation errors** ("line items sum to 1,240.00 but stated_total is 1,420.00").

A bare "try again" gives Claude nothing to correct against.
:::

## When retries won't help

Retries fix **format and reading mistakes** — a misread digit, a value placed in the wrong field. They cannot produce information that **isn't in the source**. If the contract doesn't state a renewal date, or the value lives in an **external document** not provided, retrying just invites fabrication. Detect these cases (same error after retry, or the field is marked absent) and route them to `null` / **human review** instead of looping.

## Self-correction fields

Design the schema so inconsistencies become **visible to code**:

- `calculated_total` (sum of extracted line items) next to `stated_total` (as printed) — a mismatch flags either a misread or a document error.
- `conflict_detected: true` + `conflict_note` when the document contradicts itself (two different dates for the same event).
- `source_excerpt` for key fields so reviewers can verify quickly.

## Learning from dismissals: detected_pattern

In review systems, add a `detected_pattern` (or rule ID) field to every finding. When developers dismiss findings, you can aggregate **which patterns** get dismissed and fix those criteria (4.1) — instead of guessing why trust is dropping.

:::scenario S6 — persistent total mismatches
Retries fix most mismatches. A residual 3% keep failing; inspection shows those invoices carry a discount on a separate credit note not included in the input. **Answer:** stop retrying those — flag `conflict_detected`, route to review, and consider supplying the credit note as input.
:::

## Exam traps

:::trap Unlimited retries
Cost without benefit when information is missing. Cap and route to review.
:::

:::trap Retrying without the specific error
Same mistake, again.
:::

:::trap Silently "fixing" values in code
Overwriting `stated_total` with the calculated value hides real document discrepancies. Flag instead.
:::

## Practice questions

{{quiz:a4-retry-01}}

{{quiz:a4-retry-02}}

## Build exercise

:::exercise Validation–retry extraction
1. Add semantic validators to your invoice extractor (sum check, due ≥ invoice date).
2. Implement the retry loop with specific errors and a cap of 2.
3. Add `calculated_total` and `conflict_detected` to the schema.
4. Feed invoices where the total is genuinely inconsistent; confirm they end as `needs_review` instead of looping.
5. Compare with `extract_with_retry` in `architect/exercises/solutions.py`.
:::
