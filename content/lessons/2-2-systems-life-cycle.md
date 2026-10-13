---
skill: 2.2
title: Systems Life Cycle
summary: SDLC phases and methodologies, and how they change for LLM systems — eval-driven development, staged rollouts, monitoring, model deprecations and migrations.
sources: Model deprecations | https://platform.claude.com/docs/en/about-claude/model-deprecations; Develop tests / evals | https://platform.claude.com/docs/en/test-and-evaluate/develop-tests; Models overview | https://platform.claude.com/docs/en/about-claude/models/overview; Migrating to newer models | https://platform.claude.com/docs/en/about-claude/models/migrating-to-claude-4
---

## What you need to know

Systems life cycle management covers how an IT system is **planned, built, deployed, operated and maintained until retirement**. The exam expects foundation-level knowledge of classic SDLC concepts *and* the LLM-specific twists: models are external dependencies that change and retire, behavior is probabilistic, and quality must be measured continuously with evals.

## Classic SDLC phases

| Phase | Key activities | LLM-specific additions |
|---|---|---|
| **1. Planning / requirements** | Business case, scope, requirements, feasibility, risks | Success criteria, eval dataset, data/privacy review, model & platform candidates |
| **2. Analysis & design** | Architecture, interfaces, data model, security design | Workflow vs. agent, prompt/tool design, guardrails, context strategy, cost model |
| **3. Implementation** | Code, unit tests, code review | Prompts and tool schemas as versioned code; mocks for the API in unit tests |
| **4. Testing / verification** | Integration, system, acceptance, performance, security tests | **Evals** (golden sets, graders), red-teaming / prompt-injection tests, regression evals |
| **5. Deployment / release** | Release management, change approval, rollout | Pinned model versions, feature flags, shadow/canary/A-B rollout |
| **6. Operations & monitoring** | Incident management, SLAs, capacity, logging | Token usage & cost, latency, error rates (429/529), refusals, quality sampling, drift |
| **7. Maintenance & evolution** | Bug fixes, enhancements, dependency upgrades | Prompt iterations, **model migrations**, SDK upgrades, deprecation handling |
| **8. Retirement / decommissioning** | Data archival/deletion, shutdown | Revoke API keys, delete stored conversations per retention policy |

## Methodologies

| Model | Characteristics | Fits when |
|---|---|---|
| **Waterfall** | Sequential phases, heavy upfront requirements, formal sign-offs | Stable, well-understood requirements; strict regulatory documentation |
| **V-Model** | Each development phase paired with a test phase (requirements ↔ acceptance test, design ↔ integration test) | Safety-critical / regulated systems needing traceability |
| **Iterative / incremental** | Build in increments, refine each cycle | Requirements expected to evolve |
| **Agile (Scrum, Kanban)** | Short iterations (sprints), working software, backlog, continuous feedback | Most product development; LLM features benefit from fast iteration |
| **DevOps / continuous delivery** | Automate build-test-deploy, infrastructure as code, monitoring feedback loop, shared ownership | Frequent releases; pairs well with eval gates in CI |
| **MLOps / LLMOps** | DevOps + data/model lifecycle: dataset versioning, eval pipelines, model registry, monitoring for drift | AI systems where model and prompt changes are frequent |

:::key LLM systems are iterated, not specified once
Prompt and context engineering is empirical: you hypothesize, change a prompt or tool, run the eval, and compare. That makes **iterative/agile delivery with automated eval gates** the natural fit. Waterfall-style "specify the prompt once and freeze it" fails because model behavior must be measured, not assumed.
:::

## Eval-driven development

The LLM equivalent of test-driven development:

1. Define success criteria (lesson 2.1).
2. Build an **eval set**: representative inputs, edge cases and adversarial cases with expected outputs or grading rubrics. Anthropic recommends many automatically graded cases over a few hand-graded ones.
3. Choose graders: **code-based** (exact match, JSON schema validation, regex, unit tests — fastest, most reliable), **LLM-based** (rubric grading by a model — flexible, validate it against humans), **human** (most nuanced, slowest).
4. Establish a **baseline** score for the current prompt + model.
5. Change one thing at a time; re-run; keep changes that improve the target metric without regressing others.
6. Run evals in **CI** on every prompt, tool or model change — a regression gate like unit tests.

## Release strategies for LLM changes

| Strategy | How | Use for |
|---|---|---|
| **Offline eval** | Run the eval suite against the change | Every change, before anything else |
| **Shadow deployment** | New version receives a copy of live traffic; outputs logged, not shown to users | Model migrations, risky prompt rewrites |
| **Canary release** | Route a small % of real traffic to the new version, watch metrics, expand gradually | Production rollout with fast rollback |
| **A/B test** | Split users between variants and compare business metrics | Measuring user impact (resolution rate, CSAT) |
| **Feature flags** | Toggle versions at runtime without redeploying | Instant rollback, per-tenant rollout |
| **Blue/green** | Two full environments, switch traffic at once | Infrastructure changes with instant switchback |

Always keep **rollback** cheap: previous prompt version and previous pinned model ID should be one config change away.

## Operating a Claude application

Monitor at least:
- **Usage and cost**: input, output, cache-write and cache-read tokens per request (`usage`), per feature, per tenant.
- **Latency**: time to first token and total time; p50/p95/p99.
- **Errors**: rate of 429 (rate limit), 529 (overloaded), 5xx, timeouts, 400s after deploys.
- **Stop reasons**: unexpected `max_tokens` (truncation), `refusal`, `pause_turn` handling.
- **Quality**: sampled human review, automated graders on production samples, user feedback, escalation rates.
- **Safety**: injection attempts, policy violations, PII in outputs.
- **Request IDs**: log the `request-id` header / `request_id` for support and debugging.

## Model lifecycle: versions, deprecation, retirement

Claude models have a lifecycle you must plan for:

- **Active** → **Legacy** → **Deprecated** (a retirement date is announced, typically with advance notice; still usable) → **Retired** (requests fail).
- Anthropic publishes deprecations and recommended replacements; plan migrations **before** the retirement date.
- New model generations can change behavior in ways that break code or prompts: removed parameters, new stop reasons, tokenizer changes (different token counts and costs), stricter or more literal instruction following, changed defaults.

:::remember Safe model migration checklist
1. Read the migration guide / release notes for breaking API changes.
2. Pin the new model ID in a branch; update request parameters (e.g., removed sampling params, thinking config).
3. Run the full eval suite; compare quality, latency, token counts and cost against the baseline.
4. Re-tune prompts (newer models often follow instructions more literally; remove over-emphatic wording).
5. Shadow or canary in production; monitor stop reasons, refusals and error rates.
6. Switch over with a feature flag; keep the old model ID ready for rollback until the retirement date.
:::

## Change and configuration management

- Treat **prompts, tool schemas, system prompts, CLAUDE.md and settings** as code: version control, code review, changelog.
- Record which **prompt version + model ID + parameters** produced each output (traceability).
- Use separate **environments** (dev / staging / prod) with separate API keys and workspaces.
- Document decisions (architecture decision records) — especially why a model or pattern was chosen.

## Exam traps

:::trap "Wait until the model retires, then switch"
Deprecation notices exist so you can migrate deliberately. The right answer evaluates the replacement early, on a branch, with evals and a staged rollout.
:::

:::trap Deploying a model upgrade without re-running evals
"The new model is better on benchmarks" does not mean it is better on *your* task or that your parsing still works. Always run your own eval suite and compare token usage and cost.
:::

:::trap Choosing waterfall for an LLM feature with uncertain behavior
When requirements or achievable quality are uncertain, iterative delivery with measurement is more appropriate than freezing a specification upfront.
:::

## Practice questions

{{quiz:d2-slc-01}}

{{quiz:d2-slc-02}}

## Build exercise

:::exercise Put an LLM feature through a mini life cycle
1. Take the feature from exercise 2.1 and create a git repository with `prompts/`, `evals/`, `src/`.
2. Write an eval runner that loads `evals/golden.jsonl`, calls Claude, grades with code (schema validation + exact match on key fields) and prints a score.
3. Add a CI workflow (GitHub Actions) that runs the eval on every pull request and fails if the score drops more than 2 points below `baseline.json`.
4. Add a feature flag `MODEL_ID` and `PROMPT_VERSION` in configuration; log both with every request together with `usage` and the request ID.
5. Simulate a model migration: switch to another model ID on a branch, run evals, compare score/cost/latency, and write a short go/no-go note.
:::
