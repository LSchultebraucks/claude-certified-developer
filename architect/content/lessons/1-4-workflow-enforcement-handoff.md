---
skill: 1.4
title: Workflow Enforcement & Handoff
summary: When a step must never be skipped, enforce it in code — prerequisite gates instead of prompt instructions; decompose multi-concern requests; and hand off to humans with a structured summary.
sources: Building effective agents — Anthropic | https://www.anthropic.com/engineering/building-effective-agents; Agent SDK: Hooks | https://code.claude.com/docs/en/agent-sdk/hooks; Writing effective tools for agents — Anthropic | https://www.anthropic.com/engineering/writing-tools-for-agents; Strengthen guardrails: reduce hallucinations | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
---

## What you need to know

This task statement produces the single most common Architect-exam pattern:

:::key Deterministic vs. probabilistic compliance
A **prompt instruction** ("always verify the customer's identity before issuing a refund") makes the behaviour **likely**. A **programmatic gate** makes it **guaranteed**. When the requirement involves money, identity, safety, legal or regulatory compliance — or a production incident shows the step being skipped even occasionally — the answer is enforcement in code.
:::

Prompt guidance remains fine for preferences and style: tone, formatting, which of several acceptable approaches to try first.

## Prerequisite gates

A prerequisite gate blocks a tool until required earlier steps have succeeded:

```python prerequisite gate around process_refund
class SupportSession:
    def __init__(self):
        self.verified_customer_id = None

    def get_customer(self, email, last4):
        cust = crm.verify(email, last4)
        if cust:
            self.verified_customer_id = cust.id
        return cust

    def process_refund(self, customer_id, order_id, amount):
        if self.verified_customer_id != customer_id:
            return tool_error("permission", retryable=False,
                message="Identity not verified for this customer. Call get_customer first.")
        if amount > REFUND_LIMIT:
            return tool_error("business", retryable=False,
                message=f"Refunds above ${REFUND_LIMIT} require a human. Use escalate_to_human.")
        return payments.refund(order_id, amount)
```

The same logic can live in a **PreToolUse hook** (1.5) when you can't change the tool itself — e.g. an MCP server you don't own. The error message tells Claude *what to do next*, so the agent recovers instead of looping.

:::scenario S1 — 12% of refunds skip verification
Despite a clear system prompt, logs show the agent occasionally calls `process_refund` before `get_customer` when customers sound confident. Adding few-shot examples or capital letters improves the rate but can't make it 100%. **Answer:** a programmatic prerequisite that blocks `process_refund` until verification has succeeded.
:::

## Multi-concern requests

"My order arrived broken, I was charged twice, and I want to change my address." Handling this as one blob leads to answering only the first issue. The pattern:

1. **Decompose** into distinct concerns.
2. **Investigate** each — in parallel where independent — sharing customer context.
3. **Synthesise** a single, coherent reply that addresses every concern and states what happens next for each.

## Structured handoff to humans

When the agent escalates (5.2), the human agent typically **cannot see the transcript** or doesn't have time to read it. Pass a structured summary:

```json escalate_to_human payload
{
  "customer_id": "C-20931",
  "verified": true,
  "issue": "Duplicate charge on order ORD-1182",
  "evidence": "Two captures of $249.00 on 2026-03-02 (txn 88412, 88413)",
  "attempted": ["lookup_order", "billing_history"],
  "blocked_by": "Refund $249 exceeds agent limit $200",
  "customer_request": "Refund the duplicate charge",
  "recommended_action": "Approve refund of txn 88413"
}
```

Good handoffs are **self-contained**: the human can act without re-asking the customer.

## Exam traps

:::trap "Strengthen the system prompt" for a compliance failure
Rewording, emphasis, few-shot examples and "the model will get better" all leave a non-zero failure rate. If the scenario demands it *always* happens, choose the gate or hook.
:::

:::trap Gates that fail silently
A gate that blocks without a clear error leaves Claude retrying. Return a structured error explaining the missing prerequisite.
:::

:::trap Handing off "the conversation so far"
A raw transcript dump is not a handoff. Humans need a concise, structured summary with IDs, amounts and the recommended action.
:::

## Practice questions

{{quiz:a1-gate-01}}

{{quiz:a1-gate-02}}

## Build exercise

:::exercise Gate a refund tool and design the handoff
1. Extend the agent from 1.1 with `process_refund` and `escalate_to_human`.
2. Implement the session-state gate above; verify with a test that `process_refund` is blocked before `get_customer` succeeds.
3. Add a refund limit; above it, return a business error pointing to `escalate_to_human`.
4. Define the handoff JSON schema and make `escalate_to_human` require it.
5. Feed a three-concern customer message and check the final reply addresses all three.
6. Compare with `gated_refund` in `architect/exercises/solutions.py`.
:::
