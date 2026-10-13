---
skill: 4.1
title: Debugging and Error Handling
summary: Identify API and model error types, pick the right recovery strategy, analyze traces to find agent failure modes, and isolate whether a bug lives in your integration layer or in the model's output. Plus the eval and testing basics the domain title implies.
sources: API errors | https://platform.claude.com/docs/en/api/errors; Handling stop reasons | https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons; Rate limits | https://platform.claude.com/docs/en/api/rate-limits; Develop tests (evals) | https://platform.claude.com/docs/en/test-and-evaluate/develop-tests; Reduce hallucinations | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
---

## What you need to know

When a Claude application misbehaves, the exam expects a disciplined process: **classify the error → choose a recovery strategy → inspect the trace → isolate the origin (integration vs. model) → fix and add a regression test**.

## 1. Error type identification

### HTTP/API errors

| Status | `error.type` | Cause | Retry? | Recovery |
|---|---|---|---|---|
| 400 | `invalid_request_error` | Malformed request, bad params, roles not alternating, unsupported parameter for the model, `tool_result` without matching `tool_use` | **No** | Fix the request |
| 401 | `authentication_error` | Missing/invalid key, wrong header | No | Fix credentials |
| 402 | `billing_error` | Billing problem | No | Fix billing |
| 403 | `permission_error` | Key not allowed for this resource/action | No | Fix permissions |
| 404 | `not_found_error` | Wrong endpoint, typo in model ID, model unavailable to your org | No | Fix ID / check `GET /v1/models` |
| 413 | `request_too_large` | Request body too big | No | Shrink input, use Files API |
| 429 | `rate_limit_error` | RPM / input-TPM / output-TPM exceeded | **Yes** | Back off, honor `retry-after`, smooth traffic, caching, batches |
| 500 | `api_error` | Internal error | **Yes** | Retry with backoff |
| 529 | `overloaded_error` | API temporarily overloaded | **Yes** | Retry with backoff; consider fallback model |

Also:
- **Network/connection errors and timeouts** (no HTTP response) → retry with backoff; check timeouts for long outputs (use streaming).
- **Errors during streaming** arrive as an `error` event *after* the HTTP 200 — handle them inside the stream loop.
- The SDKs **retry 408/409/429/5xx and connection errors automatically** (default `max_retries=2`, exponential backoff); tune with `max_retries` / `timeout`.
- Catch **typed exceptions** most-specific-first (`NotFoundError`, `RateLimitError`, `APIStatusError`, `APIConnectionError`), not one broad catch-all, and never string-match error messages.
- Log the **request ID** (`request-id` response header / `request_id`) for every failure.

### "Successful" responses that are still failures

| Signal | Meaning | Recovery |
|---|---|---|
| `stop_reason: "max_tokens"` | Output truncated | Raise `max_tokens`, request shorter output, or continue; don't parse truncated JSON |
| `stop_reason: "refusal"` | Safety classifier declined (HTTP 200) | Don't run tools from that turn; show a graceful message; fall back (server-side fallback on supported models) or route to human |
| `stop_reason: "pause_turn"` | Server-tool loop paused | Re-send to continue |
| `stop_reason: "model_context_window_exceeded"` | Context window full | Reduce input; compaction; retrieval |
| Invalid JSON / schema mismatch | Output contract broken | Structured outputs / strict tools; validate and retry with the error message |
| Tool error (`is_error: true` you returned) | Your tool failed | Informative message so Claude can adapt |
| Hallucinated/incorrect content | Model output problem | Grounding, citations, verification, evals |

## 2. Recovery strategy selection

| Error class | Strategy |
|---|---|
| Transient (429, 500, 529, network) | **Retry with exponential backoff + jitter**, cap attempts, honor `retry-after`; circuit breaker if failures persist |
| Capacity for a specific model | **Fallback** to another model/tier or platform; **queue** and process later; **Batches** for non-urgent work |
| Client error (400/401/403/404/413) | **Fail fast** and fix; alert; never infinite retry |
| Non-idempotent side effects | Idempotency keys; check state before retry |
| Output truncated | Increase `max_tokens` / continue / split the task |
| Invalid structured output | Re-ask with the validation error appended ("Your JSON was invalid because …") or switch to structured outputs |
| Tool failure inside an agent | Return `is_error: true` with actionable message; let Claude retry or choose another path; cap retries |
| Refusal | Graceful degradation, rephrase only if the request is legitimate, route to human |
| Persistent failure | **Graceful degradation**: cached answer, simpler model, "try again later", human handoff |

```python retry_with_backoff.py
import random, time, anthropic

client = anthropic.Anthropic(max_retries=0)       # we handle retries ourselves here

def call_with_retry(**params):
    for attempt in range(6):
        try:
            return client.messages.create(**params)
        except anthropic.RateLimitError as e:          # 429
            wait = float(e.response.headers.get("retry-after", 2 ** attempt))
        except anthropic.InternalServerError:          # 500 / 529
            wait = 2 ** attempt
        except anthropic.APIConnectionError:           # network
            wait = 2 ** attempt
        except anthropic.BadRequestError:              # 400 — do not retry
            raise
        time.sleep(wait + random.uniform(0, 1))        # jitter avoids thundering herd
    raise RuntimeError("exhausted retries")
```

## 3. Trace analysis to identify failure modes

A **trace** is the full record of a run: system prompt, every request/response, tool calls with inputs and outputs, stop reasons, token usage, timings and request IDs. Agents fail in recognizable ways:

| Failure mode | What you see in the trace | Typical fix |
|---|---|---|
| **Wrong tool selected** | Claude calls `search_web` when `search_kb` was right | Clarify tool descriptions (when to use / not use); reduce overlapping tools |
| **Bad tool arguments** | Wrong formats, invented IDs | Better parameter descriptions, enums, examples, `strict: true`, validation errors returned to Claude |
| **Ignored tool result** | Result present but answer contradicts it | Tool output too long/noisy; improve formatting; put key fields first |
| **Loop / repetition** | Same call repeated with same args | Errors not informative; add state/progress tracking; iteration cap as safety net |
| **Premature stop** | Loop exits after text + tool_use | Integration bug: check `stop_reason`, not content type |
| **Context overflow / drift** | Late-turn quality drops; earlier constraints forgotten | Prune outputs, compaction, subagents, restate key constraints |
| **Hallucination** | Claims without support in sources/tool results | Grounding instructions, citations, allow "I don't know", verification step |
| **Instruction conflict** | Behavior flips between turns | Contradictory instructions in system prompt / CLAUDE.md / tool descriptions |
| **Prompt injection** | Tool result contains instructions Claude followed | Treat as untrusted data; least privilege; approvals |

In Claude Code: inspect transcripts, use `claude --debug`, `/context`, hook logs, and `--output-format stream-json` for machine-readable traces. In your app: log everything needed to **replay** a request (prompt version, model ID, parameters, full messages).

## 4. Problem origin isolation: integration layer vs. model output

The most important debugging question: **is the bug in my code, or in what the model produced?**

:::key A practical isolation procedure
1. **Capture the exact request payload** your code sent (not what you *think* it sent) and the raw response.
2. **Replay it directly** (curl, Workbench/Console, a minimal script). If the raw response is correct, the bug is **downstream in your integration** (parsing, state handling, rendering).
3. If the raw response is wrong, check whether the **request** is what you intended: missing history, truncated documents, wrong system prompt version, tool results not appended, wrong model ID, stale cache of a template. That's still an integration bug.
4. Only if the request is correct and the output is wrong is it a **model-behavior** issue → improve prompt/tools/context, change model or effort, add examples, add validation — and capture the case in your eval set.
5. Reproduce several times — outputs vary between runs; a one-off is weaker evidence than a consistent pattern.
:::

| Symptom | More likely origin |
|---|---|
| 400 errors, missing `tool_use_id`, roles not alternating | Integration |
| JSON "invalid" only when responses are long | Integration (truncation from `max_tokens`) |
| Follow-up questions lose earlier context | Integration (history not resent) |
| Output correct in Console, wrong in app | Integration (assembly, parsing, encoding) |
| Same correct request consistently yields wrong reasoning | Model output (prompt/context/model choice) |
| Claude picks the wrong tool even with clean request | Model output, often fixable via tool descriptions |

## 5. Evals and testing (domain context)

- **Unit tests**: mock the API client to test your code paths (parsing, error handling, retries) deterministically and for free.
- **Integration tests**: small number of real calls verifying the contract (schema, tool loop) works end to end.
- **Evals**: datasets of representative, edge and adversarial inputs with graders — code-based (exact match, schema validation, tests), LLM-as-judge (rubric; validate against humans; ask for reasoning before the score; use a different/strong model), human review.
- **Regression**: every production bug becomes a new eval case.
- **Non-determinism**: run multiple samples; track pass rates, not single outcomes.

## Exam traps

:::trap Retrying a 400 error
Client errors won't fix themselves; retrying wastes quota and hides the bug. Only transient errors (429, 5xx, 529, network) should be retried.
:::

:::trap Blaming the model for an integration bug
If the replayed raw request produces the right answer, the defect is in your parsing, state or rendering. If the request itself is missing context, that's also your code.
:::

:::trap Retrying immediately without backoff
Immediate retries during overload amplify the problem. Use exponential backoff with jitter and respect `retry-after`.
:::

:::trap Treating `refusal` as an HTTP error
Refusals return HTTP 200 with `stop_reason: "refusal"`. Check `stop_reason` before reading content or executing tools.
:::

## Practice questions

{{quiz:d4-dbg-01}}

{{quiz:d4-dbg-02}}

{{quiz:d4-dbg-03}}

## Build exercise

:::exercise Fault injection and trace debugging
1. Wrap your Claude client with a logger that stores, per request: timestamp, prompt version, model, full request JSON, response JSON, `stop_reason`, `usage`, latency, request ID.
2. Inject faults: (a) invalid model ID → 404, (b) remove the `tool_use` block from history → 400, (c) `max_tokens: 30` on a JSON task → truncation, (d) simulate 429 with a mock → verify backoff + jitter.
3. Build a replay command that re-sends any logged request and diffs the response.
4. Create an agent bug on purpose (two overlapping tools with vague descriptions); find it from the trace and fix it via descriptions.
5. Write an eval with 20 cases including 3 adversarial ones; turn each bug you fixed into a regression case.
:::
