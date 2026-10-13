---
skill: 2.3
title: Claude API Mechanics
summary: The Messages API end to end — request and response anatomy, stop reasons, tools, streaming events, vision and PDFs, thinking, caching, third-party platforms, data access patterns, and batch vs. realtime.
sources: Messages API reference | https://platform.claude.com/docs/en/api/messages; Streaming messages | https://platform.claude.com/docs/en/build-with-claude/streaming; Vision | https://platform.claude.com/docs/en/build-with-claude/vision; PDF support | https://platform.claude.com/docs/en/build-with-claude/pdf-support; Adaptive thinking & effort | https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking; Message Batches | https://platform.claude.com/docs/en/build-with-claude/batch-processing; Files API | https://platform.claude.com/docs/en/build-with-claude/files; Citations | https://platform.claude.com/docs/en/build-with-claude/citations; Handling stop reasons | https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
---

## What you need to know

This skill is about how the API *behaves*. Questions give you a snippet, a symptom or a requirement and ask what happens or what to change. Know the request/response shapes cold.

## Request anatomy

Everything goes through **`POST https://api.anthropic.com/v1/messages`**.

```bash raw HTTP
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 1024,
    "system": "You are a concise assistant for an e-commerce help desk.",
    "messages": [
      {"role": "user", "content": "Where is my order?"}
    ]
  }'
```

| Field | Notes |
|---|---|
| `model` (required) | Model ID or alias, e.g. `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`. |
| `max_tokens` (required) | Hard cap on **output** tokens for this response. Hitting it truncates output (`stop_reason: "max_tokens"`). The model is not "aware" of it. |
| `messages` (required) | Conversation turns with `role` `user` or `assistant`. The first message must be `user`; roles alternate. |
| `system` | Top-level system prompt (string or array of text blocks). There is **no** `"system"` role at the start of `messages` — the initial system prompt goes here. |
| `tools`, `tool_choice` | Tool definitions and how Claude may use them. |
| `stream` | `true` for server-sent events. |
| `thinking` | Thinking configuration (`{"type": "adaptive"}` on current models). |
| `output_config` | `effort` (`low`…`max`) and `format` (JSON schema for structured outputs). |
| `stop_sequences` | Custom strings that stop generation (`stop_reason: "stop_sequence"`). |
| `metadata` | e.g. an opaque `user_id` for abuse monitoring (never PII). |
| `temperature`, `top_p`, `top_k` | Sampling controls on older models; **rejected** on the newest models (Opus 4.7+, Fable, Opus 5.x, …). |

Headers: `x-api-key` (or `Authorization: Bearer` for OAuth tokens), `anthropic-version: 2023-06-01` (required), optional `anthropic-beta` for beta features. The SDKs set these for you.

:::key The API is stateless
Claude does not remember previous requests. **Every request must contain the full conversation history you want the model to see** (or a compacted/summarized version). "Memory" across turns is something your application implements by resending messages.
:::

### Content blocks

`content` can be a string or an array of typed blocks:

| Block | Direction | Purpose |
|---|---|---|
| `text` | in/out | Text |
| `image` | in | Image via `source` `base64`, `url` or `file` (Files API) |
| `document` | in | PDF or plain text via `base64`, `url`, `text` or `file`; supports `citations` |
| `tool_use` | out | Claude requests a tool call (`id`, `name`, `input`) |
| `tool_result` | in | Your result (`tool_use_id`, `content`, optional `is_error`) |
| `thinking` / `redacted_thinking` | out | Reasoning blocks (must be passed back unchanged in multi-turn tool use on the same model) |
| `server_tool_use` / `*_tool_result` | out | Server-executed tools (web search, web fetch, code execution) |

## Response anatomy

```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "model": "claude-opus-5-5",
  "content": [{"type": "text", "text": "Your order shipped yesterday…"}],
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 412, "output_tokens": 58,
    "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0
  }
}
```

### Stop reasons — memorize this table

| `stop_reason` | Meaning | What your code should do |
|---|---|---|
| `end_turn` | Natural completion | Return the answer |
| `tool_use` | Claude wants tools executed | Run tools, send `tool_result`s, call again |
| `max_tokens` | Output hit `max_tokens` | Increase `max_tokens`, or continue; don't parse truncated JSON as complete |
| `stop_sequence` | A custom stop sequence was generated | Read `stop_sequence` to see which one |
| `pause_turn` | Server-side tool loop paused | Send the conversation (incl. this assistant content) back to continue |
| `refusal` | Safety classifiers declined (HTTP 200) | Don't use partial output/tools; show a fallback or route elsewhere; `stop_details` explains category |
| `model_context_window_exceeded` | Response filled the context window | Treat like truncation; reduce input |

### `usage`

`input_tokens` is the **uncached** remainder. Total prompt size = `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`. Output tokens include thinking tokens (thinking is billed as output).

## Multi-turn conversations

```python
history = []
def chat(user_text):
    history.append({"role": "user", "content": user_text})
    resp = client.messages.create(model="claude-sonnet-5-5", max_tokens=2048,
                                  system=SYSTEM, messages=history)
    history.append({"role": "assistant", "content": resp.content})
    return resp
```

- Alternate user/assistant; consecutive same-role messages are merged or rejected depending on shape — keep it clean.
- **Prefill is gone on current models**: ending `messages` with an assistant turn to "start" Claude's answer returns a 400 on the 4.6+/5.x families. Use structured outputs or system-prompt instructions instead.
- Mid-conversation instructions on supporting models: append a `{"role": "system", ...}` message instead of editing the top-level system prompt (keeps the cache valid).

## Tools (mechanics)

```json
{
  "name": "get_weather",
  "description": "Get the current weather for a city. Use when the user asks about current conditions.",
  "input_schema": {
    "type": "object",
    "properties": {"city": {"type": "string"}, "unit": {"type": "string", "enum": ["c", "f"]}},
    "required": ["city"]
  }
}
```

- `tool_choice`: `auto` (default — Claude decides), `any` (must call some tool), `tool` (must call a named tool), `none`. Add `disable_parallel_tool_use: true` to allow at most one call. Note: the newest models (Fable 5.1, Opus 5.5, Sonnet 5.5) reject forced `any`/`tool` — use `auto` + a prompt instruction, `strict: true`, or structured outputs.
- `strict: true` on a tool guarantees `input` validates against the schema.
- **Client tools** (you execute: custom tools, bash, text editor, memory, computer use) vs. **server tools** (Anthropic executes: web search, web fetch, code execution, tool search, advisor).
- Tool definitions count as input tokens and render first in the prompt (tools → system → messages).

## Streaming

Set `stream: true` (SDK: `client.messages.stream(...)`). The API sends **server-sent events (SSE)** over HTTP — not WebSockets.

```text event flow
message_start            → message object with empty content, initial usage
content_block_start      → index 0: {"type": "text"} (or tool_use / thinking)
content_block_delta      → text_delta | input_json_delta | thinking_delta | signature_delta
content_block_stop       → block 0 complete
... more blocks ...
message_delta            → stop_reason, final output usage
message_stop
(ping events may appear anywhere; an error event can arrive mid-stream, e.g. overloaded_error)
```

Why stream:
- **Perceived latency**: users see tokens immediately (low time-to-first-token).
- **Avoid HTTP timeouts** on long outputs — the SDKs require streaming for very large `max_tokens`.
- Tool inputs stream as `input_json_delta` partial JSON; accumulate and parse at `content_block_stop` (SDK helpers do this; `get_final_message()` / `finalMessage()` returns the assembled message).

Gotchas: errors can arrive **after** a 200 response has started, so handle error events inside the stream; and you must assemble partial JSON before using tool inputs.

## Vision (images)

```python
{"role": "user", "content": [
    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}},
    {"type": "text", "text": "What error is shown in this screenshot?"}
]}
```

- Formats: JPEG, PNG, GIF, WebP. Sources: base64, URL, or Files API `file_id`.
- Put images **before** the text that refers to them; label multiple images ("Image 1:", "Image 2:").
- Image cost scales with pixel area: Claude views images in 28×28-px patches, so an image costs about ⌈width/28⌉ × ⌈height/28⌉ visual tokens (e.g., 1000×1000 px ≈ 1,296 tokens). Images above the model's maximum resolution (long edge 1568 px on standard-tier models, 2576 px on Claude 4.7+ high-resolution models) are **downscaled** — resize yourself to save latency and tokens. (Older material cites the approximation width × height / 750.)
- Limits: up to 600 images per API request (100 on 200K-context models), max 8000×8000 px and 10 MB per image on the Claude API, 32 MB per request; requests with more than 20 images get a stricter per-image size limit. Use the Files API to avoid resending base64 images every turn.
- Very small (< 200 px), blurry or rotated images degrade accuracy. Claude does not identify people by their faces; Claude also cannot generate images.

## PDFs and documents

```python
{"type": "document",
 "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_b64},
 "citations": {"enabled": True}}
```

- PDFs are processed as **text plus page images**, so charts and tables are understood. Limits apply per request (size and page count).
- **Citations**: enable on document blocks to get answers split into text blocks with `citations` pointing at exact passages (`char_location`, `page_location`, `content_block_location`). Citations are incompatible with structured outputs.
- **Files API** (`POST /v1/files`): upload once, reference by `file_id` in many requests — avoids re-uploading large files. Files are scoped to the workspace.

## Thinking

| Mode | Config | Models |
|---|---|---|
| **Adaptive thinking** | `thinking: {"type": "adaptive"}` | Current models; Claude decides when/how much to think and interleaves thinking between tool calls; on several newest models it's on by default or always on |
| **Effort** | `output_config: {"effort": "low" \| "medium" \| "high" \| "xhigh" \| "max"}` | Controls thinking depth *and* overall token spend (tool calls, verbosity) |
| **Extended thinking with budget** (legacy) | `thinking: {"type": "enabled", "budget_tokens": N}` (`budget_tokens < max_tokens`, min 1024) | Older models (e.g., Haiku 4.5, Sonnet 4.5); deprecated on 4.6, rejected on newest models |
| **Display** | `thinking.display: "summarized" \| "omitted"` | Visibility only — thinking is billed either way; raw chain of thought is not exposed on current models |

Rules: thinking tokens are billed as **output tokens**; in tool-use loops pass thinking blocks back **unchanged** (they carry signatures); changing thinking settings mid-conversation invalidates parts of the prompt cache.

## Caching (mechanics overview)

Prompt caching reuses a processed **prefix** (tools → system → messages) up to a `cache_control` breakpoint. Cache writes cost more than base input (1.25× for the 5-minute TTL, 2× for 1-hour), cache reads cost a fraction (~0.1× on most models). Any byte change in the prefix invalidates everything after it. Details and cost math: lesson 5.4.

## Invoking Claude through third-party vendors

| Platform | Client | Model IDs | Auth |
|---|---|---|---|
| Claude API | `Anthropic()` | `claude-opus-5-5` | API key / OAuth / workload identity federation |
| Amazon Bedrock | `AnthropicBedrockMantle` (Messages API endpoint) or Bedrock runtime | prefixed, e.g. `anthropic.claude-opus-5-5` | AWS IAM (SigV4), region required |
| Google Vertex AI | `AnthropicVertex(project_id, region)` | bare IDs; dated snapshots use `@` (e.g. `claude-opus-4-5@20251101`) | GCP Application Default Credentials |
| Microsoft Foundry | `AnthropicFoundry` | per deployment | Azure key / Entra ID |

Same Messages API shape on all of them, but **feature availability, quotas, pricing, and release timing differ** — check before relying on a beta feature. Use the platform's dedicated client class rather than pointing the first-party client at a different `base_url`.

## Messages API data access patterns

How does data get into a request? Know the options and their trade-offs:

| Pattern | How | Use when |
|---|---|---|
| **Inline content** | Put text/documents/images directly in `messages` | Small, per-request data |
| **Files API** | Upload once, reference `file_id` | Same large file used across many requests |
| **Prompt caching** | Stable large context (manual, policies, codebase summary) cached as a prefix | Repeated questions over the same context |
| **Retrieval (RAG)** | Your code searches a vector/keyword index and inserts the top chunks | Large or changing knowledge bases |
| **Tools (client)** | Claude calls your function to fetch data on demand | Live data, per-user data, authorization-sensitive data |
| **MCP** | Data/tools exposed by an MCP server (Claude Desktop/Code, Agent SDK, or the API's MCP connector) | Reusable integrations across apps |
| **Server tools** | Web search / web fetch / code execution | Public web data, computation |
| **Citations / search results** | Provide documents or search-result blocks with citations enabled | Answers must cite sources |

## Message Batches API

`POST /v1/messages/batches` processes many Messages requests **asynchronously**:

- **50% discount** on all token usage.
- Up to **100,000 requests or 256 MB** per batch; most batches finish within **1 hour**, maximum **24 hours** (unfinished requests expire).
- Each request has a **`custom_id`**; results come back **in any order** — always match by `custom_id`.
- Poll `processing_status` until `ended`; then stream results; each result is `succeeded`, `errored`, `canceled` or `expired`. Results are available for 29 days.
- Supports the regular Messages features (tools, vision, system prompts, caching — cache hits in batches are best-effort).

```python
batch = client.messages.batches.create(requests=[
    {"custom_id": "ticket-1", "params": {"model": "claude-haiku-5-5", "max_tokens": 512,
        "messages": [{"role": "user", "content": "Classify: ..."}]}},
    # ...
])
# later
for r in client.messages.batches.results(batch.id):
    if r.result.type == "succeeded":
        save(r.custom_id, r.result.message.content)
```

### Realtime vs. batch — decision table

| Requirement | Choose |
|---|---|
| A user is waiting (chat, IDE, interactive UI) | Realtime Messages API (+ streaming) |
| Overnight / periodic jobs, backfills, evals, dataset labeling, bulk summarization | Batches API (50% cheaper) |
| Need results in seconds for each item of a large job | Realtime with concurrency control and rate-limit-aware backoff |
| Cost is the primary concern and results can wait up to 24 h | Batches API |
| Multi-turn agent loop that depends on each answer | Realtime (each step depends on the previous result) |

## Supporting endpoints

- **Token counting**: `POST /v1/messages/count_tokens` — exact input token count for a would-be request (free, rate-limited). Use it, not third-party tokenizers.
- **Models API**: `GET /v1/models` / `GET /v1/models/{id}` — list models and read `max_input_tokens`, `max_tokens` and capabilities at runtime.

## Exam traps

:::trap Expecting the API to remember the conversation
The Messages API is stateless. If follow-up answers "forget" earlier turns, the app isn't resending history.
:::

:::trap Putting the system prompt in `messages` with role "system" at index 0
The initial system prompt goes in the top-level `system` parameter.
:::

:::trap Believing streaming reduces cost
Streaming improves perceived latency and avoids timeouts. Token usage and price are the same.
:::

:::trap Processing batch results by position
Batch results can arrive in any order. Map them with `custom_id`.
:::

:::trap Treating `max_tokens` as a target length
It is a hard ceiling that truncates. To get shorter answers, instruct the model (or lower effort); to avoid truncation, raise `max_tokens`.
:::

## Practice questions

{{quiz:d2-api-01}}

{{quiz:d2-api-02}}

{{quiz:d2-api-03}}

## Build exercise

:::exercise API mechanics workbench
1. Write a CLI that sends a multi-turn conversation with a system prompt and prints `stop_reason` and the full `usage` object for each turn.
2. Add streaming: print text deltas live, and log every SSE event type you receive for one request.
3. Add a `get_weather` tool; print the raw `input_json_delta` fragments and the final parsed input.
4. Send a screenshot (image block) and a 10-page PDF (document block with citations enabled); print the citation locations.
5. Count tokens for a request with `count_tokens` before sending it; compare with `usage.input_tokens` afterwards.
6. Submit 50 classification requests through the Batches API with `custom_id`s; poll until `ended`, write results keyed by `custom_id`, and compare cost with the realtime run.
7. Force a truncation by setting `max_tokens: 20` and handle `stop_reason == "max_tokens"` gracefully.
:::
