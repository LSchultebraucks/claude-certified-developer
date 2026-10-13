---
skill: 2.4
title: Software Engineering Foundations
summary: REST and HTTP semantics, JSON, async programming and concurrency, git workflows, CI/CD integration, code review, and small- vs. large-scale refactoring — with Claude in the loop.
sources: HTTP semantics (RFC 9110) | https://www.rfc-editor.org/rfc/rfc9110; Python asyncio | https://docs.python.org/3/library/asyncio.html; Claude Code GitHub Actions | https://code.claude.com/docs/en/github-actions; Claude Code common workflows | https://code.claude.com/docs/en/common-workflows; Claude Code headless mode | https://code.claude.com/docs/en/headless
---

## What you need to know

At 7.4%, this is the second-heaviest skill. The exam assumes you are a working software engineer: you must read HTTP and JSON fluently, write correct async code against an API with rate limits, use git and CI properly, review code, and plan refactors — including when Claude (via the API or Claude Code) does part of the work.

## REST APIs and HTTP

**REST** models resources addressed by URLs and manipulated through HTTP methods.

| Method | Semantics | Safe? | Idempotent? |
|---|---|---|---|
| `GET` | Read a resource | Yes | Yes |
| `POST` | Create / trigger processing | No | **No** (unless you add an idempotency key) |
| `PUT` | Replace a resource at a known URL | No | Yes |
| `PATCH` | Partial update | No | Not necessarily |
| `DELETE` | Remove | No | Yes |

**Idempotent** = repeating the request has the same effect as doing it once. This matters for retries: retrying a timed-out `POST /payments` can charge twice unless the server supports an **idempotency key**.

| Status | Meaning | Typical handling |
|---|---|---|
| 200 / 201 / 204 | OK / Created / No content | Success |
| 400 | Bad request (malformed, invalid params) | Fix the request — don't retry blindly |
| 401 | Unauthenticated (missing/invalid credentials) | Fix credentials |
| 403 | Authenticated but not permitted | Fix permissions |
| 404 | Not found (Claude API: also unknown or unavailable model) | Fix URL / ID |
| 409 | Conflict | Re-read state, resolve |
| 413 | Payload too large | Reduce size |
| 422 | Semantically invalid | Fix input |
| 429 | Rate limited | Back off; honor `retry-after` |
| 500 / 502 / 503 | Server-side failure | Retry with exponential backoff |
| 529 | Anthropic-specific: API overloaded | Retry with backoff; consider fallback |

Other essentials: **headers** (auth, content type, versioning, rate-limit info), **pagination** (cursor-based like `after_id`/`has_more` is more robust than offsets), **versioning** (Anthropic uses the `anthropic-version` header), **timeouts** on every client call, and TLS everywhere.

## JSON

- Types: object, array, string, number, boolean, null. No comments, no trailing commas, double-quoted keys and strings.
- **Parse, don't regex**: use `json.loads` / `JSON.parse` and validate against a schema (JSON Schema, Pydantic, Zod). LLM tool inputs may contain escaping differences — never string-match raw serialized JSON.
- **Deterministic serialization** matters for caching: `json.dumps(obj, sort_keys=True)` keeps byte-identical prompts; unordered sets or dicts can silently break prompt-cache hits.
- Large integers, floating point precision, dates (use ISO 8601 strings) and Unicode escaping are common bugs.
- **JSON Schema** describes structure (`type`, `properties`, `required`, `enum`, `additionalProperties: false`) — the same language Claude uses for tool `input_schema` and structured outputs.

## Asynchronous programming and concurrency

LLM calls are **I/O-bound** and slow (seconds). Async code lets one process handle many concurrent requests without blocking.

```python async_fanout.py
import asyncio
from anthropic import AsyncAnthropic

client = AsyncAnthropic()            # async client; retries 429/5xx automatically (max_retries=2 default)
sem = asyncio.Semaphore(8)           # bound concurrency to stay under rate limits

async def summarize(doc: str) -> str:
    async with sem:
        msg = await client.messages.create(
            model="claude-haiku-5-5", max_tokens=512,
            messages=[{"role": "user", "content": f"Summarize:\n<doc>{doc}</doc>"}],
        )
        return msg.content[0].text

async def main(docs):
    results = await asyncio.gather(*(summarize(d) for d in docs), return_exceptions=True)
    for doc, r in zip(docs, results):
        if isinstance(r, Exception):
            log_failure(doc, r)        # one failure must not kill the whole batch

asyncio.run(main(documents))
```

Key ideas:
- **`await` doesn't run things in parallel by itself** — `asyncio.gather` / `Promise.all` start tasks concurrently.
- **Bound concurrency** (semaphore, worker pool, queue) to respect rate limits; unbounded fan-out triggers 429s.
- **Don't block the event loop** with synchronous calls (use the async client, not the sync one, inside async code).
- **Handle partial failure**: `return_exceptions=True` or `Promise.allSettled`.
- **Timeouts and cancellation**: set per-request timeouts; cancel work the user abandoned.
- **Backpressure**: queues with max size keep producers from overwhelming consumers.
- For a few thousand non-urgent items, the **Batches API** is often simpler and cheaper than your own async fan-out.
- Threads/processes: threads help for blocking I/O in sync code; processes for CPU-bound work (Python GIL).

## Version control (git)

- **Small, focused commits** with descriptive messages; one logical change per commit.
- **Branching**: feature branches + pull requests (GitHub flow) or trunk-based development with short-lived branches and feature flags.
- **Pull requests** are the unit of review and CI.
- **Never commit secrets**: `.env` in `.gitignore`, secret scanning, rotate anything leaked (history rewriting does not un-leak a pushed key).
- `git revert` creates an inverse commit (safe on shared branches); `git reset --hard` / force-push rewrites history (dangerous on shared branches).
- **Worktrees** (`git worktree`) let you run multiple Claude Code sessions on separate branches of the same repo in parallel.
- Version **prompts, tool schemas, eval sets, CLAUDE.md and `.claude/settings.json`** alongside code.

## SDLC integration: CI/CD with Claude

- **CI pipeline** for LLM apps: lint → unit tests (mock the API) → **eval suite** (real API, small but representative) → build → deploy. Fail the pipeline on eval regression.
- **Claude Code in CI**: `claude -p "<task>"` (headless/print mode) with `--output-format json` or `stream-json`, explicit `--allowedTools`, and a restricted permission mode. Example uses: triage failing tests, generate release notes, label issues.
- **Claude Code GitHub Actions** (`anthropics/claude-code-action`): mention `@claude` in an issue or PR to have Claude analyze, implement or review; configure via workflow YAML with the API key in **GitHub Secrets** (or Bedrock/Vertex via OIDC).
- Keep **humans in the merge path**: Claude can open PRs; a human approves.

## Code review

What good review checks: correctness, tests, security (injection, authz, secrets), error handling, readability, performance, consistency with conventions, and **scope** (does the PR do one thing?).

With Claude:
- **Claude Code** can review the working diff (e.g., `/review`, `/security-review`, or `/code-review`-style commands) and you can encode team standards in CLAUDE.md or a review skill.
- In CI, Claude can post review comments on PRs.
- A **fresh context** reviews better than the session that wrote the code — the writer's context is biased by its own reasoning. Use a separate session or subagent as reviewer.
- Treat AI review as an **additional** reviewer, not a replacement for human approval on risky changes.

## Refactoring: small and large scale

**Refactoring** = changing internal structure without changing external behavior. The safety net is **tests** — write characterization tests first if coverage is missing.

| Scale | Examples | Approach |
|---|---|---|
| **Small** | Rename, extract function, remove duplication, simplify conditionals | IDE refactorings or Claude Code edits; run tests after each step; small commits |
| **Medium** | Restructure a module, change an internal interface | Plan first (Claude Code **plan mode**), update callers, tests green at each commit |
| **Large-scale** | Framework migration, language migration, API version upgrade across hundreds of files, monolith → services | Incremental strategies (below), automation, parallelization, staged rollout |

Large-scale strategies:
- **Strangler fig**: route functionality piece by piece to the new implementation while the old one keeps running, until the old one can be removed.
- **Branch by abstraction**: introduce an abstraction layer, switch implementations behind it, remove the old one.
- **Expand–contract** (parallel change) for APIs/schemas: add the new form, migrate callers, then remove the old form.
- **Codemods** / AST-based transforms for mechanical changes; LLM assistance for the non-mechanical remainder.
- **Feature flags** to decouple deploy from release.

Large refactors with Claude Code:
1. **Explore and plan** in plan mode (read-only); write the plan to a file (e.g., `MIGRATION.md`) with a checklist.
2. **Pilot** on a few files; refine instructions/CLAUDE.md based on mistakes.
3. **Fan out**: process files in parallel with subagents, git worktrees or a headless loop (`for f in $(cat files.txt); do claude -p "migrate $f per MIGRATION.md" --allowedTools Edit,Read,"Bash(npm test *)"; done`).
4. **Verify** each unit with tests/type checks (hooks can run them after every edit).
5. **Review and merge in small batches** — not one 400-file PR.

## Exam traps

:::trap Retrying non-idempotent requests blindly
A retry after a timeout may duplicate a side effect (payment, email). Use idempotency keys or check state before retrying.
:::

:::trap Unbounded `asyncio.gather` over 10,000 API calls
This triggers rate limiting and failures. Bound concurrency, back off on 429, or use the Batches API.
:::

:::trap One giant refactoring PR
Large changes should be incremental, test-backed and reviewable. A single massive PR (human- or AI-generated) is hard to review and risky to roll back.
:::

:::trap Letting the same session that wrote the code be the only reviewer
Independent review (separate session, subagent, or human) catches more issues than self-review in the same context.
:::

## Practice questions

{{quiz:d2-swe-01}}

{{quiz:d2-swe-02}}

{{quiz:d2-swe-03}}

## Build exercise

:::exercise Production-grade API client and a guided refactor
1. Write an async summarizer for 500 documents with `AsyncAnthropic`, a semaphore (start at 8), per-request timeouts, and `return_exceptions=True`. Log `usage` per call.
2. Add a retry wrapper for 429/529/5xx with exponential backoff + jitter that honors `retry-after`; make sure 400s are *not* retried.
3. Serialize all prompt inputs deterministically (`sort_keys=True`) and verify cache hits on repeated runs.
4. Put the project in git with feature branches, a PR template and a GitHub Actions workflow that runs unit tests + a 20-case eval.
5. Use Claude Code in plan mode to plan a refactor (e.g., extract an API client module); execute it in small commits with tests green at each step; then ask a fresh Claude session (or subagent) to review the diff.
:::
