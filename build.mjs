// Build script: compiles each track's Markdown content into a data file (window.CCDV).
//   content/            -> assets/data.js            (Developer, CCDV-F)
//   architect/content/  -> assets/data-architect.js  (Architect, CCA-F)
// Usage: node build.mjs [developer|architect]   (no argument builds both)
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const TRACKS = {
  developer: { content: "content", out: "assets/data.js" },
  architect: { content: "architect/content", out: "assets/data-architect.js" },
};
const read = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");

// ---------------------------------------------------------------- markdown
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code>${esc(c)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
    const ext = /^https?:/.test(u);
    return `<a href="${u}"${ext ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  s = s.replace(/ -- /g, " – ");
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i]);
  return s;
}

const CONTAINER_LABELS = {
  key: "Key concept",
  trap: "Exam trap",
  tip: "Tip",
  warn: "Watch out",
  current: "Current state (2026)",
  example: "Example",
  exercise: "Build exercise",
  remember: "Remember for the exam",
  compare: "Comparison",
  scenario: "Scenario",
};

function slugify(t) {
  return t.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function md(src, ctx = { headings: [] }) {
  const lines = src.split("\n");
  const out = [];
  let i = 0;
  const isBlank = (l) => /^\s*$/.test(l);
  const isListItem = (l) => /^(\s*)([-*]|\d+\.)\s+/.test(l);
  const startsBlock = (l) =>
    /^```/.test(l) || /^:::/.test(l) || /^#{1,4}\s/.test(l) || /^---\s*$/.test(l) ||
    /^\|/.test(l) || /^>\s?/.test(l) || isListItem(l) || /^\{\{.+\}\}\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }

    // fenced code
    let m = line.match(/^```\s*([\w+-]*)\s*(.*)$/);
    if (m) {
      const lang = m[1] || "";
      const title = m[2] || "";
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(
        `<div class="codeblock">${title || lang ? `<div class="codeblock-head"><span>${esc(title || lang)}</span><button class="copy-btn" type="button">Copy</button></div>` : ""}<pre><code class="lang-${lang}">${esc(buf.join("\n"))}</code></pre></div>`
      );
      continue;
    }

    // directive {{quiz:id}} / {{quiz:id1,id2}}
    m = line.match(/^\{\{(\w+):([^}]+)\}\}\s*$/);
    if (m) {
      if (m[1] === "quiz") {
        for (const id of m[2].split(",").map((x) => x.trim())) {
          ctx.quizzes = ctx.quizzes || [];
          ctx.quizzes.push(id);
          out.push(`<div class="quiz-embed" data-qid="${id}"></div>`);
        }
      } else if (m[1] === "slot") {
        out.push(`<div id="${m[2].trim()}-slot"></div>`);
      }
      i++;
      continue;
    }

    // container
    m = line.match(/^:::(\w+)\s*(.*)$/);
    if (m) {
      const type = m[1];
      const title = m[2].trim();
      const buf = [];
      let depth = 1;
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (/^:::\w+/.test(l)) depth++;
        else if (/^:::\s*$/.test(l)) { depth--; if (depth === 0) break; }
        buf.push(l);
        i++;
      }
      i++;
      const label = CONTAINER_LABELS[type] || type;
      out.push(
        `<aside class="callout callout-${type}"><div class="callout-label">${label}</div>${title ? `<div class="callout-title">${inline(title)}</div>` : ""}<div class="callout-body">${md(buf.join("\n"), ctx)}</div></aside>`
      );
      continue;
    }

    // heading
    m = line.match(/^(#{1,4})\s+(.*)$/);
    if (m) {
      const level = Math.max(2, m[1].length);
      const html = inline(m[2]);
      const id = slugify(m[2]);
      if (level === 2) ctx.headings.push({ id, text: m[2].replace(/`/g, "") });
      out.push(`<h${level} id="${id}">${html}</h${level}>`);
      i++;
      continue;
    }

    if (/^---\s*$/.test(line)) { out.push("<hr>"); i++; continue; }

    // table
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|\s*:?-{2,}/.test(lines[i + 1])) {
      const row = (l) => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => inline(c.trim().replace(/\\\|/g, "|")));
      const head = row(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(row(lines[i++]));
      out.push(
        `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`
      );
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${md(buf.join("\n"), ctx)}</blockquote>`);
      continue;
    }

    // list
    m = line.match(/^(\s*)([-*]|\d+\.)\s+/);
    if (m) {
      const baseIndent = m[1].length;
      const ordered = /\d/.test(m[2]);
      const items = [];
      while (i < lines.length) {
        const l = lines[i];
        const lm = l.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
        if (lm && lm[1].length === baseIndent) {
          items.push([lm[3]]);
          i++;
          continue;
        }
        if (isBlank(l)) {
          // blank line: continue list only if next non-blank is indented or another item
          let j = i + 1;
          while (j < lines.length && isBlank(lines[j])) j++;
          if (j < lines.length) {
            const nm = lines[j].match(/^(\s*)([-*]|\d+\.)\s+/);
            const ind = lines[j].match(/^(\s*)/)[1].length;
            if ((nm && nm[1].length === baseIndent) || ind > baseIndent) {
              items[items.length - 1].push("");
              i++;
              continue;
            }
          }
          break;
        }
        const ind = l.match(/^(\s*)/)[1].length;
        if (ind > baseIndent) {
          items[items.length - 1].push(l.slice(Math.min(ind, baseIndent + (ordered ? 3 : 2))));
          i++;
          continue;
        }
        // lazy continuation of paragraph
        if (!startsBlock(l)) { items[items.length - 1].push(l); i++; continue; }
        break;
      }
      const tag = ordered ? "ol" : "ul";
      const lis = items.map((it) => {
        let html = md(it.join("\n"), ctx);
        const single = html.match(/^<p>([\s\S]*)<\/p>$/);
        if (single && !single[1].includes("<p>")) html = single[1];
        const task = html.match(/^\[( |x)\]\s*/);
        if (task) return `<li class="task"><input type="checkbox" ${task[1] === "x" ? "checked" : ""}> ${html.slice(task[0].length)}</li>`;
        return `<li>${html}</li>`;
      });
      out.push(`<${tag}>${lis.join("")}</${tag}>`);
      continue;
    }

    // paragraph
    const buf = [line];
    i++;
    while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}

// ---------------------------------------------------------------- frontmatter
function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const l of m[1].split("\n")) {
    const kv = l.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: m[2] };
}

// ---------------------------------------------------------------- load
function build(track) {
const C = (...p) => join(ROOT, TRACKS[track].content, ...p);
console.log(`
=== ${track} (${TRACKS[track].content}) ===`);
const blueprint = JSON.parse(read(C("blueprint.json")));
const skillIndex = {};
for (const d of blueprint.domains) for (const s of d.skills) skillIndex[s.id] = { ...s, domain: d.id };
const scenarioIds = new Set((blueprint.exam.scenarios || []).map((s) => s.id));

const problems = [];

// questions
const questions = [];
const qdir = C("questions");
for (const f of readdirSync(qdir).filter((f) => f.endsWith(".md")).sort()) {
  const text = read(join(qdir, f));
  const blocks = text.split(/^### /m).slice(1);
  for (const b of blocks) {
    const lines = b.split("\n");
    const id = lines[0].trim();
    const q = { id, skill: null, type: "single", stem: "", options: [], correct: [], explanation: "" };
    let scenario = null;
    let section = "stem";
    const stem = [];
    const expl = [];
    for (const l of lines.slice(1)) {
      let m;
      if (section === "stem" && (m = l.match(/^skill:\s*(.+)$/))) { q.skill = m[1].trim(); continue; }
      if (section === "stem" && (m = l.match(/^type:\s*(.+)$/))) { q.type = m[1].trim(); continue; }
      if (section === "stem" && (m = l.match(/^scenario:\s*(.+)$/))) { scenario = m[1].trim(); continue; }
      if ((m = l.match(/^- \[( |x)\]\s+(.*)$/))) {
        section = "options";
        q.options.push(inline(m[2]));
        if (m[1] === "x") q.correct.push(q.options.length - 1);
        continue;
      }
      if (section === "options" && /^\s+\S/.test(l) && q.options.length && !/^>/.test(l)) {
        q.options[q.options.length - 1] += " " + inline(l.trim());
        continue;
      }
      if ((m = l.match(/^>\s?(.*)$/))) { section = "expl"; expl.push(m[1]); continue; }
      if (section === "stem") stem.push(l);
      else if (section === "expl") expl.push(l);
    }
    q.stem = md(stem.join("\n").trim());
    q.explanation = md(expl.join("\n").trim());
    if (!skillIndex[q.skill]) problems.push(`Question ${id}: unknown skill '${q.skill}'`);
    if (q.options.length < 3) problems.push(`Question ${id}: only ${q.options.length} options`);
    if (!q.correct.length) problems.push(`Question ${id}: no correct option`);
    if (q.type === "single" && q.correct.length !== 1) problems.push(`Question ${id}: single but ${q.correct.length} correct`);
    if (q.type === "multi" && q.correct.length < 2) problems.push(`Question ${id}: multi but ${q.correct.length} correct`);
    if (!q.explanation) problems.push(`Question ${id}: missing explanation`);
    if (questions.find((x) => x.id === id)) problems.push(`Duplicate question id ${id}`);
    if (scenario) {
      if (!scenarioIds.has(scenario)) problems.push(`Question ${id}: unknown scenario '${scenario}'`);
      q.scenario = scenario;
    } else if (scenarioIds.size) problems.push(`Question ${id}: missing scenario (scenario-based track)`);
    q.domain = skillIndex[q.skill]?.domain;
    questions.push(q);
  }
}
const qids = new Set(questions.map((q) => q.id));

// lessons
const lessons = [];
const ldir = C("lessons");
for (const f of readdirSync(ldir).filter((f) => f.endsWith(".md")).sort()) {
  const { meta, body } = frontmatter(read(join(ldir, f)));
  const skill = skillIndex[meta.skill];
  if (!skill) { problems.push(`Lesson ${f}: unknown skill ${meta.skill}`); continue; }
  const ctx = { headings: [], quizzes: [] };
  const html = md(body, ctx);
  for (const qid of ctx.quizzes) if (!qids.has(qid)) problems.push(`Lesson ${f}: quiz ${qid} not found`);
  const words = body.split(/\s+/).length;
  lessons.push({
    skill: skill.id,
    slug: skill.slug,
    title: meta.title || skill.name,
    summary: meta.summary || "",
    minutes: Math.max(5, Math.round(words / 180)),
    html,
    headings: ctx.headings,
    sources: (meta.sources || "").split(";").map((s) => s.trim()).filter(Boolean),
    text: body.replace(/```[\s\S]*?```/g, " ").replace(/[#*`>|:\-\[\]{}]/g, " ").replace(/\s+/g, " ").slice(0, 20000),
  });
}
for (const id of Object.keys(skillIndex)) if (!lessons.find((l) => l.skill === id)) problems.push(`Missing lesson for skill ${id}`);

// glossary: "- **Term** [skill]: definition"
const glossary = [];
if (existsSync(C("glossary.md"))) {
  for (const l of read(C("glossary.md")).split("\n")) {
    const m = l.match(/^- \*\*(.+?)\*\*\s*(?:\[([\d.]+)\])?\s*[:—-]\s*(.*)$/);
    if (m) glossary.push({ term: m[1], skill: m[2] || null, html: inline(m[3]), text: m[3] });
  }
}

// flashcards: "Q: ...\nA: ...\n@skill" blocks separated by blank lines
const flashcards = [];
if (existsSync(C("flashcards.md"))) {
  const blocks = read(C("flashcards.md")).split(/\n\s*\n/);
  for (const b of blocks) {
    const q = b.trim().match(/^Q:\s*([\s\S]*?)\nA:\s*([\s\S]*?)(?:\n@([\d.]+))?\s*$/);
    if (q) flashcards.push({ id: "f" + flashcards.length, front: md(q[1].trim()), back: md(q[2].trim()), skill: q[3] || null });
  }
}

// quick reference & other pages
const pages = {};
const pdir = C("pages");
if (existsSync(pdir)) {
  for (const f of readdirSync(pdir).filter((f) => f.endsWith(".md"))) {
    const { meta, body } = frontmatter(read(join(pdir, f)));
    const ctx = { headings: [], quizzes: [] };
    pages[f.replace(/\.md$/, "")] = { title: meta.title || f, summary: meta.summary || "", html: md(body, ctx), headings: ctx.headings };
    for (const qid of ctx.quizzes) if (!qids.has(qid)) problems.push(`Page ${f}: quiz ${qid} not found`);
  }
}

// ---------------------------------------------------------------- report
const perSkill = {};
for (const q of questions) perSkill[q.skill] = (perSkill[q.skill] || 0) + 1;
console.log("Lessons:", lessons.length, "| Questions:", questions.length, "| Glossary:", glossary.length, "| Flashcards:", flashcards.length, "| Pages:", Object.keys(pages).join(", "));
for (const id of Object.keys(skillIndex)) {
  const target = Math.round((skillIndex[id].weight / 100) * blueprint.exam.items * 4.5);
  console.log(`  ${id.padEnd(4)} ${skillIndex[id].name.padEnd(40)} questions ${String(perSkill[id] || 0).padStart(3)}  (weight ${skillIndex[id].weight}%, ~${Math.max(8, target)} recommended)`);
}
// answer-length bias: share of single-answer items whose correct option is the unique longest
const plain = (s) => s.replace(/<[^>]+>/g, "").length;
const bias = {};
for (const q of questions.filter((q) => q.type === "single")) {
  const L = q.options.map(plain);
  const max = Math.max(...L);
  const min = Math.min(...L);
  const b = (bias[q.domain] = bias[q.domain] || { n: 0, longest: 0, shortest: 0 });
  b.n++;
  const c = L[q.correct[0]];
  const others = L.filter((_, i) => i !== q.correct[0]);
  if (c >= Math.max(...others) * 1.15) b.longest++;   // noticeably longest
  if (c <= Math.min(...others) / 1.15) b.shortest++;  // noticeably shortest
}
console.log("  correct answer noticeably (≥15%) longest / shortest by domain (target: low): " + Object.entries(bias).map(([d, b]) => `D${d} ${Math.round((100 * b.longest) / b.n)}/${Math.round((100 * b.shortest) / b.n)}%`).join(" · "));
const multi = questions.filter((q) => q.type === "multi").length;
console.log(`  multiple-response: ${multi} (${Math.round((multi / Math.max(1, questions.length)) * 100)}%)`);
if (scenarioIds.size) {
  const perScen = {};
  for (const q of questions) perScen[q.scenario] = (perScen[q.scenario] || 0) + 1;
  console.log("  questions per scenario: " + [...scenarioIds].map((s) => `${s} ${perScen[s] || 0}`).join(" · "));
}
if (problems.length) {
  console.log("\nPROBLEMS:");
  for (const p of problems) console.log("  - " + p);
}

const data = { blueprint, lessons, questions, glossary, flashcards, pages, built: new Date().toISOString().slice(0, 10) };
writeFileSync(join(ROOT, TRACKS[track].out), "window.CCDV = " + JSON.stringify(data) + ";\n");
console.log("\nWrote " + TRACKS[track].out + " (" + Math.round(JSON.stringify(data).length / 1024) + " KB)");
if (problems.length) process.exitCode = 1;
}

const only = process.argv[2];
if (only && !TRACKS[only]) { console.error(`Unknown track '${only}'. Use one of: ${Object.keys(TRACKS).join(", ")}`); process.exit(1); }
for (const t of only ? [only] : Object.keys(TRACKS)) build(t);
