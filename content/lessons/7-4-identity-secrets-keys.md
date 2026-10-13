---
skill: 7.4
title: Identity, Secrets, and Key Management
summary: Manage API keys and credentials across development and production, validate identities, approve and verify access levels, and monitor authorized access — for your app, its agents, Claude Code and MCP servers.
sources: API keys & workspaces (Console) | https://platform.claude.com/docs/en/build-with-claude/workspaces; Admin API | https://platform.claude.com/docs/en/build-with-claude/administration-api; Usage and Cost API | https://platform.claude.com/docs/en/build-with-claude/usage-cost-api; Claude Code IAM & authentication | https://code.claude.com/docs/en/iam; MCP authorization | https://modelcontextprotocol.io/specification/latest/basic/authorization
---

## What you need to know

Questions focus on **where secrets live**, **who/what is allowed to use them**, **how to limit blast radius**, and **how to notice misuse**. The default correct answer keeps secrets out of code, prompts and clients; scopes credentials narrowly; separates environments; and monitors usage.

## Secrets: where they may and may not live

| ✓ Acceptable | ✗ Never |
|---|---|
| Environment variables injected at runtime | Source code, committed config files |
| Secret managers (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault) | System prompts, CLAUDE.md, skills, tool descriptions |
| CI/CD secret stores (GitHub Actions secrets, OIDC to cloud) | Browser/mobile client code, localStorage |
| Claude Code `apiKeyHelper` (script fetching a short-lived credential) | Logs, error messages, analytics events |
| Vault-injected credentials for hosted agents (substituted at egress, never visible in the sandbox) | Agent memory files, transcripts |
| OS keychain for local developer credentials | Plain `.env` files committed to git |

Additional practices:
- `.gitignore` for `.env*`; **secret scanning** in CI and pre-commit; Claude Code `Read` deny rules for secret files.
- **Rotate** keys regularly and **immediately on suspected exposure**; revocation first, cleanup second.
- **Short-lived credentials** beat long-lived keys: workload identity federation (exchange your platform's OIDC identity token for a short-lived Claude API token), IAM roles on Bedrock/Vertex, OAuth tokens for MCP.

## Keys across development and production

- **Separate API keys (and ideally workspaces) per environment and per application**: dev, staging, prod; one key per service rather than a shared key.
- **Workspaces** in the Claude Console group keys, set **per-workspace rate limits and spend limits**, and isolate resources (e.g., Files, caches). Use them to contain blast radius and attribute cost.
- **Admin API keys** (org management: members, workspaces, keys, usage reports) are separate from regular API keys — keep them in the most restricted store and never in application runtime.
- On **Bedrock/Vertex/Foundry**, use the cloud's IAM (roles, service accounts, managed identities) instead of Anthropic API keys.
- **Claude Code** in organizations: SSO/managed login, `apiKeyHelper` for rotating credentials, provider credentials for Bedrock/Vertex, managed settings to enforce login method and organization.

## Identity validation and authentication

- **End users** authenticate to your application (OIDC/SAML SSO, MFA). Your backend maps the session to a **user identity** and **tenant**.
- **Agents act on behalf of a user** with **that user's delegated, scoped credentials** (e.g., OAuth tokens for Google Drive/GitHub), not with a shared superuser account. This keeps authorization aligned with the user's real permissions.
- **Service-to-service**: each service or agent has its own identity (service account / workload identity) — never reuse a human's credentials for automation.
- **Remote MCP servers** use **OAuth** (authorization server, scoped access tokens, token audience validation). Local stdio servers inherit the local user's environment — supply credentials via environment variables, not hard-coded.
- **Identity verification in conversations**: before an agent performs account-level actions for a caller (refund, address change), verify identity through your system (authenticated session, OTP), never because the model "believes" the user.

## Access approval and level verification

- **RBAC / least privilege**: define roles (viewer, agent operator, admin) with explicit capabilities; Console organization and workspace roles control who can create keys, view usage or manage members.
- **Approval workflows**: granting production access or new tool capabilities requires approval (ticket, peer review, just-in-time elevation with expiry).
- **Level verification at action time**: before a sensitive tool executes, check *in code* that the current user's role permits it (e.g., only `finance_admin` may trigger payouts) — and require **step-up** confirmation for high-risk actions.
- **Periodic access reviews**: remove stale users, keys and integrations; expire unused keys.

## Authorized access monitoring

- **Usage monitoring per key/workspace**: Console dashboards and the **Usage & Cost Admin API** — spot spikes, unexpected models, off-hours usage.
- **Audit logs**: who created/rotated/revoked keys, membership changes; application-side logs of tool calls with user identity, inputs (redacted) and outcomes.
- **Alerts** on anomalies (cost spikes, 401/403 bursts, new IP ranges), and **spend limits** as a circuit breaker.
- **Incident response**: revoke → rotate → assess logs for misuse → notify → post-mortem and controls (e.g., secret scanning).

## Exam traps

:::trap Shipping the API key in a mobile or browser app
Anyone can extract it. Proxy through your backend, which authenticates users and holds the key.
:::

:::trap One shared API key for every environment and service
A leak or runaway job affects everything and costs can't be attributed. Separate keys/workspaces with their own limits.
:::

:::trap Agents using an admin service account "to avoid permission issues"
That gives every user (and every prompt injection) admin power. Delegate the user's own scoped credentials.
:::

:::trap Rewriting git history instead of revoking a leaked key
Revoke and rotate first — the key must be considered compromised the moment it was exposed.
:::

## Practice questions

{{quiz:d7-id-01}}

{{quiz:d7-id-02}}

## Build exercise

:::exercise Harden credentials end to end
1. Create separate Console workspaces (or at least separate keys) for dev and prod; set a monthly spend limit on dev.
2. Move the app's key into a secret manager; load it at runtime; remove it from every file and verify with a secret scanner.
3. Configure Claude Code with `apiKeyHelper` that fetches a key from your secret manager, plus `Read` deny rules for `.env*`.
4. Implement OAuth-delegated access for one tool (e.g., GitHub) so the agent acts with the user's token and scopes.
5. Add an action-level role check for one sensitive tool and an audit log entry per call.
6. Write a key-leak runbook (revoke, rotate, check usage logs, notify) and do a dry run.
:::
