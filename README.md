# Claude Certification Study Guides — Developer (CCDV-F) & Architect (CCA-F)

Two offline-capable prep tracks that share one app (switch tracks in the header):

| Track | Open | Content |
|---|---|---|
| **Claude Certified Developer – Foundations (CCDV-F)** | `index.html` | 25 lessons · 365 questions · 53-item mocks |
| **Claude Certified Architect – Foundations (CCA-F)** | `architect/index.html` | 30 lessons · 241 scenario-based questions · 60-item mocks drawing 4 of 6 scenarios |

## Developer track

A complete, offline-capable prep track for Anthropic's **Claude Certified Developer – Foundations (CCDV-F)** exam, built on the official Exam Guide v1.0 (effective July 2026): 53 items, 120 minutes, pass at 720/1,000, 8 domains and 25 individually weighted skills.

> Independent study resource. Not affiliated with or endorsed by Anthropic. Practice questions are original and illustrative (plus the three official sample questions); they are not drawn from the live item bank.

## What's inside

| Area | Contents |
|---|---|
| **Curriculum** | 25 lessons — one per weighted skill — each with "what you need to know", key concepts, code examples, exam traps, embedded practice questions, sources, and a hands-on build exercise |
| **Study Tools** | Progress dashboard (readiness estimate weighted by the blueprint, weakest skills, score trend, export/import), weighted study plans (3-week and 10-day), drill mode (by domain/skill, unseen, missed, adaptive), flashcards with spaced repetition (Leitner) |
| **Practice** | Diagnostic (24 q / 45 min), full mock exam (53 q / 120 min) and quick mock (27 q / 60 min) — questions drawn in proportion to the 25 skill weights, shuffled options, multiple-response items, flagging, timer, scaled score, per-domain report and full review |
| **Look Up** | Quick-reference cheat sheets, glossary (177 terms), exam guide summary, full-text search |

Question bank: 365 items (original questions plus the three official sample questions), sized by skill weight, with explanations for every answer and option lengths balanced so the correct answer can't be guessed from length.

## Architect track

Prep for **Claude Certified Architect – Foundations (CCA-F)** (launched March 2026 via the Claude Partner Network): 60 single-answer items, 120 minutes, pass at 720/1,000, 5 domains (Agentic Architecture & Orchestration 27%, Tool Design & MCP Integration 18%, Claude Code Configuration & Workflows 20%, Prompt Engineering & Structured Output 20%, Context Management & Reliability 15%) and 30 task statements. Each sitting draws 4 of 6 published scenarios.

- **Curriculum:** one lesson per task statement (patterns, anti-patterns, exam traps, scenario questions, build exercise).
- **Practice:** every question is tagged with one of the six scenarios; mocks draw scenarios at random and group items by scenario like the real exam.
- **Weights:** Anthropic publishes domain weights only; task weights split each domain evenly (an estimate used to size lessons, mocks and the bank).
- **Exercises:** `architect/exercises/` — tested reference solutions (agent loop with budget, prerequisite gate, structured MCP errors, validation–retry extraction, batch resubmission, escalation). Run `python architect/exercises/test_solutions.py`.
- Administrative facts (exam code, fee, retake/validity rules) vary between public sources; the guide marks them as "confirm on Anthropic Academy".

Progress is stored separately per track (`ccdv:` / `ccar:` localStorage prefixes).

## Build exercises

`exercises/` holds tested reference solutions for the core build exercises (agent loop, retry strategy, cost model, guardrail hook, MCP server). Run `python exercises/test_solutions.py` — offline, no API key.

## Use it

No build step is needed to *use* the guide — `assets/data.js` is committed.

- **Easiest:** open `index.html` directly in a browser, or
- serve the folder locally (recommended, avoids file:// quirks):

```bash
python -m http.server 8765
```

then open http://localhost:8765. Progress is stored in your browser's localStorage (export/import on the Progress page).

## Edit content

All Developer content lives in Markdown under `content/`; the Architect track mirrors the same layout under `architect/content/` (questions additionally carry `scenario: S1`–`S6`). Track-specific UI text, exam sizes and the storage prefix live in each `blueprint.json` under `ui`.

```
content/
  blueprint.json        # domains, skills, weights, official skill descriptions
  lessons/*.md          # one lesson per skill (frontmatter: skill, title, summary, sources)
  questions/d1..d8.md   # question bank (see format below)
  glossary.md           # "- **Term** [skill]: definition"
  flashcards.md         # "Q: … / A: … / @skill" blocks separated by blank lines
  pages/*.md            # exam-guide, quick-reference, study-plan
```

Rebuild after editing (both tracks, or one: `node build.mjs architect`):

```bash
node build.mjs
```

The build validates every question (skill exists, correct answers marked, explanations present), checks lesson quiz references, reports question counts per skill vs. weight, and measures answer-length bias.

Question format:

```markdown
### d2-api-01
skill: 2.3
type: single            # or: multi
Question stem (Markdown)…
- [ ] wrong option
- [x] correct option
- [ ] wrong option
- [ ] wrong option
> Explanation (Markdown).
```

Lesson directives: `{{quiz:question-id}}` embeds an interactive question; `:::key|trap|tip|warn|current|example|scenario|compare|remember|exercise Title … :::` renders callouts.
