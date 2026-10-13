---
skill: 5.2
title: Technical Fundamentals
summary: Engineering practices for integrating Claude — what client SDKs do on top of the REST API, configuring them correctly, raw HTTP, streaming transports (SSE vs. WebSockets), webhooks and polling, and relaying responses safely to frontends.
sources: Client SDKs | https://platform.claude.com/docs/en/api/client-sdks; API overview (headers, versioning) | https://platform.claude.com/docs/en/api/overview; Streaming | https://platform.claude.com/docs/en/build-with-claude/streaming; Rate limits (response headers) | https://platform.claude.com/docs/en/api/rate-limits; WebSocket protocol (RFC 6455) | https://www.rfc-editor.org/rfc/rfc6455; Server-sent events (HTML spec) | https://html.spec.whatwg.org/multipage/server-sent-events.html
---

## What you need to know

At 6.1% this skill is heavier than it looks. It tests practical engineering: using SDKs that wrap the Claude REST API correctly, knowing what happens at the HTTP level, and choosing the right real-time transport (SSE, WebSockets, polling, webhooks) for an application.

## What a client SDK gives you over raw REST

Anthropic publishes official SDKs (Python, TypeScript/JavaScript, Java/Kotlin, Go, Ruby, C#, PHP). They wrap `https://api.anthropic.com/v1/...` and add:

| SDK feature | Detail |
|---|---|
| **Authentication** | Reads `ANTHROPIC_API_KEY` (or other configured credential sources) and sets the `x-api-key` / auth headers |
| **Required headers** | Sets `anthropic-version`; beta features via a `betas` parameter → `anthropic-beta` header |
| **Typed requests/responses** | Classes/types for messages, content blocks, tools (`MessageParam`, `ToolUseBlock`, …) — use them instead of redefining your own |
| **Automatic retries** | Retries connection errors, 408, 409, 429 and 5xx with exponential backoff (default **2 retries**); configurable `max_retries` |
| **Timeouts** | Default request timeout (10 minutes); configurable globally or per request. **Units differ**: Python seconds, TypeScript milliseconds |
| **Typed errors** | `BadRequestError`, `AuthenticationError`, `PermissionDeniedError`, `NotFoundError`, `RateLimitError`, `InternalServerError`, `APIConnectionError` … |
| **Streaming helpers** | `client.messages.stream(...)`, `text_stream`, `get_final_message()` / `finalMessage()` accumulate SSE events for you |
| **Tool helpers** | Tool Runner, schema generation from functions/Zod/Pydantic, `messages.parse()` for structured outputs |
| **Pagination** | Iterating list endpoints auto-paginates |
| **Sync & async clients** | `Anthropic` / `AsyncAnthropic` (Python); promises in TS |
| **Platform clients** | Bedrock, Vertex AI, Foundry variants with the same surface |
| **Request IDs** | `_request_id` / response headers exposed for logging |

```python sdk_config.py
import anthropic

client = anthropic.Anthropic(        # create ONCE and reuse (connection pooling)
    max_retries=4,                   # default 2
    timeout=60.0,                    # seconds in Python (TS: milliseconds)
)
msg = client.with_options(timeout=10.0).messages.create(   # per-request override
    model="claude-haiku-5-5", max_tokens=256,
    messages=[{"role": "user", "content": "ping"}],
)
print(msg._request_id)               # log for support/debugging
```

Good practices:
- **Reuse one client instance** (HTTP connection pooling); don't create a client per request.
- **Pin SDK versions** in your dependency file and upgrade deliberately (read changelogs; major versions can break).
- Use the **SDK's types and helpers** instead of hand-rolling them (don't wrap stream events in your own promises when `finalMessage()` exists; don't string-match errors).
- Keep **beta usage explicit** (`client.beta.*`, `betas=[...]`) so it's visible in code review.
- Configure **observability**: log request IDs, latency, `usage`; many teams export traces via OpenTelemetry.
- Use **environment variables / secret managers** for credentials; never embed keys in source or client-side code.

## Raw HTTP when there's no SDK

Any language with HTTP works:

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-5-5","max_tokens":256,"messages":[{"role":"user","content":"ping"}]}'
```

Then **you** implement what the SDK gave you: retries with backoff for 429/5xx/529, timeouts, SSE parsing for streaming, error handling by status/type, and JSON (de)serialization. Rate-limit information comes back in response headers (e.g., `anthropic-ratelimit-requests-remaining`, `anthropic-ratelimit-input-tokens-remaining`, `retry-after` on 429).

## Real-time transports: SSE vs. WebSockets vs. polling vs. webhooks

| Transport | Direction | Connection | Typical use | Claude context |
|---|---|---|---|---|
| **HTTP request/response** | Client → server → client | Short-lived | Standard API calls | Non-streaming Messages API |
| **Server-Sent Events (SSE)** | **Server → client only**, text events over HTTP | Long-lived HTTP response | Streaming tokens/notifications to a client | **The Messages API streams via SSE**; also a simple way to relay tokens from your backend to a browser |
| **WebSockets** | **Full-duplex** (both directions) over one persistent TCP connection (upgrade from HTTP) | Long-lived, stateful | Chat with interruptions, collaborative editing, voice, live dashboards with client input | Your app ↔ your users; not how the Claude API itself streams |
| **Polling** | Client asks repeatedly | Short requests on an interval | Checking job status | Batch API `processing_status` polling |
| **Long polling** | Client request held open until data or timeout | Semi-persistent | Legacy push emulation | Rarely needed |
| **Webhooks** | **Server pushes an HTTP callback** to your endpoint on events | Event-driven | Job completion, async events | Event notifications in async platforms (e.g., agent sessions); verify signatures |

:::key Choosing a transport
- Need to **stream model output to a browser**? SSE is the simplest (one direction, auto-reconnect in browsers via `EventSource`, works through most proxies). WebSockets work too and make sense if the client must also send messages mid-stream (e.g., "stop", user typing, audio).
- Need **bidirectional, low-latency, continuous** interaction (voice assistant, multiplayer editing)? WebSockets.
- Long-running **asynchronous jobs**? Poll status with backoff, or receive a **webhook** when done.
:::

### Relaying Claude to a frontend — the secure architecture

```text
Browser ──(WebSocket or SSE, your auth/session)──> Your backend ──(HTTPS + SSE, API key)──> Claude API
```

- The **API key stays on the backend**; the browser authenticates to *your* service (session/JWT). Never call the Claude API directly from browser or mobile code with your key.
- The backend enforces **authorization, rate limiting per user, input validation, logging and cost controls**.
- The backend consumes Claude's SSE stream and forwards deltas over SSE/WebSocket; handle client disconnects by **cancelling the upstream request** (saves tokens).

### WebSocket engineering considerations

- **Connection lifecycle**: handshake (HTTP Upgrade), heartbeats/ping-pong to detect dead connections, reconnect with backoff, resume state after reconnect.
- **Scaling**: connections are stateful → sticky sessions or a shared pub/sub layer; load balancers and proxies must support upgrades and long-lived connections; idle timeouts.
- **Security**: authenticate the handshake (token), validate every message, `wss://` (TLS) only, enforce message size limits and rate limits.
- **Backpressure**: slow clients — buffer limits, drop or pause producers.
- **Message framing**: define a protocol (`{"type":"delta","text":…}`, `{"type":"done"}`, `{"type":"error"}`).

## Other fundamentals that appear in questions

- **Environment configuration**: `ANTHROPIC_API_KEY`, base URLs, per-environment keys; 12-factor style config.
- **Idempotency and retries** (lesson 2.4) — especially for tool calls with side effects.
- **Timeouts for long generations**: stream, or raise client timeouts; large `max_tokens` non-streaming requests may be rejected or time out — SDKs push you to stream.
- **JSON handling**: parse tool inputs with a JSON parser; validate with schemas.
- **Concurrency limits**: semaphores/queues sized to rate limits.
- **Dependency hygiene**: lockfiles, vulnerability scanning, reproducible builds.

## Exam traps

:::trap "Claude streams over WebSockets"
The Messages API streams with **server-sent events** over HTTP. WebSockets are something you might use between your backend and your users.
:::

:::trap Calling the Claude API directly from a browser app
Shipping the API key to clients exposes it. Proxy through a backend that authenticates users and enforces limits.
:::

:::trap Creating a new SDK client per request
You lose connection reuse and may multiply retries/timeouts misconfiguration. Create one client and reuse it.
:::

:::trap Mixing timeout units
`timeout=10` is 10 seconds in Python but 10 *milliseconds* in TypeScript (`timeout: 10_000` for 10 s).
:::

## Practice questions

{{quiz:d5-tech-01}}

{{quiz:d5-tech-02}}

{{quiz:d5-tech-03}}

## Build exercise

:::exercise Stream Claude to a browser securely
1. Build a small backend (FastAPI or Express) with one endpoint that accepts a user message, authenticates the user with a session token, and calls Claude with `client.messages.stream`.
2. Relay text deltas to the browser via **SSE** (`text/event-stream`); render them live with `EventSource`.
3. Re-implement the relay over a **WebSocket**, adding a client → server "stop" message that cancels the upstream Claude request.
4. Add heartbeats, reconnect with backoff, and per-user rate limiting.
5. Implement the same call once with raw HTTP (no SDK): parse SSE manually, retry 429/529 with backoff, and log the rate-limit headers.
6. Verify the API key never appears in browser dev tools or network traffic.
:::
