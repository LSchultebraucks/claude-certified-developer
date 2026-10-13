# Build exercises — reference solutions

Reference implementations for the core build exercises, with offline tests (a local mock of the Messages API — no API key, no cost).

| Function in `solutions.py` | Lesson | What it demonstrates |
|---|---|---|
| `run_agent` | 1.2, 8.1 | Manual agent loop driven by `stop_reason`, full assistant content kept, all `tool_result`s in one user message, tool errors as `is_error` |
| `call_with_retry` | 4.1 | Retry only transient errors (429 with `retry-after`, 5xx, 529 `OverloadedError`, network); never 400s or spend-cap 429s |
| `request_cost` | 5.4 | Cost model with cache writes (1.25× / 2×), cache reads (0.1×) and the batch discount |
| `block_destructive` | 7.3 | Agent SDK `PreToolUse` hook that deterministically denies destructive commands |
| `build_inventory_server` | 8.2 | MCP server with a tool, a resource and a prompt (official Python SDK) |

```bash
pip install anthropic claude-agent-sdk mcp
python exercises/test_solutions.py
```

Expected output ends with `All 22 checks passed.` To run the agent loop against the real API, create a normal `anthropic.Anthropic()` client (with `ANTHROPIC_API_KEY` set) and call `run_agent(...)` with your own tools.
