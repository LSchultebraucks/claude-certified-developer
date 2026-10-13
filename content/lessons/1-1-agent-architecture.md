---
skill: 1.1
title: Agent Architecture
summary: When to build a workflow and when to build an agent, the five classic workflow patterns, supervisor hierarchies, and what subagents actually buy you.
sources: Building effective agents — Anthropic | https://www.anthropic.com/engineering/building-effective-agents; How we built our multi-agent research system — Anthropic | https://www.anthropic.com/engineering/multi-agent-research-system; Agent SDK: Subagents | https://code.claude.com/docs/en/agent-sdk/subagents; Effective context engineering for AI agents | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
---

## What you need to know

Architecture questions on the exam are almost always *decision* questions: given a scenario, which structure fits best? The vocabulary comes from Anthropic's "Building effective agents" guidance, which every Claude developer is expected to know. Learn the definitions precisely, then learn the decision criteria.

:::key Workflow vs. agent — the definitions
- A **workflow** is a system where LLM calls and tools are orchestrated through **predefined code paths**. *Your code* decides what happens next.
- An **agent** is a system where the **LLM dynamically directs its own process and tool usage**, deciding which steps to take and when it is done. *The model* decides what happens next.

Both are "agentic systems". The difference is who owns control flow.
:::

The building block underneath both is the **augmented LLM**: a model call enhanced with retrieval, tools and memory. Everything else is composition.

## Start simple: the complexity ladder

Anthropic's core recommendation is to find the *simplest* solution that works and only add complexity when it measurably improves outcomes:

1. **Single LLM call** (with good prompting, retrieval and examples) — classification, extraction, summarization, Q&A.
2. **Workflow** — multiple calls with code-controlled logic when the steps are known in advance.
3. **Agent** — open-ended problems where you cannot predict the number of steps or hard-code the path.

Agents trade **latency and cost** for **flexibility**. They take more turns, consume more tokens, and their errors can compound across steps. That trade is only worth it when the task needs it.

:::remember Four criteria for "should this be an agent?"
1. **Complexity** — is the task multi-step and hard to specify in advance? ("turn this design doc into a PR" vs. "extract the title from this PDF")
2. **Value** — does the outcome justify higher cost and latency?
3. **Viability** — is Claude actually capable at this task type (and are the tools good enough)?
4. **Cost of error** — can errors be caught and recovered from (tests, review, rollback, sandboxing)?

If the answer to any of these is *no*, stay at a simpler tier.
:::

## The five workflow patterns

These names appear verbatim in exam options. Know what each is *for*.

| Pattern | How it works | Use when | Example |
|---|---|---|---|
| **Prompt chaining** | Output of step N is input of step N+1; optional programmatic "gates" check intermediate results | The task decomposes cleanly into fixed sequential subtasks; you trade latency for accuracy per step | Generate marketing copy → check it against rules → translate it |
| **Routing** | A classifier (LLM or code) sends the input to one of several specialized downstream prompts/models | Distinct categories that are better handled separately; also cost routing (easy → Haiku, hard → Opus) | Support tickets: refund vs. technical vs. general |
| **Parallelization** | Run calls simultaneously and aggregate. Two variants: **sectioning** (independent subtasks) and **voting** (same task several times for consensus/confidence) | Subtasks are independent (speed), or you need multiple perspectives/votes (confidence) | One call answers, another screens for policy issues (sectioning); three reviewers vote on "is this code vulnerable?" |
| **Orchestrator-workers** | A central LLM breaks the task down *dynamically*, delegates to worker LLMs, synthesizes their results | You can't predict the subtasks in advance (they depend on the input) | Coding change touching an unknown number of files; multi-source research |
| **Evaluator-optimizer** | One call generates, another evaluates and gives feedback, loop until criteria met | Clear evaluation criteria exist and iterative refinement measurably helps | Literary translation refined against a critique; code refined until tests pass |

:::compare Parallelization vs. orchestrator-workers
Both fan out. The difference is **who decides the subtasks**. In parallelization the subtasks are **predefined in code**. In orchestrator-workers the **orchestrator LLM decides** the subtasks at runtime. If a question says "the number and type of subtasks depend on the input", the answer is orchestrator-workers.
:::

## Agents: the autonomous loop

An agent starts from a command or conversation, plans, and then operates in a loop: call a tool, observe the result ("ground truth from the environment"), decide the next step, until the task is complete or a stopping condition is hit. Key properties:

- **Environment feedback each step** — tool results, test results, file contents. Agents are only as good as the feedback they get.
- **Stopping conditions** — the model signals completion (in the API: `stop_reason: "end_turn"`), plus safety limits (max turns/iterations, budgets, timeouts).
- **Human checkpoints** — agents can pause for human input at decision points or when blocked.
- **Sandboxing and guardrails** — because autonomy means errors compound, run agents in constrained environments and gate dangerous actions.

Agent design effort goes into the **agent-computer interface (ACI)**: tool definitions, descriptions, parameter formats and error messages. Anthropic reports spending more time optimizing tools than the overall prompt when building its SWE-bench agent.

## Manager / supervisor hierarchies

A **supervisor** (also: manager, orchestrator, lead agent) receives the user goal, plans, delegates subtasks to **worker/specialist agents** (subagents), and integrates their outputs. Workers typically report back **only** to the supervisor; they do not talk to each other directly. This is the *hub-and-spoke* model.

Why it works:
- Each worker gets a **clean, focused context** containing only what it needs.
- The supervisor's context stays small because it receives **condensed results**, not every intermediate tool call.
- Specialists can have **different tools, permissions, prompts and models** (e.g., a cheap Haiku worker for file search, Opus for the lead).

Design rules that show up in questions:
- **Pass context explicitly.** A subagent does not inherit the parent's conversation by default — the parent must put everything the subagent needs (goal, constraints, relevant facts, expected output format) into the delegation prompt.
- **Define the task boundaries.** Vague delegation ("research X") leads to duplicated or missing work. Give each worker an objective, an output format, tool guidance and clear boundaries.
- **Scale effort to complexity.** Anthropic's research system instructs the lead agent to use 1 subagent for simple fact-finding and 10+ for complex comparisons; over-spawning wastes tokens.
- **Aggregate structured output.** Ask workers for structured results (with sources/metadata) so the supervisor can merge them reliably.
- **Deep hierarchies are rarely needed.** Each level adds latency, cost and a place for information to be lost. Two levels (supervisor + workers) cover most cases.

:::key What subagents improve — and what they cost
**Benefits:** context isolation (verbose exploration stays out of the main context), parallelism (independent subtasks run simultaneously → lower wall-clock time), specialization (focused prompts/tools), cost control (cheaper models for simple subtasks), and least privilege (restricted tool sets).

**Costs:** more total tokens (multi-agent research used roughly 15× the tokens of a chat interaction in Anthropic's measurements), coordination overhead, and loss of detail when results are summarized. Multi-agent systems pay off for **broad, parallelizable, high-value** tasks — not for tightly coupled tasks where every step needs the full shared context (many coding tasks).
:::

## Choosing the right architecture: worked scenarios

:::scenario Invoice field extraction
10,000 PDF invoices; extract vendor, date, total into JSON. Steps are known and identical for every document. → **Single call with structured outputs** (plus batch processing for cost). An agent adds cost and nondeterminism for no benefit.
:::

:::scenario Customer-support triage
Incoming messages fall into four known categories with different handling. → **Routing** workflow; each route can have its own prompt, tools and model.
:::

:::scenario "Fix the failing CI build"
Unknown root cause; might require reading logs, editing several files, re-running tests. → **Agent** with tool access in a sandbox, tests as feedback, and human review before merge.
:::

:::scenario Competitive research report
Needs searching many independent sources, then synthesis. → **Orchestrator-workers / supervisor with parallel subagents**; each subagent researches one aspect and returns a condensed, cited summary.
:::

:::scenario Regulated approval step
A loan must never be approved above a threshold without human sign-off. → Deterministic **code gate/hook** in the workflow, regardless of how capable the model is. Business rules that must always hold belong in code, not in the prompt.
:::

## Exam traps

:::trap "Use a multi-agent system" as the default answer
Multi-agent architectures multiply token cost and coordination complexity. If the scenario is a well-defined, fixed sequence, the correct answer is the simpler workflow (or a single call).
:::

:::trap Assuming subagents share memory with the parent
Subagents start with a fresh context. If a question describes a subagent "missing information the orchestrator had", the fix is to pass that information explicitly in the delegation prompt, not to switch models or increase max_tokens.
:::

:::trap Confusing sectioning with voting
Sectioning = *different* subtasks in parallel. Voting = the *same* task run several times to get diverse outputs or consensus.
:::

:::trap Putting hard business rules only in the prompt
"Always require approval above $10,000" is a deterministic requirement. A workflow gate or hook enforces it; a system-prompt instruction only makes it likely.
:::

## Practice questions

{{quiz:d1-arch-01}}

{{quiz:d1-arch-02}}

## Build exercise

:::exercise Compare a workflow and an agent on the same task
1. Pick a task with a known structure, e.g. "summarize a support ticket, classify its urgency, draft a reply".
2. Implement it as a **prompt chain**: three Messages API calls, each with its own focused prompt; add a programmatic gate that rejects a draft longer than 150 words.
3. Implement the same task as an **agent**: one loop where Claude has tools `classify_ticket`, `draft_reply` and `check_length` and decides the order itself.
4. Run both on 10 sample tickets. Record total input/output tokens (`usage`), latency and quality.
5. Write down which you would ship and why, using the four criteria (complexity, value, viability, cost of error).
6. Extend: add a **routing** step in front that sends billing tickets to a cheaper model. Measure the cost difference.
:::
