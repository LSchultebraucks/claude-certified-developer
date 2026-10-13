---
skill: 7.2
title: Guardrails and Safe Deployment
summary: Content policy, layered guardrails (input screening, system prompt, tool permissions, output checks, human review, monitoring), and secure-by-design principles — privacy, identity and access management, least privilege — for shipping Claude applications responsibly.
sources: Anthropic Usage Policy | https://www.anthropic.com/legal/aup; Strengthen guardrails | https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations; Content moderation guide | https://platform.claude.com/docs/en/about-claude/use-case-guides/content-moderation; Claude Code sandboxing | https://code.claude.com/docs/en/sandboxing; Claude Code security | https://code.claude.com/docs/en/security
---

## What you need to know

"Safe deployment" questions ask which combination of controls makes an application acceptably safe, or what's missing from a design. The answer is almost always **defense in depth** built on **secure-by-design** principles — no single guardrail is sufficient.

## Content policy

- Every Claude application must comply with **Anthropic's Usage Policy** (prohibited uses, high-risk use-case requirements such as human oversight and disclosure in certain domains, e.g., legal, medical, financial advice to consumers).
- You also define **your own content policy**: what your app may discuss, tone, prohibited topics, escalation rules, brand constraints.
- Claude has built-in safety behavior; on current models, **safety classifiers can decline requests** (`stop_reason: "refusal"`), which your app must handle gracefully (fallback message, human route, or a server-side fallback configuration where offered).
- Disclose AI involvement where required; keep humans accountable for consequential decisions.

## Guardrail layering

```text
┌─ Before the model ───────────────────────────────────────────────┐
│ authN/authZ · rate limits & quotas · input validation & size caps │
│ PII redaction · harmful-content / injection pre-screen (e.g. Haiku)│
├─ In the model call ──────────────────────────────────────────────┤
│ system prompt: role, scope, refusal behavior, data/instruction    │
│ boundaries · structured outputs · minimal, least-privilege tools │
├─ Around actions ─────────────────────────────────────────────────┤
│ permission rules · hooks (deterministic allow/deny) · sandbox     │
│ human-in-the-loop approval for irreversible / high-impact actions │
├─ After the model ────────────────────────────────────────────────┤
│ output validation (schema + business rules) · policy/PII checks  │
│ grounding/citation checks · output encoding before rendering      │
├─ Around the system ──────────────────────────────────────────────┤
│ logging & audit · monitoring & alerts · red-teaming · evals in CI │
│ staged rollout · kill switch / feature flag · incident response   │
└──────────────────────────────────────────────────────────────────┘
```

Key ideas:
- **Probabilistic vs. deterministic controls**: prompts and classifiers reduce risk statistically; permissions, hooks, sandboxes, schemas and code checks enforce it. Critical rules need at least one deterministic layer.
- **Screening with a small model**: a fast, cheap model can classify inputs/outputs ("Is this request within scope / harmful / an injection attempt? Answer Y/N with reason") before or after the main call.
- **Human-in-the-loop** is a guardrail: approval gates for sending, paying, deleting, deploying, or for low-confidence cases.
- **Fail safe**: on guardrail errors or timeouts, default to the safer behavior (block or escalate), not to "allow".

## Secure-by-design principles

**Secure by design** means security properties are built into the architecture from the start (privacy, identity and access management, least privilege), not added after launch.

| Principle | Application to Claude systems |
|---|---|
| **Least privilege** | Agents get the minimum tools, scopes, file paths, network access and credentials; read-only by default; per-user scoped tokens; Claude Code `deny` rules and sandboxing |
| **Identity and access management (IAM)** | Strong user authentication; RBAC for features and data; separate service identities per environment; workload identity / IAM roles instead of long-lived keys; access reviews |
| **Privacy by design** | Data minimization, PII redaction, retention limits, residency, consent, transparent data use |
| **Defense in depth** | Multiple independent layers (above) |
| **Secure defaults** | New tools disabled until approved; destructive operations require confirmation; sandbox on |
| **Separation of duties** | The agent that writes code isn't the only reviewer; humans approve production deploys |
| **Auditability** | Log who did what, via which tool, with which inputs (minus secrets), and keep request IDs |
| **Isolation** | Run agents in containers/VMs, separate dev/stage/prod, per-tenant data isolation |

### Sandboxing agents

- Run code-executing agents in **containers or VMs** with restricted filesystem and **network allowlists**.
- **Claude Code sandboxing** provides OS-level filesystem and network isolation for Bash commands; `bypassPermissions` should only be used inside such isolated environments.
- Managed Agents run tools in per-session containers; credentials can stay in vaults outside the sandbox.

## Safe deployment process

1. **Threat model** the application (assets, actors, injection paths, abuse cases).
2. **Red-team** before launch: jailbreaks, injections, data exfiltration, cost abuse, harmful content.
3. **Evals** for safety cases in CI (refusal where appropriate, no PII leakage, policy compliance) alongside quality evals.
4. **Staged rollout** (internal → beta → % canary → GA) with monitoring and a **kill switch**.
5. **Monitor** abuse signals, refusal rates, guardrail triggers, cost anomalies; review samples.
6. **Incident response**: revoke keys, disable features via flags, notify, fix, add regression tests.

## Exam traps

:::trap A single guardrail as the solution
"Add a moderation model" or "write a strict system prompt" alone is incomplete. Look for the answer that layers controls, with a deterministic layer for critical actions.
:::

:::trap Granting broad permissions for convenience
An agent with admin database credentials "to avoid permission errors" violates least privilege. Scope credentials to the task and user.
:::

:::trap Failing open
If the safety classifier times out, defaulting to "allow" defeats it. Fail closed for high-risk paths.
:::

## Practice questions

{{quiz:d7-grd-01}}

{{quiz:d7-grd-02}}

## Build exercise

:::exercise Layer the guardrails
1. Take your support agent and write a one-page threat model (assets, attackers, entry points, worst-case actions).
2. Add an input pre-screen with a fast model that returns `{in_scope, harmful, injection_suspected}` via structured outputs; block or route accordingly (fail closed on errors).
3. Restrict tools: read-only order lookup scoped to the authenticated customer; refunds require human approval.
4. Add an output check for refund promises and PII; block or rewrite.
5. Put the whole thing behind a feature flag with per-user rate limits; add dashboards for guardrail triggers and refusals.
6. Run a red-team session with 20 adversarial prompts; turn every success into a regression eval.
:::
