---
skill: 5.5
title: Human Review & Confidence Calibration
summary: Why aggregate accuracy hides weak segments, measuring per document type and field, stratified random sampling of automated output, and calibrating field-level confidence thresholds on labelled data.
sources: Define success criteria | https://platform.claude.com/docs/en/test-and-evaluate/define-success; Develop tests | https://platform.claude.com/docs/en/test-and-evaluate/develop-tests; Reduce hallucinations | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations; Building effective agents — Anthropic | https://www.anthropic.com/engineering/building-effective-agents
---

## What you need to know

Automation pays off when humans review **fewer** outputs — but only if the system knows **which** outputs are safe to auto-accept. That requires measuring accuracy at the right granularity and calibrating confidence.

:::key Aggregate accuracy hides failure
"97% accurate overall" can mean 99.5% on standard invoices (90% of volume) and 75% on handwritten forms (3% of volume). Reducing human review based on the aggregate would silently pass a quarter of the handwritten forms with errors. Measure **per document type** and **per field** before changing review policy.
:::

## Stratified random sampling

Even after automation, keep a **sample** of auto-accepted results flowing to humans to detect drift and novel failure patterns. Sample **stratified** by document type, source and confidence band — simple random sampling would almost never pick the rare types where errors concentrate.

## Field-level confidence and calibration

Ask the extractor to output a **confidence per field** (or derive one from validation signals). Then:

1. Build a **labelled validation set** (human-verified ground truth).
2. Compare predicted confidence with actual correctness per field/type — e.g. of fields marked 0.9, are ~90% correct?
3. Set **thresholds** per field: above → auto-accept; below → human review.
4. Recalibrate when inputs or prompts change.

Uncalibrated self-reported confidence is not a safe gate; calibrated confidence is a powerful router.

## Routing design

```text review routing
if validation_failed or conflict_detected:          → human review (always)
elif doc_type in LOW_ACCURACY_TYPES:                → human review
elif min(field_confidence) < calibrated_threshold:  → human review (only low fields highlighted)
else:                                                → auto-accept, eligible for stratified sample
```

Show reviewers the **low-confidence fields and source excerpts**, not the whole document from scratch.

:::scenario S6 — "can we cut review by 80%?"
Overall accuracy is 96%. **First step:** break accuracy down by document type and field on a labelled sample; only segments that meet the bar move to auto-accept, with stratified sampling continuing.
:::

## Exam traps

:::trap Reducing review based on aggregate accuracy
Check segments first.
:::

:::trap Simple random sampling for monitoring
Misses rare, error-prone segments. Stratify.
:::

:::trap Raw model confidence as an auto-approve threshold
Calibrate on labelled data.
:::

## Practice questions

{{quiz:a5-hrev-01}}

{{quiz:a5-hrev-02}}

## Build exercise

:::exercise Calibrate an extraction pipeline
1. Label 200 extracted documents across 4 types.
2. Compute accuracy overall, per type and per field.
3. Add per-field confidence output; plot confidence vs. correctness.
4. Choose thresholds per field and estimate the review workload and residual error.
5. Implement stratified sampling of auto-accepted results.
:::
