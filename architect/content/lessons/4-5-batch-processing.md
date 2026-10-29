---
skill: 4.5
title: Batch Processing Strategy
summary: When the Message Batches API is the right choice — 50% cost, up to 24 hours, no latency guarantee — and how to design batch jobs with custom_id correlation, failure resubmission and prompt refinement on a sample.
sources: Batch processing | https://platform.claude.com/docs/en/build-with-claude/batch-processing; Pricing | https://platform.claude.com/docs/en/about-claude/pricing; Rate limits | https://platform.claude.com/docs/en/api/rate-limits; Prompt caching | https://platform.claude.com/docs/en/build-with-claude/prompt-caching
---

## What you need to know

The **Message Batches API** processes many Messages requests asynchronously.

:::key Facts to know cold
- **50% cost** of standard API pricing.
- Most batches finish within an hour, but processing can take **up to 24 hours**; there is **no latency SLA**.
- Up to **100,000 requests or 256 MB** per batch; results are available for **29 days**.
- Each request has a **`custom_id`**; results may come back **in any order** — correlate by `custom_id`.
- Each request is a single Messages call: there is **no multi-turn tool loop inside one batch request** (Claude can't call a tool and continue within the batch).
:::

## Matching workloads

| Workload | Batch? | Why |
|---|---|---|
| Nightly audit of yesterday's commits | ✔ | Nobody waits for it |
| Weekly technical-debt report | ✔ | Latency-tolerant |
| Back-filling extraction for 200,000 archived documents | ✔ | Large, cost-sensitive, not urgent |
| Pre-merge check that blocks the PR | ✘ | Developers would wait up to hours |
| Interactive support agent | ✘ | Real-time, multi-turn tool use |
| Agentic workflow needing several tool calls per item | ✘ (or redesign) | No tool loop inside a request |

:::scenario S5 — two CI workloads, one budget
The team wants to cut cost on (a) blocking pre-merge reviews and (b) a nightly security audit. **Answer:** move only (b) to batches; keep (a) synchronous.
:::

## Designing a batch job

1. **Refine the prompt on a sample** (e.g. 50 documents) with synchronous calls before submitting 50,000 — fixing a prompt after a full batch run means paying twice.
2. Give every request a meaningful **`custom_id`** (document ID).
3. **Plan around the window**: if results are needed by 9:00 and processing can take 24 h, submit early enough — or split into smaller batches on a schedule.
4. On completion, collect results by `custom_id`; for **failed** items, fix the cause (e.g. split documents that exceeded the context limit) and **resubmit only those `custom_id`s**.
5. Combine with **prompt caching** for a shared system prompt to save further.

```python resubmit only failures
failed = [r.custom_id for r in results if r.result.type != "succeeded"]
retry_requests = [build_request(doc_id, chunk_if_too_large(docs[doc_id])) for doc_id in failed]
client.messages.batches.create(requests=retry_requests)
```

## Exam traps

:::trap Batch for anything "to save cost"
Only latency-tolerant, non-blocking work.
:::

:::trap Resubmitting the whole batch after partial failure
Pay twice. Resubmit failed `custom_id`s only.
:::

:::trap Expecting results in submission order
Correlate by `custom_id`.
:::

## Practice questions

{{quiz:a4-batch-01}}

{{quiz:a4-batch-02}}

## Build exercise

:::exercise Batch extraction with failure handling
1. Tune your extraction prompt on 20 documents synchronously.
2. Submit 500 documents as a batch with `custom_id` = document ID.
3. Include a few oversized documents; when they fail, chunk them and resubmit only those.
4. Compare cost with the synchronous run.
5. Compare with `resubmit_failed` in `architect/exercises/solutions.py`.
:::
