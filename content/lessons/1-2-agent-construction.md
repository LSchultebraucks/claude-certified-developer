---
skill: 1.2
title: Agent Construction with Claude
summary: The four ways to build a Claude agent — manual loop, Tool Runner, Claude Agent SDK, Managed Agents — and how hooks add deterministic control.
sources: Agent SDK overview | https://code.claude.com/docs/en/agent-sdk/overview; Agent SDK Python reference | https://code.claude.com/docs/en/agent-sdk/python; Agent SDK hooks | https://code.claude.com/docs/en/agent-sdk/hooks; Tool use overview | https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview; Managed Agents overview | https://platform.claude.com/docs/en/managed-agents/overview
---

## What you need to know

Once you have decided that a task needs an agent (lesson 1.1), you still have to choose **how** to build and run it. The exam tests whether you can match a requirement ("we must run on our own infrastructure", "we want Anthropic to host the sandbox", "we need a coding agent with file and shell tools out of the box", "we only have three custom tools") to the right construction method.

Two independent questions separate the options:

1. **Who supplies the harness** — the agent loop, tool dispatch, context management?
2. **Who supplies the deployment** — the infrastructure the agent and its tools run on?

| # | Approach | You write | Harness | Deployment / tool execution | Built-in tools |
|---|---|---|---|---|---|
| 1 | **Manual agent loop** on the Messages API | The whole loop | You | You host | Only what you define (plus Anthropic server tools you declare) |
| 2 | **Tool Runner** (`client.beta.messages.tool_runner` in the Anthropic client SDK) | Tool functions | SDK helper runs the loop | You host | Only what you define |
| 3 | **Claude Agent SDK** (`claude-agent-sdk` / `@anthropic-ai/claude-agent-sdk`) | Prompt + options | The Claude Code harness as a library | You host (self-hosted) | Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, subagents, MCP, hooks, sessions |
| 4 | **Claude Managed Agents** (REST API, beta) | Agent config + your custom tool results | Anthropic | Anthropic-hosted per-session sandbox (or a self-hosted sandbox) | Bash, file ops, code execution in the container, web tools, Skills, MCP |

:::key The mental model the exam is looking for
Options 1, 2 and 3 all leave **deployment to you** (self-hosted). Option 4 is the only one where **Anthropic runs both the loop and the execution environment**. The Tool Runner and the Agent SDK are *not* the same thing: the Tool Runner automates the request → execute → repeat cycle for tools *you* define; the Agent SDK is Claude Code packaged as a library, with built-in tools, permissions, sessions, hooks and subagents.
:::

## 1. The manual agent loop

Everything ultimately goes through `POST /v1/messages`. A minimal agent loop:

```python manual_loop.py
import anthropic

client = anthropic.Anthropic()          # reads ANTHROPIC_API_KEY
tools = [{
    "name": "get_order",
    "description": "Look up an order by ID. Use whenever the user mentions an order number.",
    "input_schema": {
        "type": "object",
        "properties": {"order_id": {"type": "string", "description": "e.g. ORD-1234"}},
        "required": ["order_id"],
    },
}]
messages = [{"role": "user", "content": "Where is order ORD-1234?"}]

for _ in range(20):                      # safety cap, NOT the primary stop signal
    resp = client.messages.create(
        model="claude-opus-5-5", max_tokens=16000, tools=tools, messages=messages,
    )
    messages.append({"role": "assistant", "content": resp.content})   # keep tool_use blocks!
    if resp.stop_reason != "tool_use":
        break                            # end_turn, max_tokens, refusal, ... handle each
    results = []
    for block in resp.content:
        if block.type == "tool_use":
            try:
                out = run_tool(block.name, block.input)      # your dispatcher
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": out})
            except Exception as e:
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": f"Error: {e}", "is_error": True})
    messages.append({"role": "user", "content": results})    # ALL results in ONE user message
```

The rules that exam questions are built on:

- **`stop_reason` controls the loop.** Continue on `"tool_use"`; finish on `"end_turn"`. Never decide by parsing text ("I'm done") or by checking whether the first content block is text — Claude often writes a sentence *and* a tool call in the same response.
- **Append the full `response.content`** as the assistant turn (not just the text), so the `tool_use` blocks are in history; otherwise the following `tool_result` blocks have nothing to refer to and the API returns a 400.
- **Every `tool_use` gets a `tool_result`** with the matching `tool_use_id`, and all results for one turn go in a **single** user message.
- **Errors go back to Claude** as `tool_result` with `is_error: true` and an informative message; don't drop the result or crash the loop.
- **Iteration caps are a safety net**, not the primary termination mechanism.
- Handle the other stop reasons: `max_tokens` (output truncated — raise `max_tokens` or continue), `pause_turn` (a server-tool loop paused — send the conversation back to resume), `refusal` (safety decline — don't run tools from that turn), `stop_sequence`, `model_context_window_exceeded`.

Choose the manual loop when you need full control (custom transport, unusual control flow, no beta dependency) or for learning.

## 2. The Tool Runner (client SDK helper)

The Anthropic client SDKs include a beta **Tool Runner** that runs the loop for you. You declare tools as decorated functions (Python `@beta_tool`), Zod schemas (TypeScript `betaZodTool`), or annotated classes; the runner calls the API, executes your functions, feeds results back and stops when Claude stops calling tools.

```python tool_runner.py
from anthropic import Anthropic, beta_tool

client = Anthropic()

@beta_tool
def get_order(order_id: str) -> str:
    """Look up an order by ID. Use whenever the user mentions an order number."""
    return lookup(order_id)

runner = client.beta.messages.tool_runner(
    model="claude-opus-5-5", max_tokens=16000,
    tools=[get_order],
    messages=[{"role": "user", "content": "Where is order ORD-1234?"}],
)
final = runner.until_done()      # or iterate: for message in runner: ...
```

It is not a black box: each iteration yields the assistant message *before* tools run, so you can gate approvals, intercept errors, modify results (e.g., add `cache_control`) or bound the loop (`max_iterations`). It only knows the tools you give it — no file system, no shell, no sandbox.

## 3. The Claude Agent SDK

The **Claude Agent SDK** gives you the same agent loop, built-in tools and context management that power Claude Code, programmable in **Python** (`pip install claude-agent-sdk`) and **TypeScript** (`npm install @anthropic-ai/claude-agent-sdk`). Use it when you want a batteries-included agent that can read and edit files, run commands, search the web, spawn subagents and connect to MCP servers — running inside *your* process and infrastructure.

```python agent_sdk_basic.py
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    options = ClaudeAgentOptions(
        system_prompt={"type": "preset", "preset": "claude_code",
                       "append": "You are reviewing a Python service."},
        allowed_tools=["Read", "Grep", "Glob"],         # auto-approved
        disallowed_tools=["Bash(rm *)"],                 # always denied
        permission_mode="default",
        max_turns=30,
        cwd="/srv/repo",
    )
    async for message in query(prompt="Find all TODOs that mention security", options=options):
        print(message)    # AssistantMessage, UserMessage, SystemMessage, ResultMessage ...

asyncio.run(main())
```

Concepts to know:

| Concept | What it is |
|---|---|
| `query()` | One-off task; starts a new session each call; returns an async iterator of messages. |
| `ClaudeSDKClient` | Long-lived, multi-turn conversation in the same session; supports `interrupt()`; for chat UIs or when your next action depends on Claude's answer. |
| `allowed_tools` / `disallowed_tools` | Permission rules: allowed = auto-approved without prompting; disallowed = removed (bare name) or denied when matching a scoped rule like `Bash(rm *)`. Deny always wins. |
| `permission_mode` | `default`, `acceptEdits`, `plan`, `dontAsk`, `auto`, `bypassPermissions` — same modes as Claude Code. |
| `can_use_tool` | Your permission callback for calls that would otherwise prompt a human; returns allow (optionally with modified input) or deny. |
| `system_prompt` | A custom string, or the `claude_code` preset (optionally with `append`). |
| `setting_sources` | Which filesystem configuration to load (`user`, `project`, `local`): CLAUDE.md, settings, skills, commands. `[]` isolates the agent from local config. |
| `mcp_servers` | External MCP servers *or* in-process SDK MCP servers. |
| Custom tools | Python: `@tool(name, description, schema)` + `create_sdk_mcp_server(...)`; tools are then named `mcp__<server>__<tool>`. |
| `agents` | Programmatic subagent definitions (`AgentDefinition` with description, prompt, tools, model). |
| `hooks` | Callbacks on lifecycle events (PreToolUse, PostToolUse, UserPromptSubmit, Stop, SubagentStop, PreCompact, …). |
| Sessions | Every run has a `session_id`; `resume=<id>` continues it, `fork_session=True` branches it. |
| `ResultMessage` | Final message with `subtype` (`success`, `error_max_turns`, `error_max_budget_usd`, …), `result`, `total_cost_usd`, `usage`, `num_turns`, `session_id`. |
| Limits | `max_turns`, `max_budget_usd` for runaway protection. |

```python sdk_custom_tool.py
from claude_agent_sdk import tool, create_sdk_mcp_server, ClaudeAgentOptions

@tool("get_weather", "Get current weather for a city", {"city": str})
async def get_weather(args):
    return {"content": [{"type": "text", "text": f"{args['city']}: 18°C, cloudy"}]}

weather = create_sdk_mcp_server(name="weather", version="1.0.0", tools=[get_weather])
options = ClaudeAgentOptions(
    mcp_servers={"weather": weather},
    allowed_tools=["mcp__weather__get_weather"],
)
```

:::warn Branding and authentication
Agents built on the Agent SDK must authenticate with API keys (or Bedrock / Vertex / Foundry credentials) — third-party products may not offer claude.ai login or claude.ai rate limits unless approved. They must also not present themselves as "Claude Code".
:::

## 4. Managed deployment models: self-hosted vs. Anthropic-hosted

**Claude Managed Agents** (beta) is a third API surface for **server-managed, stateful agents**:

- You create a persisted, **versioned Agent** configuration (`model`, `system`, `tools`, Skills, MCP servers) once — typically via version-controlled config files and the `ant` CLI.
- Each run is a **Session** that references the agent. Anthropic provisions a **per-session container** (the agent's workspace) where bash, file operations and code execution run; the agent loop itself runs on Anthropic's orchestration layer.
- You consume a **stream of events** (SSE), send user messages, answer custom tool calls and approval requests.
- Credentials can live in **vaults** and are injected at egress so secrets never enter the sandbox.
- Extras: scheduled deployments (cron-like runs), outcomes (a grader iterates until a rubric passes), multiagent sessions, memory stores; self-hosted sandboxes exist when the tools must run on your infrastructure.

| Requirement in the question | Points to |
|---|---|
| "Must run in our VPC / on-prem / our own containers", "we control the compute" | Self-hosted: Agent SDK, Tool Runner or manual loop |
| "Don't want to build or operate sandbox infrastructure", "long-running sessions with a workspace", "versioned agent configs", "run every night" | Anthropic-hosted: Managed Agents |
| "Coding/file-system agent with shell and file tools out of the box" | Agent SDK (self-hosted) or Managed Agents (hosted) |
| "Three custom business tools, simple chat" | Tool Runner or manual loop |
| Available on Bedrock/Vertex/Foundry | Messages API + tool use (Managed Agents is a Claude API feature) |

## Hooks for deterministic actions

LLMs are probabilistic; some actions must be deterministic. **Hooks** are callbacks that the harness runs at fixed lifecycle points — they execute *every time*, regardless of what the model decides.

```python sdk_hook.py
from claude_agent_sdk import ClaudeAgentOptions, HookMatcher

async def block_dangerous(input_data, tool_use_id, context):
    cmd = input_data["tool_input"].get("command", "")
    if "rm -rf" in cmd or "git push --force" in cmd:
        return {"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": "Destructive command blocked by policy",
        }}
    return {}

async def audit(input_data, tool_use_id, context):
    log_to_siem(input_data["tool_name"], input_data["tool_input"])
    return {}

options = ClaudeAgentOptions(hooks={
    "PreToolUse":  [HookMatcher(matcher="Bash", hooks=[block_dangerous])],
    "PostToolUse": [HookMatcher(hooks=[audit])],
})
```

Typical uses: **block** destructive commands (PreToolUse deny), **validate or rewrite** tool input (`updatedInput`), **audit/log** every tool call (PostToolUse), **run formatters/linters/tests** after edits, **inject context** at session start or on each prompt, **enforce completion criteria** (Stop hook blocks stopping until tests pass), **notify** humans.

:::key Prompt vs. hook vs. permission rule
- A **prompt instruction** ("never run rm -rf") is guidance — usually followed, not guaranteed.
- A **permission rule** (`disallowed_tools=["Bash(rm *)"]`) is a static, declarative allow/deny on tool patterns.
- A **hook** is code: it can inspect full inputs, apply arbitrary logic, call external systems, and allow/deny/modify. Use hooks when the rule is conditional or needs logic.
When the requirement is "must always / must never", choose the deterministic mechanism.
:::

## Exam traps

:::trap Confusing the Tool Runner with the Agent SDK
The Tool Runner (in the `anthropic` client SDK) loops over *your* tools only. The Agent SDK (`claude-agent-sdk`) is the full Claude Code harness with built-in file, shell and web tools. Neither provides hosting — Managed Agents does.
:::

:::trap Ending the loop when the response contains text
`response.content[0].type == "text"` does not mean the agent is finished. Check `stop_reason`.
:::

:::trap Sending tool results in separate user messages
All `tool_result` blocks answering one assistant turn belong in a single user message. Splitting them also teaches Claude to stop making parallel calls.
:::

:::trap Using `allowed_tools` as a restriction
In the Agent SDK, `allowed_tools` auto-approves; it does not by itself prevent other tools from being *requested*. To make a tool unavailable, use `disallowed_tools` (or the `tools` option to define the base set).
:::

## Practice questions

{{quiz:d1-cons-01}}

{{quiz:d1-cons-02}}

{{quiz:d1-cons-03}}

## Build exercise

:::exercise Build the same agent three ways
1. **Manual loop:** implement a "repo librarian" with two tools, `list_files(dir)` and `read_file(path)`, using the Messages API. Handle `tool_use`, `end_turn`, `max_tokens` and tool errors (`is_error: true`). Add a 25-iteration safety cap that logs a warning.
2. **Tool Runner:** re-implement it with `@beta_tool` functions and `client.beta.messages.tool_runner`. Add an approval gate that asks you before reading any file under `secrets/`.
3. **Agent SDK:** re-implement it with `query()` and the built-in `Read`, `Glob`, `Grep` tools only (`allowed_tools`). Add a `PreToolUse` hook that denies any `Read` of a path containing `.env`.
4. Compare lines of code, token usage (`ResultMessage.total_cost_usd` / `usage`) and behavior.
5. Write a one-paragraph decision note: which approach for a hosted multi-tenant product, which for an internal CI bot, and when you'd consider Managed Agents.
:::
