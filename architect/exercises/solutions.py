"""Reference solutions for the Architect (CCA-F) build exercises (lessons 1.1, 1.4, 2.2, 4.3/4.4, 4.5, 5.2).

Each function is small and self-contained so it can be read next to its lesson.
Run `python architect/exercises/test_solutions.py` to verify them offline.
"""
import json

MODEL = "claude-opus-5-5"


# --------------------------------------------------------------------- 1.1
# Agent loop: stop_reason is the control signal; the iteration cap is a safety net
# that raises instead of pretending the run finished; max_tokens is never "done".

class BudgetExceeded(RuntimeError):
    """The agent did not reach end_turn within its turn budget."""


class TruncatedResponse(RuntimeError):
    """The model hit max_tokens: the answer (or a tool call) is incomplete."""


def run_agent(client, prompt, tools, dispatch, model=MODEL, max_turns=15, max_tokens=4096):
    messages = [{"role": "user", "content": prompt}]
    for _ in range(max_turns):
        resp = client.messages.create(model=model, max_tokens=max_tokens, tools=tools, messages=messages)
        messages.append({"role": "assistant", "content": resp.content})
        if resp.stop_reason == "end_turn":
            return resp, messages
        if resp.stop_reason == "max_tokens":
            raise TruncatedResponse("response cut off at max_tokens; raise the limit or continue")
        if resp.stop_reason == "pause_turn":              # server-tool turn paused: send it back to continue
            continue
        if resp.stop_reason != "tool_use":                # refusal, stop_sequence, ... -> caller decides
            return resp, messages
        results = []
        for block in resp.content:
            if block.type != "tool_use":
                continue
            try:
                out = dispatch[block.name](**block.input)
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": str(out)})
            except Exception as e:                        # errors are information for the model
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": f"Error: {e}", "is_error": True})
        messages.append({"role": "user", "content": results})
    raise BudgetExceeded(f"no end_turn within {max_turns} turns")


# --------------------------------------------------------------------- 2.2
# Structured MCP-style tool error: category + retryability + a message Claude can act on.

RETRYABLE = {"transient": True, "validation": True, "business": False, "permission": False}


def tool_error(category, message, **extra):
    if category not in RETRYABLE:
        raise ValueError(f"unknown error category {category!r}")
    body = {"errorCategory": category, "isRetryable": RETRYABLE[category], "message": message, **extra}
    return {"isError": True, "content": [{"type": "text", "text": json.dumps(body)}]}


def tool_ok(data):
    """A successful result -- including a valid EMPTY result, which is not an error."""
    return {"isError": False, "content": [{"type": "text", "text": json.dumps(data)}]}


# --------------------------------------------------------------------- 1.4
# Prerequisite gate: refunds are blocked in code until identity is verified, and
# refunds above the limit are redirected to escalation. Prompts can't guarantee either.

class SupportSession:
    def __init__(self, crm, payments, refund_limit=500):
        self.crm, self.payments, self.refund_limit = crm, payments, refund_limit
        self.verified_customer_id = None                  # authoritative state lives here, not in the chat

    def get_customer(self, email, last4):
        cust = self.crm.get(email)
        if cust is None:
            return tool_ok({"matches": []})
        if cust["last4"] != last4:
            return tool_error("permission", "Verification failed: card digits don't match.")
        self.verified_customer_id = cust["id"]
        return tool_ok({"customer_id": cust["id"], "verified": True})

    def process_refund(self, customer_id, order_id, amount):
        if self.verified_customer_id != customer_id:
            return tool_error("permission", "Identity not verified for this customer. Call get_customer first.")
        if amount > self.refund_limit:
            return tool_error("business", f"Refunds above ${self.refund_limit} need a human. "
                                          "Call escalate_to_human with a case summary.")
        self.payments.append((order_id, amount))
        return tool_ok({"refunded": amount, "order_id": order_id})


def gated_refund(session, customer_id, order_id, amount):
    """Convenience wrapper used by the lesson: the gate is the session method itself."""
    return session.process_refund(customer_id, order_id, amount)


# --------------------------------------------------------------------- 4.3 / 4.4
# Schema via a forced tool call, semantic validation in code, retry with the SPECIFIC
# error, capped; unrecoverable cases end as needs_review instead of looping.

INVOICE_TOOL = {
    "name": "record_invoice",
    "description": "Record the fields extracted from one invoice.",
    "input_schema": {
        "type": "object",
        "properties": {
            "invoice_number": {"type": "string"},
            "due_date": {"type": ["string", "null"], "description": "ISO 8601; null if not stated"},
            "stated_total": {"type": "number"},
            "line_items": {"type": "array", "items": {"type": "object", "properties": {
                "description": {"type": "string"}, "amount": {"type": "number"}},
                "required": ["description", "amount"]}},
        },
        "required": ["invoice_number", "due_date", "stated_total", "line_items"],
    },
}


def validate_invoice(data):
    errors = []
    calculated = round(sum(i["amount"] for i in data["line_items"]), 2)
    if calculated != round(data["stated_total"], 2):
        errors.append(f"line items sum to {calculated:.2f} but stated_total is {data['stated_total']:.2f}")
    return errors


def extract_with_retry(client, document, model=MODEL, max_retries=2):
    messages = [{"role": "user", "content": document}]
    for attempt in range(max_retries + 1):
        resp = client.messages.create(model=model, max_tokens=2048, tools=[INVOICE_TOOL],
                                      tool_choice={"type": "tool", "name": "record_invoice"},
                                      messages=messages)
        call = next(b for b in resp.content if b.type == "tool_use")
        errors = validate_invoice(call.input)
        if not errors:
            return call.input, "ok", attempt
        if attempt == max_retries:
            return call.input, "needs_review", attempt
        messages += [
            {"role": "assistant", "content": resp.content},
            {"role": "user", "content": [{"type": "tool_result", "tool_use_id": call.id, "is_error": True,
                "content": "Validation failed: " + "; ".join(errors) + ". Re-check the document and "
                           "correct only these fields. If a value is not in the document, use null."}]},
        ]


# --------------------------------------------------------------------- 4.5
# Batch failures: resubmit ONLY the failed custom_ids, after fixing their cause.

def resubmit_failed(results, build_request):
    """`results`: iterable of {"custom_id", "result": {"type": ...}} from a finished batch."""
    failed = [r["custom_id"] for r in results if r["result"]["type"] != "succeeded"]
    return [build_request(cid) for cid in failed]


# --------------------------------------------------------------------- 5.2
# Escalation on reliable triggers only -- never on sentiment or self-reported confidence.

def should_escalate(*, asked_for_human, policy_covers_request, attempts_without_progress,
                    amount=0, authority_limit=500, sentiment=None, model_confidence=None):
    del sentiment, model_confidence                       # deliberately ignored: unreliable proxies
    if asked_for_human:
        return True, "customer asked for a human"
    if not policy_covers_request:
        return True, "policy gap or exception"
    if amount > authority_limit:
        return True, "above agent authority"
    if attempts_without_progress >= 3:
        return True, "no progress"
    return False, "resolve"
