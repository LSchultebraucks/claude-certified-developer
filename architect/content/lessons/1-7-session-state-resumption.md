---
skill: 1.7
title: Session State, Resumption & Forking
summary: Named sessions and --resume, fork_session for exploring alternatives from a shared baseline, telling a resumed session what changed, and when a fresh start with a summary beats resuming.
sources: Agent SDK: Sessions | https://code.claude.com/docs/en/agent-sdk/sessions; CLI reference | https://code.claude.com/docs/en/cli-reference; Common workflows | https://code.claude.com/docs/en/common-workflows; Agent SDK Python reference | https://code.claude.com/docs/en/agent-sdk/python
---

## What you need to know

Claude Code and the Agent SDK persist conversations as **sessions**. A session holds the message history — including every tool call and result. You can **resume** it, **fork** it, or deliberately **start fresh**. The exam tests which to choose.

| Operation | How | Use when |
|---|---|---|
| **Resume** | `claude --resume <session-id or name>` / `claude --continue` (most recent); SDK `resume=session_id` | Continue the same line of work; the prior context is still valid |
| **Fork** | SDK `fork_session=True` with `resume=...`; Claude Code `--fork-session` | Explore **divergent approaches** from the same baseline without them contaminating each other |
| **Fresh start + summary** | New session seeded with a structured summary of findings | Prior tool results are **stale** or the context is cluttered/degraded |

Naming sessions (e.g. `--resume auth-investigation`, or `/rename`) makes multi-day investigations easy to return to.

## Forking for alternatives

```python fork two approaches from one analysis
base = await run(prompt="Analyse the payment module and its tests.", options=opts)

opt_a = ClaudeAgentOptions(resume=base.session_id, fork_session=True)
opt_b = ClaudeAgentOptions(resume=base.session_id, fork_session=True)
plan_a = await run("Propose a refactor using the strategy pattern.", options=opt_a)
plan_b = await run("Propose a refactor using a state machine.", options=opt_b)
```

Both forks share the expensive analysis but evolve independently. Resuming the *same* session twice would interleave both explorations in one history.

## Resuming after things changed

A resumed session "remembers" file contents and tool results from **when it last ran**. If teammates have since edited files, Claude may reason from outdated code.

- If **a few known files** changed: resume and **tell Claude precisely what changed** ("`billing.py` and `refunds.py` were modified since; re-read them before continuing").
- If **much** changed or the old context is cluttered: **start a new session** and seed it with a **structured summary** of what was learned (decisions, open questions, key file locations) — not the stale raw results.

:::scenario S4 — resuming a two-day investigation
Yesterday's session mapped a legacy module. Overnight, a refactor landed that touched 30 files. Resuming makes Claude cite functions that no longer exist. **Better:** fresh session + summary of yesterday's conclusions, then re-explore the changed areas.
:::

## Session state vs. application state

Sessions persist the *conversation*. Business state that must be **authoritative** — which customer is verified, which refund was issued — belongs in your **application** (database, gate variables from 1.4), not only in the model's memory of the chat. Resuming a session must never be the mechanism that "remembers" a verification.

## Exam traps

:::trap Resuming the same session to compare two approaches
The approaches contaminate each other. Fork.
:::

:::trap Resuming with stale results and hoping Claude notices
It usually won't. Tell it what changed, or start fresh with a summary.
:::

:::trap Replaying the full old transcript into a new session
That brings the stale data back. Seed with a concise, structured summary instead.
:::

## Practice questions

{{quiz:a1-sess-01}}

{{quiz:a1-sess-02}}

## Build exercise

:::exercise Resume, fork and fresh-start
1. Run an analysis session on a small repo; note its session ID and give it a name.
2. Fork it twice with the Agent SDK and request two different refactoring approaches; confirm the histories are independent.
3. Edit two files by hand. Resume the original session without telling Claude; ask about those files and observe stale answers.
4. Resume again, this time stating which files changed; compare.
5. Write a 10-line structured summary and start a fresh session from it; compare quality and token usage.
:::
