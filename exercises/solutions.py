"""Reference solutions for the core build exercises (lessons 1.2, 4.1, 5.4, 7.3, 8.1, 8.2).

Each function is small and self-contained so it can be read next to its lesson.
Run `python exercises/test_solutions.py` to verify them offline.
"""
import random
import time

import anthropic

# --------------------------------------------------------------------- 1.2 / 8.1
# Manual agent loop: stop_reason drives the loop, full content is appended,
# every tool_use gets a tool_result in ONE user message, errors use is_error.

def run_agent(client, prompt, tools, dispatch, model="claude-opus-5-5", max_iterations=20):
    messages = [{"role": "user", "content": prompt}]
    for _ in range(max_iterations):                       # safety cap, not the primary stop signal
        resp = client.messages.create(model=model, max_tokens=16000, tools=tools, messages=messages)
        messages.append({"role": "assistant", "content": resp.content})
        if resp.stop_reason == "tool_use":
            results = []
            for block in resp.content:
                if block.type != "tool_use":
                    continue
                fn = dispatch.get(block.name)
                try:
                    if fn is None:
                        raise LookupError(f"Unknown tool {block.name}")
                    results.append({"type": "tool_result", "tool_use_id": block.id, "content": str(fn(**block.input))})
                except Exception as e:                    # report, don't crash the loop
                    results.append({"type": "tool_result", "tool_use_id": block.id,
                                    "content": f"Error: {e}", "is_error": True})
            messages.append({"role": "user", "content": results})
            continue
        if resp.stop_reason == "pause_turn":              # server-tool loop paused: resend to continue
            continue
        return resp, messages                             # end_turn, max_tokens, refusal, ... -> caller decides
    raise RuntimeError("iteration cap reached")


# --------------------------------------------------------------------- 4.1
# Retry only transient errors, with exponential backoff + jitter, honoring retry-after.

def call_with_retry(client, attempts=5, base_delay=0.5, sleep=time.sleep, **params):
    for attempt in range(attempts):
        try:
            return client.messages.create(**params)
        except anthropic.RateLimitError as e:             # 429
            retry_after = e.response.headers.get("retry-after")
            if retry_after is None:                       # e.g. monthly spend cap: retrying won't help
                raise
            wait = float(retry_after)
        except (anthropic.InternalServerError, anthropic.OverloadedError,      # 5xx / 529
                anthropic.APIConnectionError):                                    # network / timeout
            wait = base_delay * 2 ** attempt
        # 400/401/403/404/413 propagate immediately: they need a fix, not a retry
        sleep(wait + random.uniform(0, base_delay))
    raise RuntimeError("exhausted retries")


# --------------------------------------------------------------------- 5.4
# Cost model with prompt caching (prices per million tokens).

def request_cost(input_price, output_price, uncached_in=0, cache_write=0, cache_read=0, output=0,
                 ttl="5m", read_multiplier=0.1, batch=False):
    write_mult = 1.25 if ttl == "5m" else 2.0
    cost = (uncached_in * input_price + cache_write * input_price * write_mult
            + cache_read * input_price * read_multiplier + output * output_price) / 1_000_000
    return cost * (0.5 if batch else 1)


# --------------------------------------------------------------------- 7.3
# Agent SDK PreToolUse guardrail: deny destructive Bash commands deterministically.

DESTRUCTIVE = ("rm -rf", "git push --force", "git push -f", "drop table", "truncate ", "mkfs")

async def block_destructive(input_data, tool_use_id, context):
    cmd = str(input_data.get("tool_input", {}).get("command", "")).lower()
    if any(p in cmd for p in DESTRUCTIVE):
        return {"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": f"Blocked by policy: destructive command '{cmd}'",
        }}
    return {}


# --------------------------------------------------------------------- 8.2
# MCP server with a tool, a resource and a prompt (official Python SDK).

def build_inventory_server(stock):
    from mcp.server import MCPServer
    mcp = MCPServer("inventory")

    @mcp.tool()
    def get_stock(sku: str) -> str:
        """Return the current stock level for a SKU. Use when the user asks about availability."""
        if sku not in stock:
            raise ValueError(f"Unknown SKU {sku}. SKUs look like 'SKU-12345'.")
        return f"{sku}: {stock[sku]} units in stock"

    @mcp.resource("inventory://warehouses")
    def warehouses() -> str:
        """Warehouses and their regions."""
        return '[{"id": "W1", "region": "EU"}]'

    @mcp.prompt()
    def restock_report(region: str) -> str:
        return f"Create a restock report for region {region} using get_stock for low items."

    return mcp
