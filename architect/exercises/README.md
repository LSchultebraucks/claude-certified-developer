# Architect build exercises — reference solutions

Reference implementations for the core CCA-F build exercises, with offline tests. The tests reuse the local Messages API mock from `exercises/mock_api.py` — no API key, no cost.

| Function in `solutions.py` | Lesson | What it demonstrates |
|---|---|---|
| `run_agent` | 1.1 | Loop driven by `stop_reason`; all `tool_result`s in one user message; tool errors as `is_error`; the turn cap raises `BudgetExceeded` and `max_tokens` raises `TruncatedResponse` instead of pretending to be done |
| `SupportSession` / `gated_refund` | 1.4 | Prerequisite gate in code: no refund before verified identity; refunds above the limit redirected to escalation |
| `tool_error` / `tool_ok` | 2.2 | MCP-style structured errors (`isError`, category, `isRetryable`, message); an empty result is a success |
| `extract_with_retry` | 4.3, 4.4 | Forced `tool_choice` with a JSON schema, nullable fields, semantic validation in code, retry with the specific error, capped, then `needs_review` |
| `resubmit_failed` | 4.5 | Resubmit only the failed `custom_id`s of a finished batch |
| `should_escalate` | 5.2 | Escalate on explicit requests, policy gaps, authority limits and lack of progress — never on sentiment or self-reported confidence |

```bash
pip install anthropic
python architect/exercises/test_solutions.py
```

The output should end with `All 21 checks passed.`
