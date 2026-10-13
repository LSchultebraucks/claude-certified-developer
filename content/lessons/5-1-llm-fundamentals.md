---
skill: 5.1
title: LLM Fundamentals
summary: Tokens, context windows, next-token generation, sampling and non-determinism; model options (fast mode, extended and adaptive thinking, effort levels); and zero-, one- and few-shot prompting.
sources: Models overview | https://platform.claude.com/docs/en/about-claude/models/overview; Context windows | https://platform.claude.com/docs/en/build-with-claude/context-windows; Adaptive thinking | https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking; Effort | https://platform.claude.com/docs/en/build-with-claude/effort; Fast mode | https://platform.claude.com/docs/en/build-with-claude/fast-mode; Multishot prompting | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/multishot-prompting; Glossary | https://platform.claude.com/docs/en/about-claude/glossary
---

## What you need to know

Foundational knowledge every Claude developer needs to reason about cost, latency, quality and failure modes. Expect conceptual questions ("why does the same prompt produce different outputs?") and option questions ("which setting improves reasoning on hard tasks?").

## Tokens

- LLMs read and write **tokens** — sub-word units produced by a **tokenizer** (common words may be one token; rare words, code and non-English text often split into several). Rough English rule of thumb: ~3–4 characters or ~¾ of a word per token, but it varies by language and content.
- **Everything is tokens**: system prompt, tool definitions, messages, images (by pixel area), PDFs (text + page images), thinking, and output.
- **Billing, rate limits and context limits are all counted in tokens.** Output tokens cost more than input tokens (typically 5×).
- **Tokenizers differ between model generations.** The same text can produce noticeably more tokens on a newer tokenizer → different cost and context usage. Always measure with the **token counting endpoint** (`/v1/messages/count_tokens`) for the specific model, never with another vendor's tokenizer.

## Context window

- The **context window** is the maximum number of tokens the model can consider in one request: **input (system + tools + messages) plus the output it generates** (including thinking).
- Current Claude models offer up to **1M-token** context windows (some older ones 200K); maximum **output** is set per model (e.g., 64K–128K) and controlled per request with `max_tokens`.
- More context ≠ better results. Irrelevant or stale tokens dilute attention ("context rot"), cost money and add latency. Put the most important information where it is easy to use (long documents at the top, the query at the end) and remove what isn't needed.
- The model has **no memory beyond the context window**; anything not in the request does not exist for the model (lessons 2.3, 6.1).

## Next-token generation

- An LLM is an **autoregressive** model: given all tokens so far, it predicts a probability distribution over the next token, picks one, appends it, and repeats until a stop condition (end-of-turn, a stop sequence, `max_tokens`, or a tool call).
- Consequences:
  - The model writes **left to right** — it cannot revise earlier tokens of the same response. That's why asking for **reasoning before the answer** (or enabling thinking) improves hard tasks, and why field order in a JSON schema matters.
  - Output length drives **latency** (tokens are generated one by one) and **cost**.
  - The model produces *plausible* continuations, which can be **hallucinations** — fluent but unsupported claims.
- **Knowledge cutoff**: the model only knows its training data up to a date; for current facts use tools (web search) or provide documents.

## Sampling and non-determinism

- **Sampling** chooses the next token from the probability distribution:
  - **Temperature** scales randomness (lower = more focused/deterministic-ish, higher = more varied/creative).
  - **top_p** (nucleus sampling) keeps the smallest set of tokens whose cumulative probability ≥ p.
  - **top_k** samples from the k most likely tokens.
- **Current state**: the newest Claude models (e.g., Opus 4.7+, Opus 5.x, Fable 5.x, Sonnet 5.5, Haiku 5.5) **remove or reject non-default sampling parameters**; you steer with prompts, effort and thinking instead. Older models still accept them — and Anthropic recommends adjusting temperature *or* top_p, not both.
- **Non-determinism**: even at temperature 0 (where supported), outputs are **not guaranteed identical** across runs (numerical/infrastructure effects, model updates). Design for it:
  - Use **structured outputs** for format stability.
  - Put deterministic logic in **code**, not in the model.
  - **Cache** results when identical answers are required.
  - Evaluate with **multiple samples** and pass rates.
  - Use **voting/self-consistency** for high-stakes classification.

## Model options

| Option | What it does | When to use | API |
|---|---|---|---|
| **Extended thinking (legacy budget)** | Model reasons in `thinking` blocks before answering, within a token budget | Older models (e.g., Sonnet 4.5, Haiku 4.5) | `thinking: {"type": "enabled", "budget_tokens": N}` (N ≥ 1024, < `max_tokens`) |
| **Adaptive thinking** | Model decides **whether and how much** to think, per request, and interleaves thinking between tool calls | Default on current models for anything non-trivial | `thinking: {"type": "adaptive"}` (on by default / always on for some newest models) |
| **Effort levels** | Trades thoroughness vs. token spend: affects thinking depth, number of tool calls, verbosity | `low` for simple/high-volume/subagent tasks; `medium` as a cost-saving step; `high` (common default) / `xhigh` for coding & agentic work; `max` when correctness matters more than cost | `output_config: {"effort": "low" \| "medium" \| "high" \| "xhigh" \| "max"}` |
| **Fast mode** (research preview) | Runs the same model with significantly faster output (up to ~2.5× tokens/s) at **premium pricing** | Latency-critical interactive work on supported Opus models | `speed: "fast"` + beta header, Claude API only |
| **Thinking display** | `summarized` vs `omitted` thinking text | Show progress to users vs. minimal payload | Billing is identical — thinking is output tokens either way |

:::key Thinking and effort, in one sentence each
- **Thinking** gives the model room to reason before committing to an answer; it improves complex reasoning, math, coding and multi-step tool use, at the cost of more output tokens and latency.
- **Effort** is the main dial on current models for balancing quality against cost and latency — lower effort means fewer and more consolidated tool calls and terser responses.
:::

Practical notes:
- Thinking tokens are billed as **output** tokens and count toward `max_tokens`.
- The raw chain of thought is not exposed on current models (summaries or omitted).
- Changing thinking/effort settings mid-conversation affects prompt caching; pin them per route.
- Simple tasks (classification, extraction) rarely need high effort; measure before raising defaults.

## Fundamental prompting techniques

| Technique | Definition | Example | Use when |
|---|---|---|---|
| **Zero-shot** | Instruction only, no examples | "Classify the sentiment of this review as positive, negative or neutral." | Task is clear and common; fastest to write |
| **One-shot / single-shot** | One example of input → output | Instruction + one labeled review | Showing a format or style once |
| **Few-shot / multi-shot** | Several (typically 3–5) diverse examples | Instruction + 4 labeled reviews covering edge cases | Consistent format, nuanced labels, edge cases |
| **Chain of thought** | Ask the model to reason step by step (or enable thinking) | "Think through the calculation, then give the final number in `<answer>`." | Multi-step reasoning |

Few-shot best practices: make examples **relevant** (mirror real inputs), **diverse** (cover edge cases, avoid unintended patterns), and **clearly delimited** (`<example>` tags). Examples are among the most effective ways to control format and tone — but the model may copy surface features, so vary them.

## Exam traps

:::trap "Set temperature to 0 to make output fully deterministic"
Lower temperature reduces variation but never guarantees identical outputs — and newest models reject sampling parameters. Use structured outputs, caching and code for determinism.
:::

:::trap Assuming the context window is only for input
Output (including thinking) shares the window. A request with 990K input tokens cannot produce a 50K-token answer on a 1M-window model.
:::

:::trap Estimating cost with a generic tokenizer
Tokenizers differ by model generation. Use the token counting endpoint or the `usage` field for the actual model.
:::

:::trap Thinking that hidden thinking is free
Thinking is billed as output tokens even when its display is omitted.
:::

## Practice questions

{{quiz:d5-llm-01}}

{{quiz:d5-llm-02}}

{{quiz:d5-llm-03}}

## Build exercise

:::exercise Measure the fundamentals
1. Count tokens for the same 1,000-word text in English, German and as minified JSON using `count_tokens`; compare.
2. Send a request whose input nearly fills a small budget you set and observe `max_tokens` truncation behavior.
3. Run the same classification prompt 20 times; record how many outputs differ. Then switch to structured outputs with an enum and repeat.
4. Solve a multi-step math word problem with thinking off/low effort vs. adaptive thinking at high effort; compare accuracy, output tokens and latency.
5. Compare zero-shot vs. 3-shot prompting on 30 labeled examples of a nuanced classification task; record accuracy and tokens.
:::
