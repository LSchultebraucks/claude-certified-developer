---
skill: 8.2
title: MCP Server Development
summary: Author, test, deploy and integrate Model Context Protocol servers — tools, resources and prompts; host/client/server roles; stdio vs. HTTP transports; lifecycle; and how Claude Code, Claude Desktop, the Agent SDK and the Messages API connect to them.
sources: MCP architecture | https://modelcontextprotocol.io/docs/learn/architecture; MCP server concepts | https://modelcontextprotocol.io/docs/learn/server-concepts; Build an MCP server | https://modelcontextprotocol.io/docs/develop/build-server; MCP Inspector | https://github.com/modelcontextprotocol/inspector; MCP in Claude Code | https://code.claude.com/docs/en/mcp; MCP connector (Messages API) | https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
---

## What you need to know

The **Model Context Protocol (MCP)** is an open standard for connecting AI applications to external tools and data. Build an integration **once as an MCP server** and any MCP-capable host (Claude Code, Claude Desktop, claude.ai connectors, the Agent SDK, the Messages API MCP connector, third-party apps) can use it. The exam's own sample question: a reusable capability maintained independently of any one app → **build an MCP server**.

## Participants

| Role | What it is | Example |
|---|---|---|
| **Host** | The AI application the user interacts with; manages one or more clients | Claude Code, Claude Desktop, your Agent SDK app |
| **Client** | A connector inside the host that maintains **one dedicated connection to one server** | Created by the host per configured server |
| **Server** | A program exposing tools, resources and prompts | GitHub server, Postgres server, your inventory server |

One host → many clients → each with exactly one server.

## Layers

- **Data layer**: **JSON-RPC 2.0** messages — requests, responses, notifications — defining lifecycle, primitives and notifications.
- **Transport layer**: how messages travel.

| Transport | How | Typical use |
|---|---|---|
| **stdio** | Host launches the server as a **local subprocess**; messages over stdin/stdout | Local tools, file system, dev tools; single client; no network exposure |
| **Streamable HTTP** | HTTP POST for client→server messages, optional **SSE** for streaming server messages; standard HTTP auth (OAuth recommended, bearer tokens, API keys) | **Remote/hosted** servers serving many clients |
| **HTTP+SSE (legacy)** | Older remote transport, superseded by Streamable HTTP | Existing deployments |
| **WebSocket / custom** | Some hosts support socket transports (e.g., `ws` server type in Claude Code) | Special cases |

:::warn stdio servers must keep stdout clean
With stdio, **stdout carries the protocol**. Any `print()` debug output corrupts JSON-RPC messages. Log to **stderr** (or a file).
:::

## Lifecycle

Classic flow (widely deployed protocol versions):
1. Client sends **`initialize`** with its protocol version and capabilities.
2. Server responds with its version, **capabilities** (tools, resources, prompts, `listChanged` support…) and server info.
3. Client sends **`notifications/initialized`**; normal operation begins.
4. Discovery and use: `tools/list` → `tools/call`, `resources/list` → `resources/read`, `prompts/list` → `prompts/get`.
5. Notifications such as `notifications/tools/list_changed` tell clients to refresh.
6. Shutdown by closing the transport.

:::current Protocol evolution (2026)
The latest MCP specification (2026-07-28) makes the protocol stateless: each request carries version and capabilities in `_meta`, an optional `server/discover` request replaces the stateful initialize handshake, change notifications are opt-in via `subscriptions/listen`, and client **sampling** is deprecated. SDKs abstract these differences; the primitives (tools, resources, prompts) are unchanged.
:::

## Server primitives — who controls what

| Primitive | Controlled by | Purpose | Methods | Example |
|---|---|---|---|---|
| **Tools** | **Model** (the LLM decides to call them, usually with user approval) | Actions / computations with side effects or live data | `tools/list`, `tools/call` | `create_issue`, `query_db`, `get_inventory` |
| **Resources** | **Application** (host decides what to attach as context) | Read-only, URI-addressed data | `resources/list`, `resources/read`, resource templates (`file:///{path}`), subscriptions | Database schema, file contents, config docs |
| **Prompts** | **User** (explicitly chosen, e.g., as slash commands) | Reusable prompt templates with arguments | `prompts/list`, `prompts/get` | "/review-pr {number}", "summarize-incident" |

Client-side primitives (offered by hosts to servers): **elicitation** (server asks the user for input/confirmation), **roots** (which directories the server may work in), and — older versions — **sampling** (server asks the host's model for a completion) and **logging**.

## Authoring a server

```python inventory_server.py (Python, FastMCP from the official SDK)
from mcp.server.fastmcp import FastMCP
import sys

mcp = FastMCP("inventory")

@mcp.tool()
def get_stock(sku: str) -> str:
    """Return current stock level for a SKU. Use when the user asks about availability.
    sku: product SKU like 'SKU-12345'."""
    level = db_lookup(sku)
    if level is None:
        raise ValueError(f"Unknown SKU {sku}. SKUs look like 'SKU-12345'.")   # becomes an error result
    return f"{sku}: {level} units in stock"

@mcp.resource("inventory://warehouses")
def warehouses() -> str:
    """List of warehouses and their regions."""
    return load_warehouses_json()

@mcp.prompt()
def restock_report(region: str) -> str:
    return f"Create a restock report for region {region} using get_stock for low items."

if __name__ == "__main__":
    print("starting inventory server", file=sys.stderr)   # stderr, never stdout
    mcp.run(transport="stdio")                            # or "streamable-http" for remote
```

```ts server.ts (TypeScript SDK)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "inventory", version: "1.0.0" });
server.registerTool("get_stock",
  { description: "Return current stock level for a SKU.", inputSchema: { sku: z.string() } },
  async ({ sku }) => ({ content: [{ type: "text", text: `${sku}: ${await lookup(sku)} units` }] }));
await server.connect(new StdioServerTransport());
```

Authoring best practices:
- Same tool-design rules as lesson 8.1: clear names/descriptions, typed schemas, actionable errors (`isError: true` results), concise outputs, pagination.
- **Tools for actions, resources for context, prompts for user workflows** — don't model everything as tools.
- Validate inputs; enforce authorization inside the server; least-privilege credentials for the backend it wraps.
- Version the server; keep tool names stable (clients and permission rules reference them as `mcp__<server>__<tool>`).

## Testing

- **MCP Inspector** (`npx @modelcontextprotocol/inspector <command>`): interactive UI to connect to a server, list and call tools, read resources, render prompts, inspect JSON-RPC traffic.
- Unit-test tool functions directly; integration-test via a client SDK.
- In Claude Code: `/mcp` shows server status, tools and authentication; `claude --debug` for connection logs.

## Deployment

| Model | How | Considerations |
|---|---|---|
| **Local (stdio)** | Distributed as a package/binary; host launches it (`npx …`, `uvx …`, `docker run -i …`); or as an MCP bundle (`.mcpb`) / desktop extension | Runs with the user's local permissions; credentials via env vars; per-user install |
| **Remote (Streamable HTTP)** | Hosted service (container, serverless, Cloudflare/AWS/GCP…) | **OAuth** authorization, TLS, multi-tenant isolation, rate limiting, logging, scaling, session handling |

## Integration with Claude applications

| Host | How to connect |
|---|---|
| **Claude Code** | `claude mcp add <name> --transport stdio -- <command> [args]` or `--transport http <url>`; scopes **local** (default), **project** (`.mcp.json`, committed, users approve) and **user**; tools appear as `mcp__<server>__<tool>`; prompts as slash commands; `/mcp` to manage/authenticate |
| **Claude Desktop** | Local servers in the desktop config / desktop extensions; remote servers as connectors |
| **claude.ai** | Remote MCP servers as **connectors** (custom connectors) |
| **Agent SDK** | `mcp_servers={...}` (stdio command, HTTP URL, or in-process SDK server); allow tools by `mcp__server__tool` |
| **Messages API** | **MCP connector** (beta): `mcp_servers=[{type: "url", url, name, authorization_token}]` + an `mcp_toolset` entry in `tools`; remote servers only; Anthropic connects server-side |
| **Your own app** | Use an MCP client SDK to connect and convert MCP tools into Claude tool definitions (the Python SDK has conversion helpers for the Tool Runner) |

```json .mcp.json (project scope, committed)
{
  "mcpServers": {
    "inventory": { "command": "uvx", "args": ["inventory-mcp"], "env": { "INV_TOKEN": "${INV_TOKEN}" } },
    "issues":    { "type": "http", "url": "https://mcp.example.com/mcp" }
  }
}
```

## Communication patterns: client vs. server responsibilities

- **Server**: exposes capabilities, executes tool logic, serves resources, renders prompts, may send notifications (list changed, progress), may request elicitation.
- **Client/host**: discovers capabilities, decides what to show the model (tool definitions, attached resources), mediates **user approval** for tool calls, enforces permissions, routes calls to the right server, handles auth flows.
- Requests can flow both ways (server → client for elicitation), always over the one client–server connection.

## Security

- Third-party MCP servers are **code + content you trust**: review sources, pin versions, prefer official/verified servers.
- **Tool poisoning / injection**: malicious tool descriptions or outputs can carry instructions — treat outputs as untrusted; approval for sensitive tools.
- **Least privilege**: scope tokens; read-only where possible; restrict filesystem roots.
- **Remote servers**: OAuth with proper token audience/scopes, TLS, no token passthrough to downstream APIs.

## Exam traps

:::trap `print()` debugging in a stdio server
It writes to stdout and corrupts the protocol stream. Log to stderr.
:::

:::trap Modeling static reference data as a tool
Read-only context that the application should attach (schemas, docs) fits **resources**; user-chosen templates fit **prompts**.
:::

:::trap Using stdio for a server shared by many users across a network
stdio is a local subprocess transport. Shared remote servers use Streamable HTTP with proper authentication.
:::

:::trap Copy-pasting integration logic into each app
Reusable, independently maintained integrations belong in an MCP server many hosts can connect to.
:::

## Practice questions

{{quiz:d8-mcp-01}}

{{quiz:d8-mcp-02}}

## Build exercise

:::exercise Build, test and ship an MCP server
1. Build the inventory server above with FastMCP: two tools (`get_stock`, `reserve_stock`), one resource (`inventory://warehouses`) and one prompt (`restock_report`).
2. Test it in MCP Inspector: list tools, call them with valid and invalid input, read the resource, render the prompt.
3. Add it to Claude Code with `claude mcp add --transport stdio inventory -- uv run inventory_server.py`; check `/mcp`; ask a question that needs `get_stock`; run the prompt as a slash command.
4. Add a PreToolUse hook or `ask` rule so `mcp__inventory__reserve_stock` requires confirmation.
5. Switch the transport to Streamable HTTP, deploy it in a container, protect it with a bearer token/OAuth, and connect via a project-scoped `.mcp.json` with `${ENV}` expansion.
6. Connect the same server from the Agent SDK (`mcp_servers`) and, if remote, from the Messages API MCP connector.
:::
