---
skill: 1.3
title: Agent Patterns and Frameworks
summary: The recurring building blocks of every agent — tool-use loops, sub-agents, memory and context-window management — and how Strands, LangGraph and PydanticAI package them.
sources: Building effective agents | https://www.anthropic.com/engineering/building-effective-agents; Effective context engineering for AI agents | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents; Memory tool | https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool; Context editing | https://platform.claude.com/docs/en/build-with-claude/context-editing; Strands Agents | https://strandsagents.com; LangGraph | https://langchain-ai.github.io/langgraph/; PydanticAI | https://ai.pydantic.dev
---

## What you need to know

Skill 1.1 was about *which* architecture; this skill is about the **reusable patterns** that appear inside almost every agent, and about **frameworks** that implement those patterns for you. Expect questions like "an agent forgets earlier decisions after many turns — which pattern helps?" or "a team needs durable, resumable, graph-shaped workflows with human approval steps — which framework characteristic matters?"

## Pattern 1: the tool-use loop (ReAct style)

The core of every agent: **reason → act (tool call) → observe (tool result) → repeat** until done. In Claude terms:

1. Send messages + tool definitions.
2. If `stop_reason == "tool_use"`, execute each requested tool and return `tool_result` blocks.
3. Repeat until `stop_reason == "end_turn"` (or a safety limit trips).

Variations you should recognize:
- **Parallel tool calls** — Claude may emit several `tool_use` blocks in one turn (default behavior); execute them concurrently and return all results together. `disable_parallel_tool_use: true` in `tool_choice` limits Claude to at most one call per turn.
- **Interleaved thinking** — with adaptive thinking, Claude reasons *between* tool calls, which improves multi-step tool use.
- **Server-side tool loops** — with Anthropic server tools (web search, web fetch, code execution) the API runs the sampling loop itself; if it hits its iteration limit you get `stop_reason: "pause_turn"` and simply send the conversation back to continue.
- **Programmatic tool calling** — Claude writes code that calls your tools inside the code-execution container, so intermediate results never enter its context; only the final output does. Useful for many sequential calls or large intermediate data.

## Pattern 2: sub-agents

A parent agent delegates a subtask to a **sub-agent** that runs its own loop in a **separate context window** and returns only a condensed result. Use it for:
- **Context isolation** — searching 200 files or reading long logs happens in the sub-agent; the parent receives a 1-page summary.
- **Parallelism** — independent subtasks run simultaneously.
- **Specialization and least privilege** — a read-only "explorer" sub-agent, a "test runner" with Bash only, a cheap model for bulk work.

Sub-agents are **not free**: each starts cold (it must be told what it needs to know), total token usage rises, and detail is lost in summaries. Tightly coupled work that needs shared state is often better done by one agent.

In the Agent SDK and Claude Code, sub-agents are defined with a **description** (used by the parent to decide when to delegate), a **prompt** (their system prompt), an optional **tool list** and **model**.

## Pattern 3: memory

LLMs are stateless — the model only "remembers" what is in the current request. Agent memory therefore means *deciding what to put back into context, and where to keep the rest*.

| Memory type | Lives in | Lifetime | Example |
|---|---|---|---|
| **Working / short-term** | The conversation (context window) | One session | Tool results so far, the current plan |
| **Persistent instructions** | Files loaded at start (e.g. CLAUDE.md, system prompt) | Across sessions | Coding standards, build commands |
| **Long-term / episodic** | External store the agent reads/writes via tools (files, DB, vector store) | Across sessions | "User prefers metric units", lessons from past runs |
| **Structured state / progress notes** | Files like `progress.md`, `todo.json`, git history | Across context resets | Long-running agents note what's done and what's next |

Claude's **memory tool** (`{"type": "memory_20250818", "name": "memory"}`) is a client-side tool: Claude issues `view`, `create`, `str_replace`, `insert`, `delete`, `rename` commands on a `/memories` directory, and **your code implements the storage**. It enables cross-session learning without stuffing everything into the prompt. Security implications: validate paths (no traversal), isolate per user/tenant, never store secrets.

:::tip Just-in-time retrieval beats pre-loading
Rather than loading every potentially relevant document up front, give the agent lightweight identifiers (file paths, URLs, IDs) and tools to fetch details when needed — the way Claude Code uses `glob`/`grep` instead of loading the whole repo. This keeps context focused and fresh.
:::

## Pattern 4: context-window management

Context-window management keeps the agent's working context within limits and high in signal over long runs.

Long-running agents accumulate tool results until context quality degrades ("context rot") or the window overflows. Techniques, from least to most invasive:

| Technique | What it does | When |
|---|---|---|
| **Tool-output pruning** | Tools return only what's needed (filtered fields, truncated logs, pagination) | Always — cheapest fix, at the source |
| **Context editing** (`clear_tool_uses_20250919`, `clear_thinking_20251015`, beta) | Server-side clearing of old tool results / thinking blocks | Old tool outputs no longer relevant |
| **Compaction** (server-side `compact_20260112` beta; `/compact` in Claude Code) | Summarizes older history into a compaction block and continues | Approaching the context limit in a long conversation |
| **Sub-agent isolation** | Verbose work happens in a separate context | Exploration, search, log analysis |
| **External memory / notes** | Agent writes progress to files and reloads selectively | Multi-session or multi-context-window tasks |

:::key Context is a finite resource
Anthropic frames context engineering as finding "the smallest possible set of high-signal tokens" that maximizes the chance of the desired outcome. More context is not automatically better: irrelevant or stale tokens dilute attention and cost money.
:::

## Pattern 5: planning, reflection and verification

- **Plan-then-execute**: produce a plan (todo list) first, then execute step by step; re-plan when observations contradict assumptions.
- **Evaluator-optimizer / self-critique**: a second pass (or a separate grader) checks output against explicit criteria.
- **Verification against ground truth**: tests, linters, schema validation, re-reading the file after editing. The strongest agents verify with tools, not with self-assessment.
- **Human-in-the-loop checkpoints**: pause before irreversible actions or when confidence is low.

## Agentic frameworks

Frameworks package these patterns. You don't need to know their APIs in depth for this exam — you need to know **what each is for** and **the tradeoffs of abstraction**.

| Framework | Origin / style | Key ideas | Good fit |
|---|---|---|---|
| **Strands Agents** | Open-source SDK from AWS; *model-driven* | An agent = model + tools + prompt; the model plans and calls tools in a loop. Python decorators for tools, MCP support, multi-agent patterns (agents-as-tools, swarms, graphs), works with Claude via the Anthropic API or Amazon Bedrock | Teams on AWS who want a lightweight, model-driven agent loop with minimal orchestration code |
| **LangGraph** | From the LangChain team; *graph / state machine* | Nodes (functions/LLM calls) and edges (including conditional edges and cycles) over a shared **state**; **checkpointers** for persistence, resumability, time travel and **human-in-the-loop interrupts** | Complex, long-running workflows needing explicit control flow, durable state and approval steps |
| **PydanticAI** | From the Pydantic team; *type-safe Python* | Agents with typed dependencies (dependency injection), **validated structured output** via Pydantic models, tools as typed functions, model-agnostic (Anthropic supported) | Python apps that prioritize type safety and validated, structured outputs |

Others you may see named: CrewAI (role-based crews), the Claude Agent SDK (Claude Code's harness), Semantic Kernel, LlamaIndex agents.

:::compare Framework vs. Agent SDK vs. raw API
- **Raw Messages API / Tool Runner**: maximum transparency and control, least dependency; you write the orchestration.
- **Claude Agent SDK**: Claude-optimized harness with built-in tools, permissions, hooks, sessions, subagents, compaction — the same one Claude Code uses.
- **Third-party frameworks**: model-agnostic abstractions, ecosystem integrations, specific paradigms (graphs, typed outputs). Cost: extra abstraction layers that can **obscure the underlying prompts and responses**, make debugging harder, lag behind new Claude API features, and tempt you into more complexity than needed.
:::

Anthropic's guidance: frameworks can help you start quickly, but **understand the underlying code**, start with direct API calls where possible (many patterns are a few lines), and if you use a framework, make sure you can inspect exactly what is sent to the model. Incorrect assumptions about what's under the hood are a common source of bugs.

## Choosing a pattern: quick decisions

| Symptom / requirement | Pattern |
|---|---|
| Agent's context fills with huge tool outputs | Prune tool output at the source; context editing; delegate to sub-agent |
| Conversation will exceed the context window | Compaction (server-side or `/compact`) + notes file |
| Agent must remember user preferences next week | Long-term memory (memory tool / external store) |
| Subtasks independent and numerous | Parallel sub-agents (orchestrator-workers) |
| Workflow must pause for human approval and resume tomorrow | Durable state + checkpoints (e.g., LangGraph checkpointer, Managed Agents sessions, Agent SDK `resume`) |
| Output must match a typed schema | Structured outputs / strict tools (or PydanticAI's typed outputs) |
| Many chained tool calls with large intermediate data | Programmatic tool calling |

## Exam traps

:::trap "Increase the context window / use a bigger model" as the fix for context bloat
Bigger windows postpone the problem and raise cost; quality still degrades with irrelevant tokens. The better answers prune, summarize/compact, isolate in sub-agents, or move state to external memory.
:::

:::trap Treating memory as something the model has
Persisted memory only works if something writes it to a store and something loads it back into context. With the memory tool, *your* application implements the storage operations.
:::

:::trap Picking a framework for a one-call problem
A single classification call does not need LangGraph. The exam rewards the simplest adequate solution.
:::

## Practice questions

{{quiz:d1-pat-01}}

{{quiz:d1-pat-02}}

## Build exercise

:::exercise Give an agent memory and keep its context lean
1. Start from the manual loop in lesson 1.2 and add the memory tool (`memory_20250818`). Implement `view`, `create`, `str_replace` and `delete` against a local `./memories/<user_id>/` directory; reject any path that resolves outside it.
2. Tell Claude in the system prompt to check memory at the start of each task and record durable user preferences.
3. Run two separate sessions: in the first, state a preference ("always answer in metric units"); verify the second session applies it.
4. Add a tool `search_logs(query)` that returns large outputs. Measure `usage.input_tokens` growth over 10 turns.
5. Reduce growth three ways and compare: (a) truncate/filter the tool output, (b) enable context editing to clear old tool results, (c) delegate log search to a sub-agent that returns a 10-line summary.
6. Optional: rebuild the flow as a LangGraph graph with a checkpointer and an interrupt before a "send report" node.
:::
