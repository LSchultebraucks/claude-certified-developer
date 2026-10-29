---
skill: 3.6
title: CI/CD Integration
summary: Running Claude Code non-interactively with -p, machine-parseable output with --output-format json and --json-schema, CLAUDE.md as CI context, independent review instances and avoiding duplicate comments.
sources: Claude Code headless / programmatic usage | https://code.claude.com/docs/en/headless; CLI reference | https://code.claude.com/docs/en/cli-reference; Claude Code GitHub Actions | https://code.claude.com/docs/en/github-actions; Claude Code best practices | https://www.anthropic.com/engineering/claude-code-best-practices
---

## What you need to know

In a pipeline there is no human at the keyboard. Claude Code must run **non-interactively**, produce **parseable** output, and work from the **same project context** developers use.

:::key The three CI essentials
1. **`-p` / `--print`** — run one prompt non-interactively and exit. Without it, the job waits for input and hangs.
2. **`--output-format json`** (optionally **`--json-schema`**) — structured output your pipeline can parse into inline PR comments, status checks or tickets.
3. **CLAUDE.md** in the repo — gives CI runs the testing standards, fixture conventions and review criteria.
:::

```yaml GitHub Actions — review step
- name: Claude review
  run: |
    claude -p "Review this PR's diff (git diff origin/main...HEAD). Report only
    bugs and security issues per CLAUDE.md 'Review criteria'. Previous findings:
    $(cat .review/previous.json)" \
      --output-format json --json-schema "$(cat .github/review-schema.json)" \
      --allowedTools "Read,Grep,Glob,Bash(git diff:*)" > review.json
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

Anthropic also provides a ready-made **Claude Code GitHub Action** (`anthropics/claude-code-action`) that wires this up for `@claude` mentions and PR reviews.

## Context for CI

CI runs start with **no conversation history**. Everything the reviewer or test generator must know goes into the repo's CLAUDE.md (or rules/skills): test framework and fixtures, what counts as a blocking issue, existing test files to avoid duplicating. When generated tests duplicate existing ones, the fix is **context** — list existing tests and conventions — not a bigger model.

## Independent review

A Claude session that **generated** code is a weak reviewer of that code: it carries its own reasoning and tends to confirm it. In CI, run review as a **separate invocation** that sees the diff and the criteria, not the generator's reasoning (see 4.6).

## Avoiding duplicate comments

Re-running review on each push re-reports the same issues. Pass **prior findings** into the prompt and ask for **new or still-unresolved** issues only; key findings by file + line + rule so the pipeline can de-duplicate.

## Synchronous vs. batch in CI

Pre-merge checks **block developers** → synchronous calls. Nightly audits or weekly technical-debt reports **don't block anyone** → the **Message Batches API** (50% cheaper, up to 24 h) is appropriate (4.5).

## Exam traps

:::trap Missing `-p`
The job hangs waiting for interactive input.
:::

:::trap Parsing free-text output with regex
Use `--output-format json` / `--json-schema`.
:::

:::trap The generating session reviews its own work
Use an independent instance.
:::

:::trap Batch API for a blocking pre-merge check
No latency guarantee — developers could wait hours.
:::

## Practice questions

{{quiz:a3-ci-01}}

{{quiz:a3-ci-02}}

## Build exercise

:::exercise CI review job
1. Write a JSON schema for findings: `file`, `line`, `severity`, `category`, `message`, `suggestion`.
2. Run `claude -p … --output-format json --json-schema …` locally on a diff; validate the output.
3. Add the step to a workflow with `ANTHROPIC_API_KEY` from secrets and restricted `--allowedTools`.
4. Store findings as an artifact and feed them into the next run; verify no duplicates are posted.
5. Move review criteria into CLAUDE.md and confirm the CI run follows them.
:::
