---
skill: 5.3
title: Model Selection and Tradeoffs
summary: When to use Opus, Sonnet or Haiku (and the top Fable tier), how to trade quality against latency and cost, which models support adaptive thinking, and the breaking changes you must expect between model releases.
sources: Models overview | https://platform.claude.com/docs/en/about-claude/models/overview; Choosing a model | https://platform.claude.com/docs/en/about-claude/models/choosing-a-model; Pricing | https://platform.claude.com/docs/en/about-claude/pricing; Model deprecations | https://platform.claude.com/docs/en/about-claude/model-deprecations; Migration guide | https://platform.claude.com/docs/en/about-claude/models/migrating-to-claude-4
---

## What you need to know

The exam tests **reasoning about fit**, not memorizing a price sheet: given a task's quality bar, latency budget, volume and cost constraints, which tier is appropriate, and what can break when you switch models. Prices and model names change; the trade-off logic doesn't.

## The model tiers

| Tier | Positioning | Typical use cases | Trade-off |
|---|---|---|---|
| **Opus** | Most capable mainstream tier: deep reasoning, long-horizon agentic work, complex coding, hard analysis | Complex agents, difficult code changes, research synthesis, orchestrator/lead agents, high-stakes analysis | Highest quality, higher cost and latency than Sonnet/Haiku |
| **Sonnet** | Balance of intelligence and speed: strong at coding and agentic tasks | Most production apps: coding assistants, customer-facing chat with tools, RAG, enterprise workflows | Near-top quality at lower cost/latency |
| **Haiku** | Fastest and cheapest | High-volume classification, routing, extraction, moderation, real-time UX, sub-agent workers, simple summarization | Lowest cost and latency; less capable on hard reasoning |
| **Fable** (top tier, 2026) | Anthropic's most capable widely released model | The most demanding reasoning and long-horizon agentic work where quality outweighs cost | Highest price; long turns; different API behaviors to plan for |

:::current Model lineup snapshot (verify before relying on numbers)
As of October 2026 the current models include Claude **Fable 5.1** ($10 / $50 per million input/output tokens), **Opus 5.5** ($4 / $20), **Sonnet 5.5** ($2 / $10) and **Haiku 5.5** ($0.10 / $0.50 for prompts ≤ 100K tokens), all with 1M-token context windows and up to 128K output tokens; previous generations (Opus 5 / 4.8 / 4.7 / 4.6, Sonnet 5 / 4.6, Haiku 4.5) remain available until deprecated. Use the Models API (`GET /v1/models`) for live capabilities and the pricing page for current prices.
:::

## Quality / latency / cost: the decision levers

| Lever | Increases quality | Reduces latency | Reduces cost |
|---|---|---|---|
| Bigger tier (Haiku → Sonnet → Opus → Fable) | ✓ | ✗ | ✗ |
| Higher effort / thinking | ✓ (hard tasks) | ✗ | ✗ |
| Lower effort | (may drop on hard tasks) | ✓ | ✓ |
| Streaming | — | ✓ perceived (TTFT) | — |
| Prompt caching | — | ✓ (less prefill) | ✓ |
| Batches API | — | ✗ (async) | ✓ 50% |
| Fast mode (supported Opus models) | — | ✓ output speed | ✗ premium price |
| Shorter outputs (format constraints) | — | ✓ | ✓ |
| Routing / cascades (cheap model first, escalate when needed) | ≈ | ✓ on average | ✓ on average |

Approaches to selecting:
1. **Start with the most capable reasonable model to establish what quality is achievable**, build the eval, then **try cheaper tiers/lower effort** and keep the cheapest that meets the bar. (Alternative: start cheap for clearly simple high-volume tasks and escalate only if evals fail.)
2. **Measure cost per completed task**, not per request — a cheaper model that needs more turns or retries can cost more overall.
3. **Before building a multi-model cascade**, test the simpler option: the strong model at lower effort. One model also keeps one prompt-cache namespace (caches are model-scoped).
4. **Route by task type**: Haiku classifier at the front; Sonnet for the common path; Opus/Fable for the hard tail or the orchestrator; Haiku sub-agents for bulk reading.

### Example selections

| Scenario | Good choice | Why |
|---|---|---|
| 5M product reviews/month → sentiment + topic labels | Haiku (+ Batches) | Simple, high volume, cost-dominated |
| IDE assistant writing multi-file changes | Sonnet or Opus at high effort | Coding quality, tool use |
| Autonomous migration agent running for hours | Opus / Fable, high/xhigh effort | Long-horizon reliability matters more than cost |
| Real-time voice bot with 1 s budget | Haiku (or Sonnet with low effort), streaming | Latency-critical |
| Research system with lead + workers | Opus/Fable lead, Sonnet/Haiku workers | Spend capability where planning happens |
| Content moderation pre-filter in front of a main model | Haiku | Fast, cheap screening |

## Adaptive thinking support

- **Adaptive thinking** (`thinking: {"type": "adaptive"}`) is the recommended mode on Claude **4.6 and later** models (Opus 4.6+, Sonnet 4.6+, the 5.x families, Fable). On several of the newest models thinking is **on by default or always on**, controlled only through **effort**.
- **Older models** (e.g., Sonnet 4.5, Haiku 4.5) use **extended thinking with `budget_tokens`** instead and don't support adaptive thinking.
- Effort availability also differs by model (e.g., `xhigh` arrived with Opus 4.7; some older models support no effort parameter).
- Check capabilities at runtime with the **Models API** (`capabilities.thinking.types.adaptive.supported`).

## Breaking behavior changes across releases

Treat a model upgrade like a dependency upgrade with a changelog. Changes seen across recent generations include:

| Change type | Examples | Impact |
|---|---|---|
| **Removed/rejected parameters** | `temperature`/`top_p`/`top_k` rejected on newest models; `budget_tokens` removed in favor of adaptive thinking; thinking cannot be disabled on some models | 400 errors after a model-ID swap |
| **Removed features** | Assistant **prefill** no longer supported; **forced tool choice** (`any`/`tool`) rejected on some newest models | Code relying on them breaks |
| **New stop reasons / outputs** | `refusal` with `stop_details`, `model_context_window_exceeded`, `pause_turn` | Loops that only check `end_turn`/`tool_use` mis-handle responses |
| **Tokenizer changes** | Same text → more tokens on a newer tokenizer | Higher cost, earlier context limits; re-baseline with `count_tokens` |
| **Changed defaults** | Default effort level, thinking display default (omitted vs summarized), thinking on by default | Different latency, verbosity, UI behavior |
| **Behavioral shifts** | More literal instruction following; less verbose; different tool-use eagerness; prompts written for older models become "too prescriptive" | Prompt re-tuning needed |
| **Safety behavior** | Safety classifiers that can decline certain categories | Need refusal handling and fallbacks |
| **Caching** | Different minimum cacheable prompt length per model; caches are model-scoped | Cache hit rates change after switching |

:::remember Model-switch checklist
Read the migration notes → update parameters → run evals (quality, tokens, latency, cost) → re-tune prompts → handle new stop reasons → shadow/canary → keep the old model ID for rollback.
:::

## Exam traps

:::trap "Always use the most powerful model"
Over-provisioning wastes money and adds latency for simple tasks. Choose the cheapest model that meets the measured quality bar.
:::

:::trap "Always use the cheapest model"
For complex agentic tasks, a cheaper model may need more turns, more retries or human fixes — costing more per completed task.
:::

:::trap Swapping the model ID in production without testing
Parameter removals, tokenizer changes and behavior shifts can break code and prompts. Evaluate first.
:::

:::trap Assuming every model supports the same thinking configuration
Adaptive thinking, budget-based thinking and effort levels vary by model generation. Verify per model.
:::

## Practice questions

{{quiz:d5-sel-01}}

{{quiz:d5-sel-02}}

## Build exercise

:::exercise Run a model bake-off
1. Take your 30–50 case eval set from earlier lessons.
2. Run it on three tiers (e.g., Haiku, Sonnet, Opus) and two effort levels each (where supported). Record accuracy, average input/output tokens, p50/p95 latency and cost per 1,000 tasks.
3. Plot quality vs. cost; pick the cheapest configuration meeting your bar.
4. Implement a router: Haiku classifies difficulty; easy → Haiku, hard → Opus. Compare against "one strong model at lower effort".
5. Swap to a newer/older model ID and list every code or prompt change you had to make (parameters, stop reasons, token counts).
:::
