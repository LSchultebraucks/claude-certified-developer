---
skill: 6.3
title: Output Handling
summary: Produce reliable structured output, validate responses beyond schema, parse defensively, handle truncation and refusals, and stay skeptical of confident output — verify, ground and encode before acting on it.
sources: Structured outputs | https://platform.claude.com/docs/en/build-with-claude/structured-outputs; Increase output consistency | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency; Reduce hallucinations | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations; Citations | https://platform.claude.com/docs/en/build-with-claude/citations; OWASP Top 10 for LLM Applications (Improper Output Handling) | https://genai.owasp.org/
---

## What you need to know

Model output is the input to *your* system. This skill covers the pipeline **produce → validate → parse → verify → use safely**.

## Structured output patterns

| Pattern | Guarantees | Use when |
|---|---|---|
| **Prompt-only format instructions** ("Return JSON with keys…") | Nothing — usually works, sometimes doesn't | Prototyping, human-read output |
| **Tags in the response** (`<answer>…</answer>`) + extraction | Easier extraction; no schema guarantee | Free text with one extractable part |
| **Structured outputs** (`output_config.format` with a JSON schema; SDK `messages.parse()` with Pydantic/Zod) | **Response is valid JSON matching the schema** | Any machine-consumed response |
| **Strict tool use** (`strict: true` on a tool) | **Tool `input` matches the tool's schema** | Function calling where arguments must be exact |
| **Tool-as-schema** (a tool whose input schema is the desired output) | Strong with strict; older pattern | When you already use tools |

```python structured_output.py
from pydantic import BaseModel
from typing import Literal

class Triage(BaseModel):
    category: Literal["billing", "technical", "account", "other"]
    urgency: Literal["low", "medium", "high"]
    summary: str
    needs_human: bool

resp = client.messages.parse(
    model="claude-sonnet-5-5", max_tokens=1024,
    messages=[{"role": "user", "content": f"<ticket>{ticket}</ticket>\nTriage this ticket."}],
    output_format=Triage,
)
if resp.stop_reason == "refusal":
    route_to_human(ticket)
else:
    triage: Triage = resp.parsed_output     # validated instance
```

Limits to remember: the supported JSON Schema subset excludes some features (e.g., recursive schemas; numeric/string-length constraints are validated client-side by the SDKs, not enforced by the API); structured outputs are **incompatible with citations** and with prefill; a **refusal** or **`max_tokens`** truncation can still yield output that doesn't satisfy the schema — check `stop_reason`.

## Response validation (beyond the schema)

Schema-valid ≠ correct. Validate in layers:

1. **Stop reason**: `end_turn` (or `tool_use`) expected; handle `max_tokens`, `refusal`, `model_context_window_exceeded`.
2. **Syntax/schema**: parse and validate (Pydantic/Zod/JSON Schema).
3. **Semantic/business rules**: dates in range, totals add up, IDs exist in your database, enum values allowed for this user, required citations present.
4. **Consistency/grounding**: claims supported by provided sources (quotes match, citations point at real passages).
5. **Policy/safety**: no PII leakage, no disallowed content, no promises your business forbids (e.g., refunds).

On failure: **retry with feedback** (send the validation error back: "Field `total` = 120 but line items sum to 112; correct it"), fall back to a stronger model or human review, or fail gracefully. Cap retries.

## Defensive parsing

- Use real parsers (`json.loads`, `JSON.parse`) — **never regex JSON** out of free text if you can avoid it.
- **Iterate content blocks by type**; don't assume `content[0]` is text (there may be thinking, tool_use or multiple text blocks; citations split text into several blocks).
- Handle **missing/null/extra fields** gracefully; default carefully; reject unknown enum values.
- Tool-call `input` may differ in escaping between model versions — parse it as JSON, don't string-compare.
- **Streaming**: accumulate partial JSON until the block ends; with eager input streaming, validate parsed inputs before executing tools.
- Wrap parsing in try/except; **log the raw output** with the request ID for debugging.
- Never `eval()` or execute model output directly.

## Skepticism toward confident output

LLMs can be **fluent, confident and wrong**. Confidence in tone is not evidence. Self-reported confidence scores are not calibrated probabilities.

Techniques that reduce and catch hallucinations:
- **Allow "I don't know"** explicitly ("If the documents don't contain the answer, say so").
- **Ground in sources**: provide documents; require **direct quotes** first, then answer based on them; enable **citations**; require source IDs in the schema.
- **Verify with tools**: run the code/tests, query the database, re-read the file, check the URL exists.
- **Cross-check**: ask a second pass (or another model) to find unsupported claims; best-of-N / self-consistency for high-stakes outputs.
- **Retract mechanism**: instruct Claude to withdraw claims it can't support with a quote.
- **Human review** for high-impact decisions (legal, medical, financial, irreversible actions).
- **Evals with adversarial cases** (unanswerable questions, conflicting sources).

## Safe consumption: improper output handling

Treat output like untrusted user input when it flows downstream:

| Downstream use | Risk | Control |
|---|---|---|
| Rendered as HTML/Markdown in a browser | XSS, malicious links/images that exfiltrate data | Escape/sanitize HTML, restrict link/image domains, CSP |
| Inserted into SQL | SQL injection | Parameterized queries; never string-concatenate |
| Executed as shell/code | Command injection, destruction | Sandbox, allowlists, human approval; never `eval` |
| Passed to another LLM/agent | Prompt injection propagation | Delimit and label as untrusted |
| Used as file paths | Path traversal | Resolve and confine to an allowed root |
| Sent to customers | Wrong commitments, PII | Policy checks, approval workflows |

## Exam traps

:::trap "Structured outputs guarantee correct data"
They guarantee the *shape*, not the truth. Business validation and grounding are still required.
:::

:::trap Trusting a model's self-reported confidence
"confidence: 0.98" is generated text, not a calibrated probability. Verify against sources or tools.
:::

:::trap Assuming the first content block is the answer
Responses can contain thinking, tool_use and multiple text blocks. Select blocks by type.
:::

:::trap Rendering model output as raw HTML
Model output can carry injected markup or exfiltration links (especially after reading untrusted content). Encode and sanitize.
:::

## Practice questions

{{quiz:d6-out-01}}

{{quiz:d6-out-02}}

## Build exercise

:::exercise A defensive output pipeline
1. Define a Pydantic model for an invoice (`vendor`, `invoice_number`, `date`, `currency` enum, `line_items[]`, `total`) and extract with `messages.parse()` from 20 sample invoices.
2. Add business validation: line items sum to total (±0.01), date not in the future, currency allowed. On failure, retry once with the validation error appended.
3. Handle `stop_reason` `max_tokens` (raise limit, retry) and `refusal` (route to manual queue).
4. Add grounding: require a `source_quote` for `total` and verify the quote appears in the document text.
5. Render the extracted data in a web page with HTML escaping; test with an invoice containing `<img src=x onerror=alert(1)>` in the vendor name.
6. Log raw outputs with request IDs and build a dashboard of validation-failure reasons.
:::
