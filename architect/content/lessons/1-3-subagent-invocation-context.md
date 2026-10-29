---
skill: 1.3
title: Subagent Invocation & Context Passing
summary: How subagents are defined and spawned in the Agent SDK, why they inherit nothing, what a complete delegation prompt contains, and how to get structured, attributable results back — in parallel.
sources: Agent SDK: Subagents | https://code.claude.com/docs/en/agent-sdk/subagents; Claude Code subagents | https://code.claude.com/docs/en/sub-agents; Agent SDK Python reference | https://code.claude.com/docs/en/agent-sdk/python; How we built our multi-agent research system — Anthropic | https://www.anthropic.com/engineering/multi-agent-research-system
---

## What you need to know

In Claude Code and the Agent SDK, an agent spawns a subagent through the **Task tool** (renamed the **Agent** tool in newer releases — exam material uses "Task"). Each subagent is described by an **`AgentDefinition`**, runs in its **own context window**, and returns a single result to the caller.

:::key Three facts the exam keeps returning to
1. The coordinator can only delegate if the Task/Agent tool is in its **`allowedTools`**.
2. A subagent **does not inherit** the coordinator's conversation, tool results or reasoning. It sees its system prompt (from the definition), its tools, and the **delegation prompt** — nothing else.
3. To run subagents **in parallel**, the coordinator emits **multiple Task tool calls in a single response**.
:::

## Defining subagents

```python Agent SDK — coordinator with two subagents
from claude_agent_sdk import ClaudeAgentOptions, AgentDefinition

options = ClaudeAgentOptions(
    system_prompt=COORDINATOR_PROMPT,
    allowed_tools=["Task", "Read"],
    agents={
        "web-researcher": AgentDefinition(
            description="Finds current external sources for ONE sub-question. "
                        "Use for facts that need web evidence.",
            prompt="Search, read and return JSON: [{claim, source_url, title, "
                   "published, excerpt}]. Include dates. Do not synthesize.",
            tools=["WebSearch", "WebFetch"],
        ),
        "doc-analyst": AgentDefinition(
            description="Analyzes the internal reports in ./reports. Use for company data.",
            prompt="Return JSON findings with file name, page and excerpt for every claim.",
            tools=["Read", "Grep", "Glob"],
        ),
    },
)
```

- **`description`** tells the coordinator *when* to use the subagent — write it like a tool description (2.1).
- **`prompt`** is the subagent's system prompt: role, method, output format.
- **`tools`** restricts the subagent to what its role needs (least privilege, better selection — 2.3).

Subagents can also be defined as Markdown files in `.claude/agents/` (project) or `~/.claude/agents/` (personal) for Claude Code.

## Writing the delegation prompt

Because nothing is inherited, the delegation prompt must be **self-contained**:

| Include | Why |
|---|---|
| The objective and how it fits the overall task | Prevents drift and duplicated scope |
| **Prior findings** relevant to this subtask (verbatim, with sources) | The synthesis agent can't cite what it never received |
| Constraints and boundaries (time range, regions, what *not* to cover) | Avoids overlap with sibling subagents |
| Required **output format** — ideally structured | Reliable aggregation |
| Metadata to keep: source URL, document name, page, date | Provenance survives synthesis (5.6) |

:::scenario S3 — the synthesis agent can't cite sources
The coordinator passes the synthesis subagent a prose summary of findings. The report has no citations. **Fix:** pass the search and analysis results **with their source metadata** (structured: claim, source, date, excerpt) in the delegation prompt, and require citations in the output format.
:::

## Getting results back

Ask subagents to return **structured data separating content from metadata** — e.g. JSON objects with `claim`, `evidence`, `source`, `date`, `confidence`. The coordinator can then merge, de-duplicate, detect conflicts and keep attribution. Free-form prose forces the coordinator to re-parse and loses detail.

## Spawning: parallel vs. sequential

- **Independent** subtasks (search three regions) → emit three Task calls **in one response**; they run concurrently.
- **Dependent** subtasks (analyse documents the search found) → sequential: wait for the result, then delegate with that result included.
- Spawning across **separate turns** when the work is independent wastes wall-clock time.

## Exam traps

:::trap "Increase the subagent's context window / use a bigger model"
When a subagent lacks information the coordinator had, size and model are irrelevant — the information was never passed. Put it in the delegation prompt.
:::

:::trap Assuming subagents share memory or files with the coordinator
They share the filesystem if tools allow it, but not the conversation. Don't rely on "it saw it earlier".
:::

:::trap Forgetting the Task tool in allowedTools
A coordinator that "never delegates" may simply not be allowed to.
:::

## Practice questions

{{quiz:a1-sub-01}}

{{quiz:a1-sub-02}}

## Build exercise

:::exercise Parallel subagents with structured hand-back
1. Reuse the coordinator from 1.2. Change the coordinator prompt to emit all independent delegations **in one turn**.
2. Measure wall-clock time for three sequential vs. three parallel delegations.
3. Define a JSON contract for findings (`claim`, `source_url`, `published`, `excerpt`, `confidence`).
4. Add a synthesis subagent and pass it the **full structured findings** — verify every sentence in its report carries a citation.
5. Remove `Task` from `allowed_tools` and observe that the coordinator can no longer delegate.
:::
