# Coverage questions — one per official topic that needed a direct item

### y-11-01
skill: 1.1
type: single
A team debates a workflow versus an agent for generating a weekly sales summary from a fixed set of three dashboards, always in the same format. Which choice follows Anthropic's decision criteria?
- [ ] An agent, because summaries are text tasks that benefit from autonomy
- [x] A workflow, because the steps are known in advance and fixed every week
- [ ] An agent, because agents are always more accurate than workflows
- [ ] A multi-agent system, so each dashboard gets its own specialist agent
> The task is fully specifiable in advance (low complexity), so a predefined workflow is cheaper, faster and more predictable. Agents earn their cost only for open-ended tasks.

### y-13-01
skill: 1.3
type: single
Which practice is part of **context-window management** for a long-running agent rather than of tool design?
- [ ] Giving each tool a precise name and a detailed description
- [x] Compacting or clearing older turns as the conversation approaches its limit
- [ ] Marking tool input schemas as strict with `additionalProperties: false`
- [ ] Choosing between client-side and server-side tools for each capability
> Context-window management governs what stays in the window over time (compaction, clearing, isolation, notes). The other options concern tool definitions.

### y-24-01
skill: 2.4
type: single
Which practice best integrates an LLM feature into the team's existing **SDLC**?
- [ ] Editing prompts directly in production so changes ship without a pipeline
- [x] Treating prompts and evals as code: PR review, CI eval gates, staged deploys
- [ ] Running evals once at launch and never again to save API costs
- [ ] Keeping the LLM feature outside version control because outputs vary
> LLM artifacts follow the same lifecycle as code — reviewed, tested in CI, versioned and deployed through the normal pipeline.

### y-24-02
skill: 2.4
type: multi
A **large-scale refactoring** must replace a deprecated internal API used in 1,200 call sites while the service stays live. Which TWO techniques fit?
- [x] Expand–contract: add the new API, migrate callers in batches, then remove the old one
- [x] Mechanical codemods for the uniform cases, with Claude handling irregular cases
- [ ] One pull request that changes all 1,200 call sites at once
- [ ] Deleting the old API first so the compiler finds every caller
- [ ] Pausing all other development until the refactoring is merged
> Incremental, backwards-compatible migration and automation for mechanical parts keep risk low while the system stays deployable.

### y-25-01
skill: 2.5
type: single
Which is an example of good **session hygiene** in a multi-user Claude application?
- [ ] One shared conversation history for all users so context is maximized
- [x] Separate, bounded histories per user that expire per the retention policy
- [ ] Appending every user's latest message to a global system prompt
- [ ] Keeping all conversations forever so users can always continue them
> Per-user isolation, bounded history and retention limits keep context relevant, private and cost-efficient.

### y-26-01
skill: 2.6
type: single
A team wants to know which prompt produced a problematic answer three weeks ago. Which **prompt versioning** practice makes this possible?
- [ ] Overwriting the production prompt in place whenever someone improves it
- [x] Logging a prompt version identifier together with every single request
- [ ] Storing the prompt only in a shared document that anyone can edit
- [ ] Regenerating the prompt from the model's own suggestions each week
> Recording the prompt version (with the model ID) per request gives traceability to the exact configuration that produced an output.

### y-31-01
skill: 3.1
type: single
What is Claude Code's **headless mode**?
- [ ] A mode that hides the terminal UI while still waiting for keyboard approvals
- [x] Non-interactive execution with `claude -p` for scripts and CI pipelines
- [ ] A mode that runs Claude Code without any tools at all
- [ ] A browser-only version of Claude Code without a terminal
> Headless (print) mode runs a prompt non-interactively and exits, producing text, JSON or streaming JSON output.

### y-41-01
skill: 4.1
type: single
Reviewing traces, you see an agent call the same search tool with identical arguments eight times in a row. Which **failure mode** is this, and what typically causes it?
- [ ] Hallucination, caused by a temperature that is set too high
- [x] A repetition loop, often from uninformative tool results
- [ ] Truncation, caused by a `max_tokens` value that is too low
- [ ] Prompt injection, caused by malicious content in the system prompt
> Loops arise when results don't give the model new information (empty or vague outputs) or it lacks state about what was tried. Fix results/errors; keep caps as a safety net.

### y-41-02
skill: 4.1
type: single
Which observation identifies the **error type** as a client-side request problem rather than a transient service issue?
- [ ] HTTP 529 with `overloaded_error` during a traffic peak
- [x] HTTP 400 `invalid_request_error` for an unknown parameter
- [ ] HTTP 500 with `api_error` that disappears on retry
- [ ] A connection timeout before any HTTP response arrives
> 400 `invalid_request_error` points to the request itself; 529, 500 and network timeouts are transient and retryable.

### y-62-01
skill: 6.2
type: single
Which instruction is the best example of an **output constraint**?
- [ ] "Be helpful and thorough in your answer."
- [x] "Use at most 3 bullet points and plain text."
- [ ] "You are an experienced customer support specialist."
- [ ] "Think carefully about the customer's situation."
> Output constraints specify format, length and style of the response. The others set role, tone or reasoning.

### y-62-02
skill: 6.2
type: single
A prompt tuned for an older model produces overly long answers on a newer model. What is the appropriate **prompt adjustment** approach?
- [ ] Keep the prompt unchanged, since prompts are model-independent
- [x] Re-tune instructions for the new model's behavior and verify with evals
- [ ] Add "IMPORTANT: BE SHORT" in capitals at the top of the prompt
- [ ] Switch back to the older model, since prompts can't be migrated
> Model generations differ in verbosity and literalness; adjust instructions deliberately and measure the effect.

### y-63-01
skill: 6.3
type: single
Which snippet logic reflects **defensive parsing** of a Claude response?
- [ ] `json.loads(response.content[0].text)` without any checks
- [x] Check `stop_reason`, select blocks by type, parse safely
- [ ] Use a regex to find the first `{` and last `}` in the response
- [ ] Assume valid JSON because the prompt asked for JSON
> Defensive parsing checks completion state, selects blocks by type, parses safely and validates against a schema, logging raw output on failure.

### y-71-01
skill: 7.1
type: single
Which measure most directly prevents **data leakage** through the system prompt?
- [ ] Asking the model in the system prompt never to reveal its instructions
- [x] Keeping secrets and sensitive data out of the system prompt entirely
- [ ] Making the system prompt as long as possible to hide key details
- [ ] Encoding the system prompt in base64 before sending it
> Assume prompts can leak. Instructions not to reveal them help a little; not putting sensitive content there removes the risk.

### y-72-01
skill: 7.2
type: multi
Which TWO choices reflect **secure-by-design** and identity and access management principles for a new agent?
- [x] Each agent action runs with the requesting user's scoped permissions
- [x] Tools start disabled and are enabled only after review
- [ ] A shared admin account is used so every action succeeds
- [ ] Security review is scheduled for after the public launch
- [ ] All users get the same role to keep access simple
> Least privilege, user-scoped identities and secure defaults are built in from the start; shared admin accounts and post-launch security contradict it.

### y-73-01
skill: 7.3
type: single
An agent with database tools must never run `DROP TABLE` or `TRUNCATE`, a **destructive action**. Which control prevents it?
- [ ] A note in the tool description asking Claude not to drop tables
- [x] A PreToolUse hook that denies destructive SQL statements
- [ ] A PostToolUse hook that alerts the DBA after the statement ran
- [ ] A higher effort level so the model avoids risky statements
> Prevention must happen before execution and deterministically — a PreToolUse hook (plus least-privilege DB credentials).

### y-81-01
skill: 8.1
type: single
In **function calling** with Claude, who executes a custom function?
- [ ] Claude executes it inside the model during generation
- [x] Your application, which returns a `tool_result`
- [ ] Anthropic executes it on its servers using your code
- [ ] The user's browser executes it automatically
> For client (custom) tools, Claude only emits the call; your harness runs the function and sends the result back.

### y-81-02
skill: 8.1
type: single
A tool calls a partner's REST API. Which configuration practice for **external system interaction** is best?
- [ ] Let the model supply the API base URL as a tool argument
- [x] Use per-environment config for URL and credentials
- [ ] Hard-code the production URL and key in the tool's source code
- [ ] Put the API key in the tool description so the model can use it
> Endpoints and credentials come from configuration/secret stores per environment, with timeouts and retries — never from the model or the prompt.

### y-82-01
skill: 8.2
type: single
When **authoring** an MCP server with the official Python SDK, how is a function typically exposed as a tool?
- [ ] By listing the function's name in the client's system prompt
- [x] By decorating it with `@mcp.tool()` on the server instance
- [ ] By uploading the function to the Files API and referencing its ID
- [ ] By writing the function as a Claude Code skill in `SKILL.md`
> The SDK derives the tool name, description and input schema from the decorated function's signature and docstring.

### y-82-02
skill: 8.2
type: single
How should a remote MCP server be **deployed** for a multi-team company?
- [ ] As a script each user runs by hand in a terminal window
- [x] As a hosted Streamable HTTP service with OAuth, TLS, logging and isolation
- [ ] As an attachment emailed to users with setup instructions
- [ ] As a stdio process on one shared laptop that everyone connects to
> Shared remote servers need production hosting: HTTP transport, authorization, TLS, observability and tenant isolation.
