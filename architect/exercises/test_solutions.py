"""Offline tests for the Architect reference solutions. No API key needed.

    pip install anthropic
    python architect/exercises/test_solutions.py
"""
import json
import os
import sys

import anthropic

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.append(os.path.join(HERE, "..", "..", "exercises"))       # shared Messages API mock (after HERE, so our solutions.py wins)
from mock_api import MockAPI, message  # noqa: E402
import solutions as s  # noqa: E402

TOOLS = [{"name": "lookup_order", "description": "Look up an order by ID.",
          "input_schema": {"type": "object", "properties": {"order_id": {"type": "string"}}, "required": ["order_id"]}}]
passed = 0


def check(name, cond):
    global passed
    assert cond, name
    passed += 1
    print("  ok ", name)


def client_for(api):
    return anthropic.Anthropic(api_key="test", base_url=api.url, max_retries=0)


def body(result):
    return json.loads(result["content"][0]["text"])


print("1.1 agentic loop")
with MockAPI([
    (200, message([{"type": "text", "text": "Let me look that up."},
                   {"type": "tool_use", "id": "toolu_1", "name": "lookup_order", "input": {"order_id": "ORD-1"}},
                   {"type": "tool_use", "id": "toolu_2", "name": "lookup_order", "input": {"order_id": "BAD"}}], "tool_use"), {}),
    (200, message([{"type": "text", "text": "ORD-1 shipped; BAD not found."}]), {}),
]) as api:
    def lookup_order(order_id):
        if order_id == "BAD":
            raise KeyError("order not found")
        return f"{order_id}: shipped"
    resp, history = s.run_agent(client_for(api), "Where are my orders?", TOOLS, {"lookup_order": lookup_order})
    second = api.requests[1]["messages"]
    check("text + tool_use does not end the loop (stop_reason drives it)", len(api.requests) == 2)
    check("all tool_results in one user message with matching ids",
          [r["tool_use_id"] for r in second[2]["content"]] == ["toolu_1", "toolu_2"])
    check("tool failure returned as is_error, loop continues", second[2]["content"][1].get("is_error") is True)
    check("ends on end_turn", resp.stop_reason == "end_turn")

loop_turn = (200, message([{"type": "tool_use", "id": "toolu_x", "name": "lookup_order",
                            "input": {"order_id": "ORD-1"}}], "tool_use"), {})
with MockAPI([loop_turn] * 3) as api:
    try:
        s.run_agent(client_for(api), "loop", TOOLS, {"lookup_order": lambda order_id: "x"}, max_turns=3)
        check("turn cap raises BudgetExceeded instead of returning", False)
    except s.BudgetExceeded:
        check("turn cap raises BudgetExceeded instead of returning", len(api.requests) == 3)

with MockAPI([(200, message([{"type": "text", "text": "{\"partial\": "}], "max_tokens"), {})]) as api:
    try:
        s.run_agent(client_for(api), "extract", TOOLS, {})
        check("max_tokens is reported as truncation, not completion", False)
    except s.TruncatedResponse:
        check("max_tokens is reported as truncation, not completion", True)

print("2.2 structured tool errors")
e = s.tool_error("business", "Refund exceeds policy")
check("isError set with category and retryability", e["isError"] and body(e)["errorCategory"] == "business"
      and body(e)["isRetryable"] is False)
check("transient errors are retryable", body(s.tool_error("transient", "timeout"))["isRetryable"] is True)
check("empty result is a success, not an error", s.tool_ok({"orders": []})["isError"] is False)

print("1.4 prerequisite gate")
payments = []
sess = s.SupportSession({"ana@example.com": {"id": "C-1", "last4": "4242"}}, payments, refund_limit=500)
r = s.gated_refund(sess, "C-1", "ORD-1", 120)
check("refund blocked before verification (permission error)",
      r["isError"] and body(r)["errorCategory"] == "permission" and not payments)
check("block message tells the agent what to do next", "get_customer" in body(r)["message"])
sess.get_customer("ana@example.com", "4242")
r = s.gated_refund(sess, "C-1", "ORD-1", 900)
check("refund above limit redirected to escalation (business error)",
      body(r)["errorCategory"] == "business" and "escalate_to_human" in body(r)["message"])
r = s.gated_refund(sess, "C-1", "ORD-1", 120)
check("verified refund within limit goes through", not r["isError"] and payments == [("ORD-1", 120)])

print("4.3/4.4 validation-retry extraction")
bad = {"invoice_number": "INV-7", "due_date": None, "stated_total": 1420.0,
       "line_items": [{"description": "A", "amount": 1000.0}, {"description": "B", "amount": 240.0}]}
good = dict(bad, line_items=[{"description": "A", "amount": 1180.0}, {"description": "B", "amount": 240.0}])
call = lambda data: message([{"type": "tool_use", "id": "toolu_e", "name": "record_invoice", "input": data}], "tool_use")
with MockAPI([(200, call(bad), {}), (200, call(good), {})]) as api:
    data, status, attempt = s.extract_with_retry(client_for(api), "INVOICE TEXT")
    retry_msg = api.requests[1]["messages"][-1]["content"][0]
    check("forced tool_choice for the schema", api.requests[0]["tool_choice"] == {"type": "tool", "name": "record_invoice"})
    check("retry carries the specific validation error", "1240.00" in retry_msg["content"] and retry_msg["is_error"])
    check("second attempt validates", status == "ok" and attempt == 1)
with MockAPI([(200, call(bad), {})] * 3) as api:
    data, status, attempt = s.extract_with_retry(client_for(api), "INVOICE TEXT", max_retries=2)
    check("persistent mismatch ends as needs_review after the cap", status == "needs_review" and len(api.requests) == 3)

print("4.5 batch failure resubmission")
results = [{"custom_id": "doc-1", "result": {"type": "succeeded"}},
           {"custom_id": "doc-2", "result": {"type": "errored"}},
           {"custom_id": "doc-3", "result": {"type": "expired"}}]
reqs = s.resubmit_failed(results, lambda cid: {"custom_id": cid})
check("only failed custom_ids are resubmitted", [r["custom_id"] for r in reqs] == ["doc-2", "doc-3"])

print("5.2 escalation")
base = dict(asked_for_human=False, policy_covers_request=True, attempts_without_progress=0)
check("explicit request for a human escalates", s.should_escalate(**dict(base, asked_for_human=True))[0])
check("policy gap escalates", s.should_escalate(**dict(base, policy_covers_request=False))[0])
check("angry customer with a simple in-policy issue is NOT escalated",
      not s.should_escalate(**base, sentiment="very negative", model_confidence=0.2)[0])

print(f"\nAll {passed} checks passed.")
