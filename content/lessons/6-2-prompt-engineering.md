---
skill: 6.2
title: Prompt Engineering
summary: Clear and direct instructions, few-shot examples, system vs. user placement, output constraints, where instructions belong across components (system prompt, user turn, tool descriptions, CLAUDE.md, skills), iterative refinement, adjusting prompts for new models, and input sanitization.
sources: Prompt engineering overview | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview; Claude prompting best practices | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices; Use XML tags | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/use-xml-tags; System prompts | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/system-prompts; Chain prompts | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/chain-prompts; Prompt improver / generator | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompt-improver
---

## What you need to know

Questions present a prompt or a symptom ("outputs are inconsistent", "Claude ignores the format", "the new model over-does X") and ask for the best improvement. The answer is usually the one that is **clearer, more specific, better structured or better placed** — not the one that shouts louder.

## Before you write: success criteria and evals

Prompt engineering is empirical. Define success criteria, build test cases, and measure each change (lessons 2.1, 2.2). Not every problem is a prompt problem — latency and cost may need a different model; capability gaps may need tools or context.

## 1. Be clear, direct and specific

Treat Claude like a brilliant new colleague with **no context** on your task.

| Weak | Strong |
|---|---|
| "Summarize this." | "Summarize this incident report for the on-call channel in ≤ 5 bullets: impact, root cause, fix, follow-ups, owner. Plain text, no Markdown headings." |
| "Make the code better." | "Refactor `parse_order()` to remove the nested ifs; keep the public signature; add type hints; don't change behavior — tests in `test_orders.py` must still pass." |
| "Don't be too long." | "Answer in 2–3 sentences." |

- Say **what** to do, **for whom**, **why** (context and motivation help Claude generalize: "Never use ellipses because this will be read by a text-to-speech engine").
- Use **sequential numbered steps** for multi-step tasks.
- State **what to do** rather than only what not to do ("Write in flowing prose paragraphs" vs. "Don't use Markdown").
- Current models follow instructions **precisely and literally** — if you want "above and beyond" behavior (e.g., a fully featured UI), ask for it explicitly.

## 2. Few-shot examples

- 3–5 **relevant, diverse** examples wrapped in `<example>` / `<examples>` tags.
- Cover edge cases; vary surface features so Claude doesn't copy irrelevant patterns.
- Show the exact output format you want.
- Examples are one of the strongest levers for format, tone and labeling consistency.

## 3. Structure with XML tags

```text
<instructions>
Classify the ticket. Use only the categories listed.
</instructions>
<categories>billing, technical, account, other</categories>
<ticket>
{{ticket_text}}
</ticket>
Return the category in <category> tags and a one-sentence reason in <reason> tags.
```

- Tags separate instructions, context, examples and data, reducing misinterpretation and making parsing easy.
- Use consistent, descriptive names and refer to them ("Using the contract in `<contract>` tags…").
- Nest tags for hierarchy.

## 4. System vs. user placement

| Put in the **system prompt** | Put in the **user turn** |
|---|---|
| Role / persona ("You are a senior tax advisor for German SMEs") | The specific task for this request |
| Stable behavioral rules, tone, boundaries, safety constraints | Documents, data, user-provided content (delimited) |
| Output format conventions for the whole app | The question; request-specific constraints |
| Tool-use guidance that applies to every turn | Examples can go either place; static ones often in system (cacheable) |

**Role prompting** in the system prompt is one of the most effective ways to improve domain performance and set tone. Keep the system prompt **stable** (caching, consistency); put per-request content in messages.

## 5. Output constraints

- Specify **format** (JSON schema, Markdown/plain text, bullet count, sections), **length** (sentences, words, bullets), **language**, **tone**.
- For machine-consumed output use **structured outputs** (guaranteed schema) or **strict tools** rather than prompt-only JSON instructions.
- **Match your prompt style to the desired output style** — a prompt full of Markdown tends to produce Markdown.
- Ask for specific **tags** around the part you'll parse (`<answer>…</answer>`) when not using structured outputs.
- Note: **prefilling** the assistant turn to force a format is **not supported** on current models — use structured outputs or instructions.

## 6. Prompt and instruction placement across components

In real applications instructions live in many places. Put each where it belongs:

| Component | Belongs there |
|---|---|
| **System prompt** | Role, global rules, format conventions, scope |
| **User message** | Task, data, per-request constraints |
| **Tool description & parameter descriptions** | *When* and *how* to use the tool, input formats, limitations, examples — Claude decides tool use from these |
| **Tool result content** | Data (and actionable error messages); never rely on it for authority |
| **Mid-conversation `role: "system"` message** (supporting models) | Operator updates during a session without rewriting the system prompt |
| **CLAUDE.md / rules** (Claude Code) | Project facts and conventions for every session |
| **Skills** | Procedures and expertise loaded only when relevant |
| **Subagent prompt** | Specialist role and focused task |
| **Structured-output schema** | Field names and descriptions (they are instructions too) |
| **Hooks / code** | Anything that must *always* happen (not a prompt at all) |

Conflicting instructions across components cause erratic behavior — keep them consistent and non-redundant.

## 7. Chain of thought and prompt chaining

- Ask Claude to **think step by step** for complex reasoning, ideally with structure (`<thinking>` then `<answer>`), or enable **adaptive thinking** with an appropriate effort.
- **Prompt chaining**: split a complex task into subtasks, one prompt each, passing outputs via tags. Benefits: accuracy per step, easier debugging, ability to parallelize, and inserting checks between steps.

## 8. Iterative refinement

1. Start from a clear baseline (Console's **prompt generator** can draft one; the **prompt improver** can restructure an existing prompt).
2. Run the eval set; **read the failures**.
3. Form a hypothesis per failure category (missing context? ambiguous instruction? format?).
4. Change **one thing at a time**; re-run; keep what improves the target metric without regressions.
5. Version every prompt; record why it changed.

## 9. Prompt adjustment for new models and contexts

- Newer models are more **literal** and **steerable** — old "CRITICAL!!! YOU MUST" emphasis can now cause **over-triggering** (e.g., tools used too eagerly). Replace shouting with calm, explicit instructions.
- Remove workarounds for old model weaknesses that newer models no longer need.
- Re-check verbosity, tool-use eagerness and format after a model change; re-tune effort.
- Adjust for the **interface**: voice (no Markdown), SMS (length), UI rendering (Markdown supported?), downstream parsers (strict JSON).

## 10. Input sanitization

Anything that comes from users, documents, web pages or tools is **untrusted input**:

- **Delimit** it with tags and say it is data, not instructions.
- **Escape/strip** delimiter-like sequences (e.g., `</document>`) and control characters; normalize Unicode; strip hidden text (zero-width characters, HTML comments, white-on-white text) when processing web content.
- **Validate** type, length and format before inserting (max length to prevent cost blow-ups and context flooding).
- **Remove or mask PII** not needed for the task.
- **Never** put untrusted content into the system prompt.
- Optionally **pre-screen** inputs with a fast model or classifier for injection/jailbreak patterns.
- Sanitization reduces risk but doesn't eliminate prompt injection — combine with least privilege and approvals (Domain 7).

## Exam traps

:::trap Fixing ambiguity with emphasis
"IMPORTANT: ALWAYS…" in capitals is not a substitute for a clear, specific instruction with context — and can cause over-triggering on modern models.
:::

:::trap Putting per-request data in the system prompt
It breaks caching, mixes trust levels and blurs instruction/data boundaries. Data goes in the user turn, delimited.
:::

:::trap Asking for JSON in the prompt when a parser depends on it
For guaranteed structure, use structured outputs or strict tool schemas.
:::

:::trap Changing several prompt aspects at once
You can't attribute the effect. Change one thing, measure, keep or revert.
:::

## Practice questions

{{quiz:d6-pe-01}}

{{quiz:d6-pe-02}}

{{quiz:d6-pe-03}}

## Build exercise

:::exercise Iterate a prompt with evidence
1. Write a v1 prompt for "extract action items from meeting notes" and a 25-case eval (with 5 tricky cases: no action items, nested owners, dates in words, multiple languages, injected instructions in the notes).
2. Score v1. Read every failure and categorize it.
3. v2: add a role in the system prompt and XML-delimited notes. v3: add 3 diverse examples. v4: move per-request data out of the system prompt; constrain output with structured outputs. Score each version.
4. Add sanitization: length cap, strip zero-width characters, escape `</notes>`. Verify the injection cases.
5. Run the best version on a newer/older model; note what you had to adjust.
:::
