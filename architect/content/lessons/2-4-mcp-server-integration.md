---
skill: 2.4
title: MCP Server Integration
summary: Project-scoped .mcp.json versus user-scoped configuration, environment-variable expansion for secrets, tools from many servers at once, resources for catalogs, and when to build versus reuse a server.
sources: Claude Code: MCP | https://code.claude.com/docs/en/mcp; MCP architecture | https://modelcontextprotocol.io/docs/learn/architecture; MCP server concepts | https://modelcontextprotocol.io/docs/learn/server-concepts; Agent SDK overview | https://code.claude.com/docs/en/agent-sdk/overview
---

## What you need to know

MCP (Model Context Protocol) lets Claude Code and Agent SDK agents use **tools, resources and prompts** exposed by external servers. As an architect you decide **where** a server is configured, **how secrets get in**, and **what** each server should expose.

## Scopes

| Scope | Stored in | Shared? | Use for |
|---|---|---|---|
| **Project** | `.mcp.json` in the repo root | Yes — committed, everyone on the team gets it | Team integrations: GitHub, Jira, the internal docs server |
| **User** | `~/.claude.json` | No | Personal or experimental servers, available in all your projects |
| **Local** | Project entry in `~/.claude.json` | No | Personal servers for one project only |

:::key Team vs. personal
If a new teammate "doesn't have the Jira tools", the server was configured at **user** scope on someone's machine. Team servers go in **`.mcp.json`**.
:::

## Secrets: environment-variable expansion

Never commit tokens. `.mcp.json` supports `${VAR}` (and `${VAR:-default}`) expansion:

```json .mcp.json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": { "Authorization": "Bearer ${GITHUB_TOKEN}" }
    },
    "inventory": {
      "command": "python",
      "args": ["tools/inventory_server.py"],
      "env": { "DB_URL": "${INVENTORY_DB_URL}" }
    }
  }
}
```

Each developer (and the CI runner) provides the variables; the file stays safe to commit.

## Many servers, one tool namespace

Tools from **all configured servers** are discovered at connection time and available simultaneously, named `mcp__<server>__<tool>`. That makes **descriptions** (2.1) even more important: an MCP tool must out-compete built-ins like Grep. Enhance MCP tool descriptions so Claude knows when your specialised tool beats a generic built-in.

## Tools vs. resources

- **Tools** perform actions or parameterised queries (`create_issue`, `search_orders`).
- **Resources** expose **content** the client can read: a catalog of 300 internal docs, database schemas, issue summaries.

:::scenario S4 — agent wastes turns exploring docs
The agent calls `list_docs`, `search_docs`, `get_doc` repeatedly just to learn what exists. **Better:** expose a **resource** with the documentation catalog (titles, summaries, paths). Claude sees what's available up front and fetches only what it needs.
:::

## Build or reuse?

For **standard integrations** (GitHub, Jira, Slack, Postgres) use existing, maintained MCP servers. Build **custom** servers for team-specific workflows and internal systems. Writing your own GitHub server is rarely the right answer.

## Exam traps

:::trap Hard-coding tokens in `.mcp.json`
Use `${ENV_VAR}` expansion.
:::

:::trap Configuring team servers in `~/.claude.json`
Teammates won't get them. Use project scope.
:::

:::trap Exposing a static catalog only through search tools
A resource gives visibility without exploratory calls.
:::

## Practice questions

{{quiz:a2-mcp-01}}

{{quiz:a2-mcp-02}}

## Build exercise

:::exercise Configure MCP for a team repository
1. Add an existing GitHub MCP server to `.mcp.json` using `${GITHUB_TOKEN}`; commit the file without secrets.
2. Add a personal experimental server at user scope (`claude mcp add --scope user …`); confirm it doesn't appear in the repo.
3. Build a tiny server exposing your docs catalog as a **resource** and a `search_docs` **tool**; compare how many calls Claude needs to answer doc questions.
4. Run `/mcp` in Claude Code to inspect connected servers and tools.
:::
