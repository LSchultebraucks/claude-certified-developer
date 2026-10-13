---
skill: 6.1
title: Context Engineering
summary: Curate what goes into the context window — prevent drift and bloat with tool-output pruning, context editing and compaction, isolate context with subagents and multi-step workflows, and use memory and just-in-time retrieval.
sources: Effective context engineering for AI agents | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents; Context windows | https://platform.claude.com/docs/en/build-with-claude/context-windows; Context editing | https://platform.claude.com/docs/en/build-with-claude/context-editing; Compaction | https://platform.claude.com/docs/en/build-with-claude/compaction; Long context prompting tips | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/long-context-tips; Memory tool | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
---

## What you need to know

**Context engineering** is the discipline of deciding *which tokens* the model sees at each step. Prompt engineering is about writing good instructions; context engineering is about managing the **entire state** — system prompt, tools, examples, message history, retrieved data, tool results — over many turns. For agents it matters more than any single prompt.

:::key The guiding principle
Context is a **finite resource with diminishing returns**. As the number of tokens grows, the model's ability to use any given piece of information declines ("context rot"). Aim for the **smallest set of high-signal tokens** that lets the model do the task.
:::

## Context drift vs. context bloat

| Problem | What happens | Symptoms |
|---|---|---|
| **Context bloat** | The window fills with low-value tokens: verbose tool outputs, full files when a snippet would do, duplicate content, old irrelevant turns | Higher cost and latency, hitting window limits, important info "buried" |
| **Context drift** | Over a long session the model's working focus moves away from the original goal/constraints — stale assumptions, abandoned approaches and accumulated noise steer behavior | Forgets earlier constraints, mixes old and new plans, repeats work, contradicts earlier decisions |

They reinforce each other: bloat buries the instructions that would prevent drift.

## Techniques

### 1. Tool output pruning (fix it at the source)
- Return **only the fields needed**, not entire API payloads.
- **Truncate** long outputs with a clear marker and a way to get more ("showing 50 of 1,240 lines; call with `offset` to continue").
- **Paginate / filter / search** instead of dumping everything (`grep` before `read_file`).
- Summarize logs to errors and the lines around them.
- Prefer **high-signal formats**: concise, natural-language results with stable IDs over raw technical noise.
- Design tools to be **token-efficient** — this is the cheapest and most effective lever.

### 2. Context editing (clear stale results)
- Server-side **context editing** (beta) can **clear old tool results** (`clear_tool_uses_20250919`) and **old thinking blocks** (`clear_thinking_20251015`) once thresholds are exceeded, replacing them with placeholders while keeping the conversation structure.
- Good for agents where old tool outputs are no longer relevant (files read 40 turns ago).

### 3. Compaction (summarize history)
- **Compaction** summarizes earlier context into a condensed form and continues with it. Server-side compaction (beta) does this automatically near a token threshold and returns a compaction block you must keep in history (append the full `response.content`).
- In **Claude Code**: auto-compaction near the limit, and `/compact [what to keep]` manually. Good compaction preserves decisions, open TODOs, file paths and unresolved bugs; drops redundant tool outputs.
- Trade-off: summaries lose detail — choose what to keep deliberately.

### 4. Context isolation through subagents
- A subagent runs in a **fresh, separate context** and returns only a **condensed result** (often 1–2K tokens) to the parent, even if it consumed tens of thousands of tokens exploring.
- Use for: codebase exploration, research on separate sub-questions, log analysis, test runs.
- The parent's context stays focused on coordination and synthesis.

### 5. Context isolation through multi-step workflows
- Split a task into steps (prompt chaining); **each step gets only the inputs it needs** (e.g., step 2 receives step 1's structured output, not its whole transcript).
- Clear boundaries reduce cross-contamination between tasks and make each step easier to evaluate.

### 6. Memory and note-taking (structured persistence)
- Agents can write **notes / progress files / todo lists** outside the context window and re-read them when needed (or after a context reset).
- The **memory tool** gives Claude a file-based memory directory (client-side storage you implement) for cross-session knowledge.
- In Claude Code: CLAUDE.md for durable instructions, auto memory for learned preferences, plan files for long tasks.

### 7. Just-in-time retrieval vs. pre-loading
- Keep **lightweight references** (paths, IDs, URLs, queries) in context and **load details on demand** with tools — instead of pre-loading everything.
- Hybrid is common: pre-load a small, always-relevant core (e.g., CLAUDE.md), retrieve the rest just in time.
- Metadata (folder names, file sizes, timestamps) helps the agent decide what to open.

### 8. Progressive disclosure
- **Skills**: only names/descriptions sit in context; the full SKILL.md and supporting files load when relevant.
- **Tool search**: for large tool libraries, load tool definitions on demand instead of all upfront.

## Long-context placement tips

When you *do* put large material into context:
- Put **long documents at the top**, above the instructions and the question; put the **query at the end** — this measurably improves response quality on long inputs.
- **Wrap each document in tags** with metadata (`<document index="1"><source>…</source><document_content>…</document_content></document>`).
- Ask Claude to **extract relevant quotes first** (in tags) before answering — it cuts through noise.

## Context budget at a glance

```text
[system prompt]         stable, concise, high-signal                → cache it
[tool definitions]      only tools relevant to the task             → cache it; tool search for large sets
[examples]              few, diverse, canonical                     → cache it
[retrieved context]     just-in-time, top-k, deduplicated
[conversation history]  pruned, compacted, stale tool outputs cleared
[current task]          explicit goal, constraints, success criteria (restate if the session is long)
```

## Exam traps

:::trap "Use a model with a bigger context window"
A bigger window delays overflow but doesn't fix dilution, cost or drift. Prune, retrieve just in time, compact, isolate.
:::

:::trap Compacting when you should prune
If one tool returns 40K tokens of JSON every call, compaction treats the symptom. Fix the tool to return only what's needed.
:::

:::trap Giving every subagent the parent's whole transcript
That defeats isolation. Pass a focused task description with only the needed facts.
:::

:::trap Losing compaction state
With server-side compaction, append the full `response.content` (including compaction blocks) back to history; extracting only the text loses the compacted state.
:::

## Practice questions

{{quiz:d6-ctx-01}}

{{quiz:d6-ctx-02}}

## Build exercise

:::exercise Keep a 50-turn agent sharp
1. Build an agent with tools `list_files`, `read_file`, `grep`, `run_tests` over a medium repo; give it a 50-step refactoring task.
2. Instrument per-turn total input tokens. Plot growth.
3. Apply, one at a time, and measure: (a) truncate `read_file` to 300 lines with offsets; (b) `grep` returns file:line matches only; (c) context editing to clear old tool results; (d) a "code explorer" subagent returning summaries; (e) a `PROGRESS.md` notes file the agent updates each step.
4. Add a drift test: state a constraint at turn 1 ("never modify `legacy/`"); check whether it holds at turn 45 with and without your techniques.
5. Write down which technique gave the biggest reduction per unit of effort.
:::
