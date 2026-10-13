"""Offline tests for the reference solutions. No API key needed.

    pip install anthropic claude-agent-sdk mcp
    python exercises/test_solutions.py
"""
import asyncio
import os
import sys

import anthropic

sys.path.insert(0, os.path.dirname(__file__))
from mock_api import MockAPI, error, message  # noqa: E402
import solutions as s  # noqa: E402

TOOLS = [{"name": "get_order", "description": "Look up an order by ID.",
          "input_schema": {"type": "object", "properties": {"order_id": {"type": "string"}}, "required": ["order_id"]}}]
passed = 0


def check(name, cond):
    global passed
    assert cond, name
    passed += 1
    print("  ok ", name)


def client_for(api):
    return anthropic.Anthropic(api_key="test", base_url=api.url, max_retries=0)


print("1.2 agent loop")
with MockAPI([
    (200, message([{"type": "text", "text": "Let me look that up."},
                   {"type": "tool_use", "id": "toolu_1", "name": "get_order", "input": {"order_id": "ORD-1"}},
                   {"type": "tool_use", "id": "toolu_2", "name": "get_order", "input": {"order_id": "BAD"}}], "tool_use"), {}),
    (200, message([{"type": "text", "text": "ORD-1 shipped; BAD not found."}]), {}),
]) as api:
    def get_order(order_id):
        if order_id == "BAD":
            raise KeyError("order not found")
        return f"{order_id}: shipped"
    resp, history = s.run_agent(client_for(api), "Where are my orders?", TOOLS, {"get_order": get_order})
    second = api.requests[1]["messages"]
    check("continues past text + tool_use (stop_reason drives the loop)", len(api.requests) == 2)
    check("assistant turn keeps tool_use blocks", sum(b["type"] == "tool_use" for b in second[1]["content"]) == 2)
    results = second[2]["content"]
    check("all tool_results in ONE user message", second[2]["role"] == "user" and len(results) == 2)
    check("tool_use_ids matched", [r["tool_use_id"] for r in results] == ["toolu_1", "toolu_2"])
    check("failing tool reported with is_error", results[1].get("is_error") is True)
    check("ends on end_turn", resp.stop_reason == "end_turn")

print("4.1 retry strategy")
sleeps = []
with MockAPI([(429, error(429, "rate_limit_error"), {"retry-after": "0"}),
              (529, error(529, "overloaded_error"), {}),
              (200, message([{"type": "text", "text": "ok"}]), {})]) as api:
    r = s.call_with_retry(client_for(api), sleep=sleeps.append, model="claude-haiku-5-5", max_tokens=10,
                          messages=[{"role": "user", "content": "hi"}])
    check("retries 429 and 529, then succeeds", r.content[0].text == "ok" and len(api.requests) == 3)
with MockAPI([(400, error(400, "invalid_request_error"), {})]) as api:
    try:
        s.call_with_retry(client_for(api), sleep=sleeps.append, model="x", max_tokens=10, messages=[])
        check("400 is not retried", False)
    except anthropic.BadRequestError:
        check("400 is not retried", len(api.requests) == 1)
with MockAPI([(429, error(429, "rate_limit_error"), {})]) as api:   # spend cap: no retry-after
    try:
        s.call_with_retry(client_for(api), sleep=sleeps.append, model="x", max_tokens=10, messages=[])
        check("spend-cap 429 without retry-after is not retried", False)
    except anthropic.RateLimitError:
        check("spend-cap 429 without retry-after is not retried", len(api.requests) == 1)

print("5.4 cost model (numbers from the lesson's worked example)")
no_cache = s.request_cost(3, 15, uncached_in=21_000, output=500)
first = s.request_cost(3, 15, uncached_in=1_000, cache_write=20_000, output=500)
later = s.request_cost(3, 15, uncached_in=1_000, cache_read=20_000, output=500)
check("uncached request = $0.0705", round(no_cache, 4) == 0.0705)
check("cache write request = $0.0855", round(first, 4) == 0.0855)
check("cache read request = $0.0165", round(later, 4) == 0.0165)
check("100 requests: ~$7.05 vs ~$1.72", round(100 * no_cache, 2) == 7.05 and round(first + 99 * later, 2) == 1.72)
check("5-min TTL breaks even at 2 requests", 1.25 + 0.1 < 2 and not (1.25 < 1))
check("batch halves the price", s.request_cost(3, 15, uncached_in=10_000, output=2_000, batch=True) == 0.03)

print("7.3 PreToolUse guardrail hook")
deny = asyncio.run(s.block_destructive({"tool_input": {"command": "git push --force origin main"}}, "t1", None))
allow = asyncio.run(s.block_destructive({"tool_input": {"command": "npm test"}}, "t2", None))
check("destructive command denied", deny["hookSpecificOutput"]["permissionDecision"] == "deny")
check("safe command allowed", allow == {})
from claude_agent_sdk import ClaudeAgentOptions, HookMatcher  # noqa: E402
opts = ClaudeAgentOptions(hooks={"PreToolUse": [HookMatcher(matcher="Bash", hooks=[s.block_destructive])]})
check("hook registers in ClaudeAgentOptions", "PreToolUse" in opts.hooks)

print("8.2 MCP server")
mcp = s.build_inventory_server({"SKU-12345": 7})
async def mcp_checks():
    tools = await mcp.list_tools()
    check("tool exposed with schema", tools[0].name == "get_stock" and "sku" in tools[0].input_schema["required"])
    res = await mcp.call_tool("get_stock", {"sku": "SKU-12345"})
    check("tool returns stock", "7 units" in res.content[0].text)
    check("resource listed", [str(r.uri) for r in await mcp.list_resources()] == ["inventory://warehouses"])
    check("prompt listed", [p.name for p in await mcp.list_prompts()] == ["restock_report"])
asyncio.run(mcp_checks())

print(f"\nAll {passed} checks passed.")
