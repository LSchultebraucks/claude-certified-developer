---
skill: 8.3
title: Agentic Customization
summary: Choose correctly between built-in tools, custom tools, Skills and MCP servers (and know where subagents, hooks, CLAUDE.md and plugins fit) for a given use case.
sources: Agent Skills overview | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview; Equipping agents for the real world with Agent Skills | https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills; Claude Code: features overview / extend Claude Code | https://code.claude.com/docs/en/features-overview; Tool use overview | https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview; MCP | https://modelcontextprotocol.io
---

## What you need to know

At 4.1%, this skill is a pure **trade-off** skill: given a use case, pick the right extension mechanism. Learn what each mechanism *is*, what it costs, and the signals in a question that point to it.

## The four options

| | **Built-in tools** | **Custom tools** | **Skills** | **MCP servers** |
|---|---|---|---|---|
| What it is | Tools Anthropic defines (server-side: web search, web fetch, code execution, tool search; client-side schema-less: bash, text editor, memory, computer use; Claude Code's Read/Edit/Bash/Grep/…) | Functions **you** define with name, description and JSON schema; your app executes them | Folders of instructions (`SKILL.md`), scripts and resources that Claude loads **when relevant** | Standalone servers exposing tools, resources and prompts over a standard protocol to **any MCP host** |
| Adds | Generic capabilities | App-specific actions/data | **Procedural knowledge & expertise** (how to do something), optionally with executable scripts | **Connectivity** to external systems, reusable across apps |
| Context cost | Tool definitions | Tool definitions | Only name + description until used (progressive disclosure) | Tool definitions of connected servers (tool search can defer them) |
| Who maintains | Anthropic | You, inside your app | You/team; shareable via plugins or API upload | Server owner, **independently of the apps using it** |
| Reuse across apps | n/a | Low (lives in one codebase) | Medium–high (Claude Code, API, claude.ai, Agent SDK) | **High** (any MCP client) |
| Execution | Anthropic or your harness (by spec) | Your code | Instructions guide Claude; scripts run in Claude's execution environment | The MCP server process |
| Typical example | "Search the web for today's prices", "run this Python analysis", "edit files" | `issue_refund(order_id)` in your support app | "Our brand guidelines for slide decks", "how we do quarterly financial reconciliation", PDF/XLSX processing procedures | GitHub, Jira, Postgres, internal inventory REST API shared by several apps |

## Decision guide

1. **Does a built-in tool already do it?** (web search/fetch, code execution, file editing, shell, memory) → **use the built-in tool**. Less code, maintained by Anthropic, tuned for Claude. Don't rebuild web search.
2. **Is it an action or data source specific to *this* application** (your DB, your business logic), used by one app? → **custom tool** in that app.
3. **Must the integration be reused across multiple Claude applications/clients, or maintained by a separate team?** → **MCP server**.
4. **Is the gap *knowledge of how to do something*** — a procedure, conventions, domain expertise, templates, possibly with helper scripts — rather than access to a system? → **Skill**.
5. Combine: an MCP server gives access to Jira; a skill teaches "how our team triages bugs using Jira".

:::key Tools give capabilities; skills give know-how
A tool/MCP server answers "**what can Claude do or reach?**". A skill answers "**how should Claude do this kind of task well?**". If the scenario's problem is that Claude *can* do it but does it inconsistently or not the team's way, the answer is usually a skill (or better instructions), not another tool.
:::

## Skills in more depth

- Structure: `skill-name/SKILL.md` with YAML frontmatter (`name`, `description`) + Markdown instructions; optional reference files and scripts.
- **Progressive disclosure**: (1) name and description always loaded, (2) SKILL.md body loaded when the task matches, (3) additional files/scripts loaded only as needed. You can package lots of expertise without paying context for it upfront.
- Scripts in a skill run deterministically (e.g., a Python script that fills a PDF form) — **code for reliable steps**, instructions for judgment.
- Available across surfaces: Claude Code (`.claude/skills/`, plugins), the **Claude API** (Agent Skills with the code execution tool; Anthropic pre-built skills for docx/xlsx/pptx/pdf, custom skills uploaded via the Skills API), claude.ai, and the Agent SDK.
- Security: skills can include executable code — install only from trusted sources and review them.

## Where the other customization mechanisms fit

| Mechanism | Choose when |
|---|---|
| **System prompt / CLAUDE.md / rules** | Always-relevant facts and conventions (short) |
| **Skills** | On-demand procedures and expertise |
| **Custom tools** | App-specific actions/data in one app |
| **MCP servers** | Reusable integrations across apps/clients |
| **Built-in tools** | Generic capabilities Anthropic already provides |
| **Subagents** | Context isolation, parallel work, specialized tool sets/models |
| **Hooks** | Deterministic enforcement and automation at lifecycle events |
| **Slash commands** | User-triggered workflows (now unified with skills in Claude Code) |
| **Plugins** | Packaging and distributing any combination of the above |

## Worked scenarios

| Scenario | Best choice | Why not the others |
|---|---|---|
| Five internal Claude apps need to query the same inventory REST API; a platform team maintains it | **MCP server** | Custom tools would be duplicated in 5 codebases; skills don't provide connectivity |
| A research agent needs current news | **Built-in web search** (server tool) | Building a custom search tool duplicates a maintained capability |
| Claude produces reports that ignore the company's formatting and review checklist | **Skill** with the template and checklist | The issue is know-how, not capability |
| A support app must issue refunds through the company's billing service | **Custom tool** (with approval) in that app | Single-app business action; MCP only if other apps need it |
| Analyze an uploaded CSV and produce a chart | **Built-in code execution** | No need to build your own sandbox |
| Teach Claude Code your 15-step release process with helper scripts | **Skill** (`disable-model-invocation` for user-triggered) | CLAUDE.md would bloat every session |
| Prevent any agent from touching production config | **Hook / permission rule** | Not a tool, skill or MCP problem — it's enforcement |
| Distribute the release skill, a reviewer subagent and the inventory MCP config to 30 repos | **Plugin** | Packaging and versioned distribution |

## Exam traps

:::trap Building a custom tool for something built in
Web search, web fetch, code execution, file editing and memory already exist as Anthropic-defined tools.
:::

:::trap Choosing MCP for single-use, app-internal logic
MCP shines for reuse and independent maintenance. For one app's private function, a custom tool is simpler.
:::

:::trap Choosing a tool when the gap is procedural knowledge
If Claude has access but lacks the *method*, a skill (or instructions) is the fix.
:::

:::trap Putting everything into CLAUDE.md
Long, situational procedures belong in skills, which load only when relevant.
:::

## Practice questions

{{quiz:d8-cust-01}}

{{quiz:d8-cust-02}}

## Build exercise

:::exercise One problem, four mechanisms
1. Problem: "Prepare a weekly status report from our issue tracker in the team's format."
2. Implement access: (a) as a **custom tool** `list_issues` inside a small app; (b) as an **MCP server** exposing the same function; connect it to Claude Code and the Agent SDK.
3. Implement know-how: a **skill** `weekly-status` with the report template, grouping rules and a script that computes cycle-time stats.
4. Use a **built-in** tool where it fits (code execution to render a chart).
5. Add a **hook** that blocks the agent from posting the report anywhere without approval.
6. Package the skill and MCP config as a **plugin**. Write a short decision record explaining each choice.
:::
