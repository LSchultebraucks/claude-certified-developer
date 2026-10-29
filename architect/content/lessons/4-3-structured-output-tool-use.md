---
skill: 4.3
title: Structured Output via Tool Use & JSON Schemas
summary: Enforcing output structure with tool definitions and JSON schemas — what schemas guarantee and what they don't, tool_choice for structure, nullable fields against fabrication, and enum patterns for ambiguity.
sources: Structured outputs | https://platform.claude.com/docs/en/build-with-claude/structured-outputs; How to implement tool use | https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use; Increase output consistency | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency; Reduce hallucinations | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
---

## What you need to know

Downstream systems need **valid, predictable JSON**. Asking for JSON in the prompt makes it likely; **tool use with a JSON schema** makes the structure reliable: you define a tool whose `input_schema` is the shape you want, and Claude "calls" it with the extracted data. (The API's **structured outputs** feature and `strict: true` tool definitions go further and constrain decoding to the schema.)

```python extraction via tool use
extract_invoice = {
    "name": "record_invoice",
    "description": "Record the fields extracted from one invoice.",
    "input_schema": {
        "type": "object",
        "properties": {
            "vendor":        {"type": "string"},
            "invoice_number":{"type": "string"},
            "invoice_date":  {"type": "string", "description": "ISO 8601 (YYYY-MM-DD)"},
            "due_date":      {"type": ["string", "null"], "description": "null if not stated"},
            "currency":      {"type": "string", "enum": ["USD", "EUR", "GBP", "other"]},
            "currency_other":{"type": ["string", "null"]},
            "stated_total":  {"type": "number"},
            "line_items":    {"type": "array", "items": {"type": "object",
                              "properties": {"description": {"type": "string"},
                                             "amount": {"type": "number"}},
                              "required": ["description", "amount"]}}
        },
        "required": ["vendor", "invoice_number", "invoice_date", "due_date",
                     "currency", "stated_total", "line_items"]
    },
}
resp = client.messages.create(model=MODEL, max_tokens=2048, tools=[extract_invoice],
        tool_choice={"type": "tool", "name": "record_invoice"},
        messages=[{"role": "user", "content": invoice_text}])
data = next(b.input for b in resp.content if b.type == "tool_use")
```

## What schemas guarantee — and what they don't

:::key Syntax vs. semantics
A schema eliminates **syntax and shape errors**: missing braces, wrong types, missing required keys. It does **not** guarantee **correct values**: line items that don't sum to the total, a date in the wrong field, a value copied from the wrong section. Those need **semantic validation** in code (4.4).
:::

## Designing schemas that prevent fabrication

- **Nullable / optional fields** for information that may be absent. If `due_date` is required and non-nullable, Claude must put *something* there — and will invent a plausible date. Make it `["string","null"]` and say "null if not stated".
- **Enums with an escape hatch**: add `"other"` plus a detail field (`currency_other`) so unusual values aren't forced into a wrong category.
- **`"unclear"`** values where the source is genuinely ambiguous — better than a confident guess.
- **Format instructions** in descriptions (ISO dates, units, normalised names) so values are consistent.

## tool_choice for structure

| Situation | `tool_choice` |
|---|---|
| One known schema, must always be used | Forced: `{"type":"tool","name":"record_invoice"}` |
| Several schemas, document type unknown | `{"type":"any"}` — must call one of them |
| Extraction is optional (some inputs aren't documents) | `auto` |

## Exam traps

:::trap "The schema guarantees correct data"
It guarantees structure. Validate semantics.
:::

:::trap Required non-nullable fields for optional information
Causes fabrication. Use nullable fields.
:::

:::trap Prompt-only "respond in JSON" for a downstream integration
Use tool use/structured outputs for reliability.
:::

## Practice questions

{{quiz:a4-schema-01}}

{{quiz:a4-schema-02}}

## Build exercise

:::exercise Schema-first extraction
1. Implement `record_invoice` as above and extract 20 invoices with a forced tool choice.
2. Make `due_date` required and non-nullable; count invented dates on invoices without one. Then make it nullable and recount.
3. Add `"other"` + detail to the currency enum; feed a CHF invoice.
4. Validate `sum(line_items) == stated_total` in code and count semantic errors the schema didn't catch.
:::
