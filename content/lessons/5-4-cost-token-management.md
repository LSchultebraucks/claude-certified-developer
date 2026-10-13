---
skill: 5.4
title: Cost and Token Management
summary: Track token usage, build cost models, and cut spend with prompt caching (breakpoints, TTLs, cache check-pointing), batching, effort, output control and routing — with worked cost calculations.
sources: Prompt caching | https://platform.claude.com/docs/en/build-with-claude/prompt-caching; Pricing | https://platform.claude.com/docs/en/about-claude/pricing; Token counting | https://platform.claude.com/docs/en/build-with-claude/token-counting; Usage and Cost API | https://platform.claude.com/docs/en/build-with-claude/usage-cost-api; Batch processing | https://platform.claude.com/docs/en/build-with-claude/batch-processing
---

## What you need to know

Expect calculations ("how much does caching save here?") and diagnosis ("cache hit rate is zero — why?"). Learn the multipliers, the prefix rule and the order of levers.

## Token usage tracking

Every response includes `usage`:

```json
"usage": {
  "input_tokens": 1830,                  // uncached input after the last cache breakpoint
  "cache_creation_input_tokens": 0,      // written to cache this request (premium)
  "cache_read_input_tokens": 48211,      // read from cache (discounted)
  "output_tokens": 712                   // includes thinking tokens
}
```

- **Total input** = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`.
- Log usage **per request, per feature, per tenant/user, per model** — that's your cost attribution.
- **Before** sending: `POST /v1/messages/count_tokens` for budgets and routing decisions.
- **Organization level**: the Console usage/cost views and the **Usage & Cost Admin API** (admin key) for reporting; **workspaces** to separate projects with their own keys, rate limits and **spend limits**.
- In Claude Code / Agent SDK: `/cost`/usage views, `total_cost_usd` in JSON results, `max_budget_usd` caps.

## Cost modeling

**Cost per request** = Σ (tokens of each type × price for that type).

| Token type | Price relative to base input |
|---|---|
| Uncached input | 1× |
| Cache write, 5-minute TTL | **1.25×** |
| Cache write, 1-hour TTL | **2×** |
| Cache read | **~0.1×** (lower on some newest models) |
| Output (incl. thinking) | model's output price — typically **5× input** |
| Batches API | **50%** of the above |

:::example Worked example — illustrative prices
Assume a model at **$3 / MTok input** and **$15 / MTok output**. A RAG chat request: 20,000-token static system prompt + docs, 1,000 tokens of conversation, 500 output tokens.

**No caching:** 21,000 × $3/1M + 500 × $15/1M = $0.063 + $0.0075 = **$0.0705**

**With caching (5-min TTL) on the 20,000-token prefix:**
- First request (write): 20,000 × $3.75/1M + 1,000 × $3/1M + 500 × $15/1M = $0.075 + $0.003 + $0.0075 = **$0.0855**
- Later requests (read): 20,000 × $0.30/1M + 1,000 × $3/1M + 500 × $15/1M = $0.006 + $0.003 + $0.0075 = **$0.0165**

Over 100 requests within the TTL window: no cache ≈ $7.05; cached ≈ $0.0855 + 99 × $0.0165 ≈ **$1.72** (−76%). Input processing latency drops as well.
:::

**Monthly model** = requests/month × average cost/request, broken down by route; include retries, tool loop turns (agents re-send growing history every turn!), and thinking. For agents, model **cost per completed task**.

## Prompt caching mechanics

- **Prefix match**: the cache key is the exact bytes of the prompt **up to a breakpoint**. Rendering order is **`tools` → `system` → `messages`**. Any change at position N invalidates everything after N.
- Mark breakpoints with `"cache_control": {"type": "ephemeral"}` (5-minute TTL default) or `{"type": "ephemeral", "ttl": "1h"}` on a content block, tool definition or system block — or use **top-level automatic caching** that places a breakpoint on the last cacheable block and moves it as the conversation grows.
- **Max 4 breakpoints** per request.
- **Minimum cacheable length** depends on the model (roughly 512–4,096 tokens); shorter prefixes silently don't cache.
- **TTL is refreshed on every hit** at no cost; entries become readable once the first response starts streaming (parallel identical requests all pay full price — warm with one request first).
- Caches are **isolated per organization/workspace** and **per model**.
- On most models, **cache reads don't count toward input-token rate limits** — caching also raises effective throughput.
- Verify with `usage.cache_read_input_tokens`; if it stays 0 on repeated identical prefixes, something invalidates the prefix.

```python caching.py
resp = client.messages.create(
    model="claude-sonnet-5-5", max_tokens=1024,
    tools=TOOLS,                                       # stable, deterministic order
    system=[{"type": "text", "text": BIG_STATIC_INSTRUCTIONS_AND_DOCS,
             "cache_control": {"type": "ephemeral"}}],  # breakpoint 1: tools + system
    messages=history_with_last_user_block_marked,       # breakpoint 2: conversation so far
)
```

### Silent cache invalidators

| Pattern | Why it breaks caching |
|---|---|
| Timestamp / "current date" / request ID in the system prompt | Prefix changes every request |
| Non-deterministic JSON (unsorted keys, sets) | Bytes differ even if data is equal |
| Per-user data interpolated early (name, ID) in system prompt | No sharing across users |
| Tool list varies per request / reordered | Tools render first → everything invalidated |
| Switching models mid-conversation | Caches are model-scoped |
| Toggling thinking or effort per request | Invalidates (parts of) the cache |
| Editing earlier messages (history rewriting) | Everything after the edit misses |

Fix: keep stable content first, move volatile content **after** the last breakpoint (end of messages), serialize deterministically, keep tools and model fixed per session. For mid-session instruction changes on supporting models, append a `role: "system"` message instead of editing the system prompt.

## Cache check-pointing

**Cache check-pointing** means placing multiple breakpoints at **stability boundaries** so each layer can be reused independently, and **advancing the breakpoint as a conversation grows** so each turn reads everything before it:

```text
[tools]           ← changes: never           ┐
[system prompt]   ← changes: per release     ├─ breakpoint 1 (1h TTL if traffic is bursty)
[docs/context]    ← changes: daily           ─ breakpoint 2
[conversation]    ← grows per turn           ─ breakpoint 3 on the latest turn (moves forward)
[new question]    ← unique                   (after the last breakpoint, never cached)
```

- In multi-turn chats/agents, mark the **last block of the latest turn**; the next request reads the whole previous prefix and writes only the delta. Healthy signature: `cache_read_input_tokens` grows each turn, `cache_creation_input_tokens` stays small.
- **Lookback window**: a breakpoint searches back a limited number of blocks (~20) for a prior entry; for very long turns add intermediate breakpoints.
- **Longer TTLs must come before shorter TTLs** when mixing (1-hour breakpoints earlier in the prompt than 5-minute ones).
- **TTL choice**: requests sharing the prefix less than 5 minutes apart → 5-minute TTL (each hit refreshes it). Gaps of 5–60 minutes → 1-hour TTL (2× write pays off after ~3 uses). Pre-warm with a `max_tokens: 0` request before latency-sensitive traffic.
- **Break-even**: 5-minute TTL pays off from the **second** request (1.25 + 0.1 < 2); 1-hour TTL from the **third** (2 + 0.1 + 0.1 < 3).
- **Don't cache** prompts whose beginning changes every time — you'd pay the write premium with no reads.

## The order of cost levers

1. **Free wins** (no quality trade-off): prompt caching; remove unneeded input (trim history, prune tool outputs, shorter tool descriptions only if clarity is kept); output-token hygiene (ask for concise formats, structured outputs, sensible `max_tokens`); Batches API for anything not time-critical; avoid unnecessary retries/turns.
2. **Trade-offs** (measure with evals): lower **effort**; smaller **model tier** or routing/cascades; fewer few-shot examples; summarizing/compacting context.
3. **Architecture**: sub-agents with cheaper models for bulk reading; programmatic tool calling to keep big intermediate data out of context; RAG instead of stuffing whole corpora.

:::key Output tokens are the expensive ones
Output usually costs ~5× input and adds latency token by token. Verbose answers, unnecessary preambles, and excessive thinking drive both cost and latency. Constrain formats and pick effort deliberately.
:::

## Token budgeting

- **`max_tokens`**: hard per-response cap (truncates, model isn't aware). Not a way to make answers concise — instruct for length instead.
- **Effort**: soft control over thoroughness and token spend.
- **Task budgets** (beta, newest models): tell the model its token budget for an agentic task so it paces itself.
- **Agent SDK / Claude Code**: `max_turns`, `max_budget_usd`.
- **Application budgets**: per-user/day quotas, per-tenant spend alerts, workspace spend limits.

## Exam traps

:::trap Timestamp at the top of the system prompt
A classic reason for a zero cache hit rate. Move dynamic values after the last breakpoint.
:::

:::trap Breakpoint at the end of a prompt whose last part is unique per request
If the marker sits after the varying question, every request writes a new entry and nothing is read. Put the breakpoint at the end of the *shared* part.
:::

:::trap Assuming caching reduces output cost
Caching discounts repeated **input** prefixes only. Output tokens are unaffected.
:::

:::trap Reading `input_tokens` as the full prompt size
With caching, `input_tokens` is just the uncached remainder; add cache reads and writes.
:::

## Practice questions

{{quiz:d5-cost-01}}

{{quiz:d5-cost-02}}

{{quiz:d5-cost-03}}

## Build exercise

:::exercise Cut a workload's cost by 70% without losing quality
1. Build a baseline: 100 questions against a 25K-token policy document; log `usage` and compute cost with your model's prices.
2. Add a `cache_control` breakpoint after the document; verify `cache_read_input_tokens > 0` from the second request; recompute cost.
3. Introduce a bug: add `datetime.now()` to the top of the system prompt; observe the hit rate collapse; fix it.
4. Multi-turn: mark the last block of each new turn; show that cache reads grow every turn while writes stay small.
5. Move the 100 questions to the Batches API (keep caching); compare.
6. Try a lower effort level and a smaller model; keep only changes that hold your eval score. Report savings per lever.
:::
