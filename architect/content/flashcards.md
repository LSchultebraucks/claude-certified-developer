Q: Which field drives the agentic loop, and which values continue vs. end it?
A: `stop_reason`. **`tool_use`** → execute the tools, append `tool_result` blocks, call again. **`end_turn`** → done. Other values (`max_tokens`, `pause_turn`, `refusal`) need explicit handling.
@1.1

Q: Three anti-patterns for deciding when an agent loop is finished?
A: Parsing the text for "I'm done"-style phrases · stopping as soon as a text block appears · using an iteration cap as the *primary* stop signal (a cap is only a safety net).
@1.1

Q: Where must tool results go after execution?
A: Into the conversation history as `tool_result` blocks (matching `tool_use_id`) in the next user message, so Claude can reason about them in the next iteration.
@1.1

Q: `stop_reason: "max_tokens"` in the middle of an agent run means…?
A: The output was **cut off** — not finished. Raise `max_tokens` or continue; never treat it as completion.
@1.1

Q: What does the coordinator do in a hub-and-spoke system?
A: Decomposes the task, decides which subagents to invoke, passes them context, routes **all** communication, aggregates results, checks coverage and iterates.
@1.2

Q: A research report misses whole sub-topics although every subagent did its job well. Root cause?
A: The **coordinator's decomposition** was too narrow — fix how it splits the question, not the subagents.
@1.2

Q: Why route subagent communication through the coordinator?
A: Observability, consistent error handling, controlled information flow and one place to aggregate and resolve conflicts.
@1.2

Q: What does a subagent inherit from its parent's conversation?
A: **Nothing** by default. Everything it needs (findings, constraints, source metadata, output format) must be in the delegation prompt.
@1.3

Q: How do you run three subagents in parallel?
A: The coordinator emits **several Task/Agent tool calls in a single response**; the SDK runs them concurrently.
@1.3

Q: Which tool must be in the coordinator's `allowedTools` to spawn subagents?
A: The **Task** tool (the Agent tool in newer releases).
@1.3

Q: The three main fields of an `AgentDefinition`?
A: `description` (when to use it) · `prompt` (its system instructions) · `tools` (what it may use).
@1.3

Q: Why should subagents return structured data with metadata?
A: So the coordinator can merge results reliably and keep provenance — source URL, document name, date, confidence — through synthesis.
@1.3

Q: "Identity must be verified before any refund." Prompt instruction or gate?
A: **Programmatic prerequisite gate** — block `process_refund` until `get_customer` has returned a verified ID. Prompts only make compliance likely.
@1.4

Q: What belongs in a handoff summary for a human agent?
A: Customer ID, the issue, what was verified, what was tried and the results, relevant amounts and dates, root cause if known, and the recommended next action.
@1.4

Q: A customer raises three unrelated issues in one message. Pattern?
A: Decompose into separate concerns, investigate each (in parallel where independent) with shared context, then synthesize **one** reply.
@1.4

Q: PreToolUse vs. PostToolUse hook — typical use for each?
A: **PreToolUse**: block or redirect calls that violate policy (refund > $500 → escalate). **PostToolUse**: normalize/enrich results (unify date formats) before the model sees them.
@1.5

Q: When is a hook the right answer instead of a prompt?
A: When the business rule must hold **every time** (compliance, money, safety). Hooks are deterministic; prompts are probabilistic.
@1.5

Q: Prompt chaining vs. dynamic decomposition — when each?
A: **Chaining**: predictable, known steps (review each aspect in order). **Dynamic/adaptive**: open-ended investigation where the next subtasks depend on findings.
@1.6

Q: Reviewing a 40-file PR in one pass gives shallow, inconsistent feedback. Fix?
A: **Per-file local passes** for consistent depth, plus a separate **cross-file integration pass** for data flow and contracts.
@1.6

Q: `fork_session` is for…?
A: Branching from a shared baseline to explore **divergent approaches** (e.g. two refactoring strategies) without contaminating each other.
@1.7

Q: You resume a session but files changed since. Two good options?
A: Tell the resumed session **exactly what changed** so it re-reads them, or **start fresh** with a structured summary of prior findings when old tool results are stale.
@1.7

Q: The primary mechanism Claude uses to choose between tools?
A: The **tool descriptions** — purpose, input formats, examples, edge cases and boundaries versus similar tools.
@2.1

Q: Two tools with near-identical descriptions are confused. Best first fix?
A: Rewrite the descriptions to state **when to use each** (and rename/split if they overlap) — before adding classifiers or few-shot examples.
@2.1

Q: Why split a generic `analyze_document` tool?
A: Purpose-specific tools (`extract_data_points`, `summarize_content`, `verify_claim_against_source`) with defined inputs/outputs are selected and used more reliably.
@2.1

Q: The four error categories for tool failures and whether to retry?
A: **Transient** (retry) · **Validation** (fix input, retry) · **Business** (don't retry — explain/escalate) · **Permission** (don't retry — escalate).
@2.2

Q: Why is returning `[]` for a failed lookup dangerous?
A: The agent treats it as "nothing exists" and acts on it. A failure must be an **error** (`isError: true`) distinct from a valid empty result.
@2.2

Q: What does a good structured tool error contain?
A: `isError`, an error category, `isRetryable`, the attempted operation, partial results if any, and a human-readable message.
@2.2

Q: What happens to tool-selection accuracy with 18 tools on one agent?
A: It degrades. Give each agent the **4–5 tools its role needs**; add a narrow cross-role tool only for frequent needs.
@2.3

Q: `tool_choice` values and their effect?
A: `auto` — may answer in text · `any` — must call **some** tool · `{"type":"tool","name":"x"}` — must call **x** · `none` — no tools.
@2.3

Q: Guarantee that an extraction always returns structured data even when several schemas exist?
A: `tool_choice: {"type": "any"}` — Claude must call one of the extraction tools rather than replying in text.
@2.3

Q: Project-scoped vs. user-scoped MCP configuration?
A: **`.mcp.json`** in the repo — shared, version-controlled team servers. **`~/.claude.json`** — personal or experimental servers.
@2.4

Q: How do you keep an MCP server token out of `.mcp.json`?
A: Environment-variable expansion: `"env": {"GITHUB_TOKEN": "${GITHUB_TOKEN}"}`.
@2.4

Q: MCP tool or MCP resource for exposing a catalog of 300 docs?
A: A **resource** — content the client can read without exploratory tool calls; tools are for actions and queries.
@2.4

Q: Standard integration (GitHub, Jira) — build your own MCP server?
A: Prefer an existing (official/community) server; build custom servers for team-specific workflows.
@2.4

Q: Grep vs. Glob?
A: **Grep** searches file **contents** (callers, strings). **Glob** matches file **paths** (`**/*.test.tsx`).
@2.5

Q: Edit fails because the anchor text appears three times. Options?
A: Add surrounding context to make the anchor unique — or fall back to **Read + Write** of the whole file.
@2.5

Q: Best way to understand an unfamiliar call chain?
A: **Incremental exploration**: Grep for entry points, Read the relevant files, follow imports — not reading the whole codebase up front.
@2.5

Q: User-level vs. project-level CLAUDE.md?
A: **`~/.claude/CLAUDE.md`** — personal, not shared. **`CLAUDE.md` / `.claude/CLAUDE.md`** in the repo — team conventions via version control.
@3.1

Q: A new teammate doesn't get the coding conventions you see. Likely cause?
A: The conventions live in **your user-level** `~/.claude/CLAUDE.md`, not in the project CLAUDE.md.
@3.1

Q: How do you check which memory files are actually loaded?
A: Run **`/memory`**.
@3.1

Q: How do you keep a large CLAUDE.md maintainable?
A: Split into focused files and include them with **`@import`**, or move topics into `.claude/rules/`.
@3.1

Q: Where do team-shared vs. personal slash commands live?
A: Team: **`.claude/commands/`** (or `.claude/skills/`) in the repo. Personal: **`~/.claude/commands/`** (or `~/.claude/skills/`).
@3.2

Q: What does `context: fork` do in SKILL.md?
A: Runs the skill in an **isolated sub-agent context**, so verbose output doesn't fill the main conversation.
@3.2

Q: Skill or CLAUDE.md?
A: **CLAUDE.md** for always-on conventions. **Skill** for on-demand, task-specific workflows.
@3.2

Q: Test conventions must apply to `*.test.tsx` files spread across 40 directories. Mechanism?
A: A **`.claude/rules/` file with `paths:` glob frontmatter** (e.g. `**/*.test.tsx`) — not 40 directory-level CLAUDE.md files.
@3.3

Q: Why do path-scoped rules save context?
A: They load **only** when Claude works on matching files, instead of being in every session.
@3.3

Q: Plan mode or direct execution: migrate logging across 30 services?
A: **Plan mode** — multi-file, architectural, several valid approaches. Direct execution suits small, well-scoped changes.
@3.4

Q: What is the Explore subagent for?
A: Verbose codebase **discovery** in an isolated context, returning a summary — keeps the main context clean.
@3.4

Q: Three iterative-refinement techniques?
A: Concrete **input/output examples** · **test-driven iteration** (failing tests as feedback) · the **interview pattern** (Claude asks you questions first).
@3.5

Q: Several bugs that interact — fix one by one or together?
A: **Together in one message** (interacting issues). Independent issues can be fixed sequentially.
@3.5

Q: Claude Code hangs in a CI job. Missing flag?
A: **`-p` / `--print`** — non-interactive mode.
@3.6

Q: How do you get machine-parseable review findings from CI?
A: `claude -p … --output-format json` plus **`--json-schema`** for a fixed finding structure.
@3.6

Q: Re-running the CI review creates duplicate PR comments. Fix?
A: Pass the **previous findings** into the prompt and ask for new or unresolved issues only.
@3.6

Q: Why use a separate instance to review generated code?
A: The generating session carries its own reasoning and tends to **confirm** it; an independent instance catches more issues.
@4.6

Q: "Be conservative and only report high-confidence issues" didn't reduce false positives. Better?
A: **Explicit criteria**: what to report (e.g. bugs, security), what to skip (style, local patterns), severity definitions with examples.
@4.1

Q: Developers ignore all review comments because of noise. Fast way to restore trust?
A: Temporarily **disable the high-false-positive categories** while improving their criteria.
@4.1

Q: How many few-shot examples, and which ones?
A: Typically **2–4**, targeting **ambiguous** cases, showing the reasoning for the choice — not just easy, obvious ones.
@4.2

Q: Few-shot examples for extraction from varied document layouts help with…?
A: Consistent format, handling of unusual structures, and less hallucination (showing when to return null).
@4.2

Q: Does a JSON schema via tool use eliminate all extraction errors?
A: No — it eliminates **syntax** errors. **Semantic** errors (wrong values, totals that don't add up) still need validation.
@4.3

Q: The model fabricates a `due_date` when none is in the document. Schema fix?
A: Make the field **optional / nullable** so "not present" is a valid answer.
@4.3

Q: Category enum keeps getting forced into wrong values. Pattern?
A: Add **`"other"` + a detail string** (and `"unclear"` where ambiguity is real).
@4.3

Q: What goes into a retry after a validation failure?
A: The original document, the **failed output**, and the **specific validation error** — so the model can correct it.
@4.4

Q: When will retries NOT fix an extraction error?
A: When the information **isn't in the source** (or is in an external document). Route to null/review instead.
@4.4

Q: How can the schema itself expose arithmetic errors on invoices?
A: Add self-correction fields: **`calculated_total`** next to **`stated_total`**, or a `conflict_detected` boolean.
@4.4

Q: Message Batches API — cost, time window, latency guarantee?
A: **50%** cheaper · up to **24 hours** · **no** latency SLA.
@4.5

Q: Pre-merge review (blocking) vs. nightly audit — which uses batches?
A: **Nightly audit** → batch. Pre-merge checks block developers → **synchronous** calls.
@4.5

Q: 1,000-document batch, 40 failed (oversized). Next step?
A: Fix the cause (e.g. chunk the oversized docs) and **resubmit only the failed `custom_id`s**.
@4.5

Q: Before submitting 50,000 documents to a batch you should…?
A: **Refine the prompt on a sample** first, so you don't pay for 50,000 bad results.
@4.5

Q: Why route by confidence self-reports with care?
A: Self-reported confidence is **poorly calibrated** unless validated on labeled data; use it for routing only after calibration.
@4.6

Q: Long support session forgets the refund amount agreed earlier. Fix?
A: Keep a persistent **case-facts block** with exact amounts, dates, IDs and commitments outside the summarized history.
@5.1

Q: What is "lost in the middle" and the mitigation?
A: Models attend less to the middle of long inputs → put **key findings first**, use clear section headers.
@5.1

Q: Order-lookup returns 40 fields; the task needs 5. What to do?
A: **Trim** tool output to the relevant fields before it accumulates in context.
@5.1

Q: Customer says "I want to talk to a human." Agent action?
A: **Escalate immediately** — don't attempt to resolve first.
@5.2

Q: Why not escalate based on sentiment analysis?
A: Sentiment doesn't measure **case complexity or policy fit**; angry customers with simple issues and calm ones with policy exceptions get misrouted.
@5.2

Q: Lookup returns two customers named "J. Smith". Agent action?
A: **Ask for an identifier** (email, order number) — never pick one heuristically.
@5.2

Q: Valid escalation triggers?
A: Explicit customer request · **policy gap** or exception not covered · the agent **can't make progress** · actions above an authority threshold.
@5.2

Q: Subagent search times out. What should it return to the coordinator?
A: Structured error context: **failure type, attempted query, partial results, possible alternatives** — so the coordinator can decide.
@5.3

Q: Two error-propagation anti-patterns?
A: **Silently suppressing** errors (returning empty as success) and **terminating the whole workflow** because one subagent failed.
@5.3

Q: Final report when one source failed?
A: Publish what is supported, with a **coverage annotation** naming the gap.
@5.3

Q: Symptom of context degradation in a long exploration session?
A: Claude refers to "typical patterns" instead of the specific classes it read earlier; answers grow inconsistent.
@5.4

Q: Four techniques for large-codebase exploration?
A: **Scratchpad files** of findings · **subagents** for verbose searches · **summarize** before each new phase · **/compact** deliberately (and crash-recovery manifests for long tasks).
@5.4

Q: 97% overall extraction accuracy — enough to drop human review?
A: Not yet. Check accuracy **per document type and per field**; aggregates hide weak segments.
@5.5

Q: How should automated results be sampled for review?
A: **Stratified random sampling** across document types and confidence bands.
@5.5

Q: How do you set confidence thresholds for auto-approval?
A: Calibrate **field-level** confidence on a **labeled validation set**.
@5.5

Q: Two sources report different market sizes. What should the synthesis do?
A: Keep **both values with attribution** (and dates/methodology) — don't silently pick one.
@5.6

Q: How does provenance survive multi-agent summarization?
A: Subagents return **claim–source mappings** (source, excerpt, date) that the synthesis agent preserves.
@5.6

Q: Why record publication / collection dates?
A: So apparent contradictions explained by **time** (2022 vs. 2025 data) aren't misread as conflicts.
@5.6
