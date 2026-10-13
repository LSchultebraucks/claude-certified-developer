---
skill: 2.1
title: Understanding Requirements
summary: Turn business goals into functional and infrastructure requirements for a Claude solution — success criteria, latency, throughput, data residency, retention, platform and integration constraints.
sources: Define success criteria — Anthropic | https://platform.claude.com/docs/en/test-and-evaluate/define-success; Rate limits | https://platform.claude.com/docs/en/api/rate-limits; Data residency (inference_geo) | https://platform.claude.com/docs/en/build-with-claude/data-residency; Claude on Amazon Bedrock | https://platform.claude.com/docs/en/build-with-claude/claude-on-amazon-bedrock; Claude on Vertex AI | https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai
---

## What you need to know

Before writing a prompt you need to know **what "good" means** and **what the system must live with**. The exam frames this as translating *business requirements* and a *solution architecture* into:

- **Functional requirements** — what the system must do: inputs, outputs, behaviors, accuracy.
- **Infrastructure (non-functional) requirements** — how well and under what constraints: latency, throughput, availability, security, compliance, data residency, cost, integration and operability.

Questions typically describe a business situation and ask which requirement, design decision or platform choice follows from it.

## Functional requirements for LLM features

Write them so they are **testable**. "The bot should be helpful" is not a requirement; these are:

| Dimension | Example of a measurable requirement |
|---|---|
| Task & scope | "Classify inbound emails into 7 categories; anything else → `other`." |
| Inputs | "Accept PDF and PNG up to 20 pages; English and German." |
| Output contract | "Return JSON matching schema v3; `confidence` in {low, medium, high}." |
| Quality / accuracy | "≥ 95% category accuracy on the 500-email golden set; < 1% PII leakage." |
| Behavior boundaries | "Never give legal advice; escalate refund requests > €500 to a human." |
| Tone / style | "Formal *Sie*-form German; max 120 words per reply." |
| Edge cases | "If the attachment is unreadable, ask for a new upload rather than guessing." |

:::key Success criteria come first
Anthropic's guidance is to define **specific, measurable, achievable, relevant** success criteria *before* prompt engineering, then build evals (test cases) that measure them. Criteria are usually multidimensional: task fidelity, consistency, relevance, tone, privacy preservation, context utilization, latency and price. Without them you cannot tell whether a prompt change or a model change helped.
:::

## Infrastructure / non-functional requirements

| Requirement | Questions to ask | Design consequences |
|---|---|---|
| **Latency** | Interactive (chat, autocomplete) or background? Time-to-first-token vs. total time? | Streaming for perceived latency; smaller/faster model (Haiku) or lower effort; prompt caching to cut TTFT; fast mode for premium speed on supported Opus models |
| **Throughput / volume** | Requests per minute, tokens per minute, peak bursts? | Rate limits (RPM, ITPM, OTPM) per org/workspace & model; queueing, backoff; Message Batches API for bulk; Priority Tier where available |
| **Real-time vs. deferred** | Can results wait minutes/hours? | Message Batches API: 50% cheaper, most finish < 1 h, max 24 h |
| **Context size** | How big are inputs (documents, codebases, conversation length)? | 1M-token windows on current models; RAG/retrieval; chunking; compaction for long sessions |
| **Modality** | Images, PDFs, scanned docs, audio? | Vision/PDF support; OCR pre-processing; Files API for reuse |
| **Data residency** | Must processing stay in a region (EU, US)? | `inference_geo` parameter on the Claude API; regional endpoints on Bedrock / Vertex AI / Foundry |
| **Data retention & privacy** | May the provider retain prompts? ZDR needed? PII? | Zero-data-retention arrangements (note: some models require 30-day retention); PII redaction; minimize data sent |
| **Security & identity** | Who may use it? Which data may each user see? | Authenticate users in *your* app, authorize data access server-side, least-privilege tools, secrets in a vault |
| **Availability / reliability** | SLA? What if the API is overloaded (429/529)? | Retries with backoff, timeouts, fallback model, graceful degradation, multi-region/platform |
| **Cost** | Budget per request / per month? | Model tier, caching, batching, effort, max_tokens, routing |
| **Integration** | Existing cloud, identity provider, procurement, observability stack? | Choose Claude API vs. Bedrock vs. Vertex AI vs. Foundry; MCP servers for internal systems |
| **Compliance** | HIPAA, GDPR, SOC 2, sector rules, audit trails? | BAAs/contracts, logging and audit, human review steps, data minimization |
| **Operability** | Monitoring, evals in CI, rollback? | Log request IDs and usage, version prompts, pin model versions |

## Choosing where to call Claude

Claude is available on several platforms. The model is the same family; the operational envelope differs.

| Platform | Why choose it | Watch out for |
|---|---|---|
| **Claude API** (Anthropic, incl. Claude Platform on AWS) | Newest features first (betas, Managed Agents, Files API, MCP connector, batches, fast mode), Console tooling | Separate vendor relationship/billing |
| **Amazon Bedrock** | Existing AWS account, IAM, VPC/PrivateLink, AWS billing & governance | Model IDs prefixed (e.g. `anthropic.`), some features arrive later or not at all |
| **Google Vertex AI** | Existing GCP, IAM/ADC auth, GCP regions, GCP billing | Different auth (no Anthropic key), feature availability differs (e.g. some server tools) |
| **Microsoft Foundry** | Azure-centric organizations, Entra ID | Feature availability differs |

:::tip Requirement → platform reasoning
"Our security team only approves services inside our AWS account with IAM-based access and VPC endpoints" → Amazon Bedrock. "We need a beta feature released last week" → Claude API first. Always verify feature availability per platform before committing.
:::

## Translating business requirements: worked example

> *"Support agents spend 40% of their time writing first replies. We want Claude to draft replies inside our helpdesk. Drafts must be in the customer's language, never promise refunds, and appear within 3 seconds. 30,000 tickets per day; customer data must stay in the EU."*

| Business statement | Requirement | Design implication |
|---|---|---|
| "draft replies inside our helpdesk" | Functional: generate reply drafts from ticket thread + KB | Integration via helpdesk API/webhook; human sends (human-in-the-loop) |
| "in the customer's language" | Functional: detect language, reply in it | Prompt instruction + eval set with multilingual tickets |
| "never promise refunds" | Functional/policy constraint | Prompt rule **plus** output check (classifier or regex) before showing the draft |
| "within 3 seconds" | Latency: TTFT < 1 s, full draft < 3 s | Streaming, faster model tier, prompt caching for the static KB/system prompt |
| "30,000 tickets per day" | Throughput ≈ 21/min average, peaks higher | Check rate limits for model and workspace; backoff and queueing |
| "data must stay in the EU" | Data residency | `inference_geo` / EU region on chosen platform; review retention terms |
| "save agent time" | Success metric | Track edit distance between draft and sent reply; time per ticket |

## Requirements that change the model and API choices

- **Hard determinism** ("same input must always give the same output") → LLMs are not fully deterministic even with fixed settings; cache results, use structured outputs, and put deterministic logic in code.
- **Explainability / citations** ("answers must cite the source paragraph") → Citations feature on document blocks, or RAG with source IDs in the output schema.
- **Structured integration** ("output feeds another system") → JSON schema via structured outputs / strict tools; versioned contracts.
- **Long-running, multi-step automation** → agent architecture, sandboxing, approvals (Domain 1).
- **Offline, high volume, not time-critical** → Message Batches API.

## Exam traps

:::trap Jumping to the prompt before defining success
If a scenario says the team "keeps tweaking prompts but can't tell if it's better", the answer is to define measurable success criteria and build an eval set — not another prompt technique.
:::

:::trap Treating latency as only "use a faster model"
Streaming improves *perceived* latency (time to first token), prompt caching reduces processing time for long static prefixes, and smaller outputs finish faster. Read whether the requirement is about first token or total time.
:::

:::trap Ignoring rate limits in throughput requirements
High volume requirements must be checked against RPM / input-tokens-per-minute / output-tokens-per-minute limits; the fixes are batching, queueing with backoff, caching (cache reads don't count toward input-token limits on most models), or a higher tier.
:::

:::trap Assuming feature parity across platforms
Bedrock, Vertex AI and Foundry serve Claude models but don't expose every Claude API feature at the same time. Requirements that depend on a specific feature must be verified per platform.
:::

## Practice questions

{{quiz:d2-req-01}}

{{quiz:d2-req-02}}

## Build exercise

:::exercise Write a requirements sheet and eval plan
1. Pick a realistic feature (e.g., "summarize sales calls into CRM fields").
2. Write 6–10 functional requirements in testable form (inputs, output schema, accuracy target, boundaries, edge cases).
3. Write the infrastructure requirements table: latency (TTFT and total), volume (RPM/TPM peaks), residency, retention, availability, cost per 1,000 requests.
4. Map each requirement to a design decision (model tier, streaming, batch vs. realtime, caching, platform, guardrails).
5. Create a 30-item golden dataset (inputs + expected outputs) that measures the top three success criteria.
6. Estimate monthly cost from expected token counts and the model's price per million tokens; compare realtime vs. batch.
:::
