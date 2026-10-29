---
skill: 5.2
title: Escalation & Ambiguity Resolution
summary: When an agent should hand over to a human — explicit requests, policy gaps, lack of progress — which triggers are unreliable, and how to resolve ambiguous matches by asking rather than guessing.
sources: Building effective agents — Anthropic | https://www.anthropic.com/engineering/building-effective-agents; Reduce hallucinations | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations; Content moderation use case guide | https://platform.claude.com/docs/en/about-claude/use-case-guides/content-moderation; Writing effective tools for agents — Anthropic | https://www.anthropic.com/engineering/writing-tools-for-agents
---

## What you need to know

The support scenario's target — high first-contact resolution — is only valuable if the agent **escalates the right cases**. Too eager, and humans drown in simple tickets; too reluctant, and customers get stuck or receive out-of-policy decisions.

:::key Reliable escalation triggers
1. **The customer explicitly asks for a human** → escalate **immediately**. Don't try to resolve first, don't argue.
2. **Policy gap or exception** — the request isn't covered by policy, or needs an exception (refund beyond the window, competitor price match the policy doesn't mention).
3. **No meaningful progress** — repeated failed attempts, missing information that can't be obtained.
4. **Authority limits** — actions above a threshold (amount limits enforced by hooks, 1.5).
:::

Write these as **explicit criteria** in the system prompt, ideally with a few examples of borderline cases (4.2) — "escalate when…/resolve yourself when…".

## Unreliable triggers

| Trigger | Why it's unreliable |
|---|---|
| **Sentiment** ("escalate angry customers") | Anger doesn't measure complexity. An angry customer with a simple, in-policy issue is best served by resolving it now; a calm one asking for a policy exception needs a human |
| **Self-reported confidence** ("escalate if your confidence < 0.7") | Poorly calibrated; the model can be confidently wrong on exactly the cases that need escalation |
| **Turn count alone** | Long conversations aren't necessarily stuck |

Frustration still matters: acknowledge it, and offer a human if the customer **reiterates** they want one — but base the decision on the criteria above.

## Ambiguity resolution

When a lookup returns **multiple matches** (two "Jordan Lee" accounts) the agent must **ask for an additional identifier** (email, order number, postcode) — never pick one heuristically ("most recent", "first result"). Acting on the wrong customer's account is worse than an extra question.

Similarly, when a request is ambiguous ("cancel it" with two open orders), **clarify before acting**.

:::scenario S1 — competitor price match
A customer asks to match a competitor's lower price. Policy covers price adjustments for drops in your own store's price but says nothing about competitors. **Correct:** escalate — it's a policy gap — with a structured handoff (1.4), not a refusal and not an improvised discount.
:::

## Exam traps

:::trap Trying to resolve after an explicit request for a human
Honor the request immediately.
:::

:::trap Sentiment analysis as the escalation router
Measures mood, not need.
:::

:::trap Choosing the most likely match among several customers
Ask for an identifier.
:::

## Practice questions

{{quiz:a5-esc-01}}

{{quiz:a5-esc-02}}

## Build exercise

:::exercise Escalation policy as code and prompt
1. Write explicit escalation criteria and three borderline examples into the system prompt.
2. Make `get_customer` return two matches for a common name; verify the agent asks for an identifier.
3. Test 15 scripted conversations (angry-but-simple, calm-policy-gap, explicit human request…) and record escalation precision/recall.
4. Compare with a sentiment-based router on the same set.
5. Compare with `should_escalate` in `architect/exercises/solutions.py`.
:::
