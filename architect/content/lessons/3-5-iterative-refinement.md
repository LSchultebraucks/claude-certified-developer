---
skill: 3.5
title: Iterative Refinement
summary: Getting from a first draft to the right result — concrete input/output examples, test-driven iteration, the interview pattern for unfamiliar domains, and batching interacting issues.
sources: Claude Code best practices | https://www.anthropic.com/engineering/claude-code-best-practices; Common workflows | https://code.claude.com/docs/en/common-workflows; Prompting best practices | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices; Multishot prompting | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/multishot-prompting
---

## What you need to know

The first result is rarely the final one. The exam tests **how you give feedback** so each iteration converges instead of oscillating.

## 1. Concrete input/output examples

Prose descriptions of a transformation are ambiguous ("normalise the addresses"). Two or three **concrete examples** of input → expected output remove the ambiguity faster than any amount of description.

```text examples beat description
Input:  "123 main st., apt 4b, springfield IL"
Output: {"street": "123 Main St", "unit": "Apt 4B", "city": "Springfield", "state": "IL"}

Input:  "PO Box 77, Shelbyville, Illinois 62565"
Output: {"street": "PO Box 77", "unit": null, "city": "Shelbyville", "state": "IL", "zip": "62565"}
```

When Claude's output is inconsistent across attempts, add examples of the cases it gets wrong.

## 2. Test-driven iteration

Write (or have Claude write) **tests first**, confirm they fail, then let Claude implement and **iterate until the tests pass**. Tests give objective, repeatable feedback; Claude can run them itself and see exactly what's wrong. Share failing test output rather than describing the failure.

## 3. The interview pattern

In an unfamiliar domain you may not know which questions matter. Ask Claude to **interview you first**: "Before implementing, ask me questions about requirements, edge cases and constraints." It surfaces considerations you hadn't anticipated (time zones, partial refunds, idempotency) before code is written.

## 4. Batch interacting issues; sequence independent ones

| Issues are… | Give feedback… | Why |
|---|---|---|
| **Interacting** (fixing one affects another: validation + error messages + API contract) | **Together, in one message** | Claude can design a coherent fix; one-by-one fixes break each other |
| **Independent** (typo in docs, slow query, missing log line) | **Sequentially** | Smaller, verifiable steps; easy to review |

:::scenario S2 — the fix keeps breaking something else
You report three related validation problems one per message; each fix reverts part of the previous one. **Better:** describe all three in one message with the expected behaviour for each, plus tests.
:::

## Exam traps

:::trap Longer prose instructions for an ambiguous transformation
Concrete input/output examples are more effective.
:::

:::trap Describing a failure instead of sharing it
Paste the failing test output or stack trace.
:::

:::trap Diving into implementation in an unfamiliar domain
Use the interview pattern first.
:::

## Practice questions

{{quiz:a3-iter-01}}

{{quiz:a3-iter-02}}

## Build exercise

:::exercise Converge faster
1. Ask Claude to implement an address normaliser from a prose description; score it on 20 test addresses.
2. Restart with three input/output examples; score again.
3. Restart test-first: write 10 failing tests, then let Claude iterate until green.
4. For a domain you don't know (e.g. tax rounding rules), use the interview pattern and list the questions it asked that you would have missed.
:::
