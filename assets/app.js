/* CCDV-F Study Guide — single-page app (no build step required at runtime). */
(function () {
  "use strict";
  const D = window.CCDV;
  const main = document.getElementById("main");
  if (!D) { main.innerHTML = "<p>Data not found. Run <code>node build.mjs</code>.</p>"; return; }

  // ------------------------------------------------------------------ indexes
  const BP = D.blueprint;
  const DOMAINS = BP.domains;
  const SKILLS = {};
  DOMAINS.forEach((d) => d.skills.forEach((s) => (SKILLS[s.id] = { ...s, domain: d })));
  const SKILL_IDS = Object.keys(SKILLS);
  const LESSON = {};
  D.lessons.forEach((l) => (LESSON[l.skill] = l));
  const ORDERED = SKILL_IDS.map((id) => LESSON[id]).filter(Boolean);
  const Q = {};
  D.questions.forEach((q) => (Q[q.id] = q));
  const QBY = {};
  D.questions.forEach((q) => (QBY[q.skill] = QBY[q.skill] || []).push(q));
  const DCOLOR = (id) => `var(--d${id})`;

  // ------------------------------------------------------------------ storage
  const PFX = "ccdv:";
  const store = {
    get(k, d) { try { const v = localStorage.getItem(PFX + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(PFX + k); } catch {} },
  };
  const getCompleted = () => store.get("completed", {});
  const getAnswers = () => store.get("answers", {});
  function recordAnswer(qid, correct, source) {
    const a = getAnswers();
    const r = a[qid] || { n: 0, c: 0 };
    r.n++; if (correct) r.c++;
    r.last = correct ? 1 : 0; r.t = Date.now(); r.src = source;
    a[qid] = r; store.set("answers", a);
  }

  // ------------------------------------------------------------------ helpers
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pct = (x) => Math.round(x * 100);
  const LETTERS = "ABCDEFGH";
  const NUMWORD = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE"];
  function shuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }
  function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }
  function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s = sec % 60; return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; }
  const lessonHref = (skillId) => { const s = SKILLS[skillId]; return `#/learn/${s.domain.slug}/${s.slug}`; };
  const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

  // Scaled score: 70% raw ≈ 720 cut (estimate), linear on both sides.
  function scaled(p) { return Math.round(p <= 0.7 ? 100 + (620 * p) / 0.7 : 720 + (280 * (p - 0.7)) / 0.3); }

  // Weighted allocation of n items over skills (largest remainder).
  function allocate(n, skillIds) {
    const tot = skillIds.reduce((s, id) => s + SKILLS[id].weight, 0);
    const raw = skillIds.map((id) => ({ id, x: (n * SKILLS[id].weight) / tot }));
    raw.forEach((r) => (r.k = Math.floor(r.x)));
    let left = n - raw.reduce((s, r) => s + r.k, 0);
    raw.slice().sort((a, b) => b.x - b.k - (a.x - a.k)).forEach((r) => { if (left > 0) { r.k++; left--; } });
    return raw;
  }
  // Pick n questions weighted by blueprint, preferring questions not in `avoid` and not answered.
  function pickWeighted(n, skillIds, avoid = new Set()) {
    const ans = getAnswers();
    const plan = allocate(n, skillIds);
    const picked = [];
    const score = (q) => (avoid.has(q.id) ? 2 : 0) + (ans[q.id] ? 1 : 0) + Math.random() * 0.9;
    for (const r of plan) {
      const pool = (QBY[r.id] || []).slice().sort((a, b) => score(a) - score(b));
      picked.push(...pool.slice(0, r.k));
    }
    if (picked.length < n) {
      const rest = D.questions.filter((q) => skillIds.includes(q.skill) && !picked.includes(q)).sort((a, b) => score(a) - score(b));
      picked.push(...rest.slice(0, n - picked.length));
    }
    return shuffle(picked);
  }

  // ------------------------------------------------------------------ question component
  // opts: { mode: 'instant' | 'exam' | 'review', order, selected, onChange, source, number, total, showSkill }
  function renderQuestion(container, q, opts = {}) {
    const order = opts.order || shuffle(q.options.map((_, i) => i));
    const multi = q.type === "multi";
    const need = q.correct.length;
    let selected = opts.selected ? opts.selected.slice() : [];
    let revealed = opts.mode === "review";
    const skill = SKILLS[q.skill];

    function draw() {
      const isRight = sameSet(selected, q.correct);
      container.innerHTML = `
        <div class="q-card" data-q="${q.id}">
          <div class="q-head">
            ${opts.number ? `<span class="chip">Question ${opts.number}${opts.total ? " of " + opts.total : ""}</span>` : ""}
            ${opts.showSkill !== false ? `<span class="chip" style="color:${DCOLOR(skill.domain.id)}">D${skill.domain.id} · ${h(skill.id)} ${h(skill.name)}</span>` : ""}
            ${multi ? `<span class="chip chip-accent">Multiple response</span>` : ""}
          </div>
          <div class="q-stem">${q.stem}</div>
          <div class="q-select-hint">${multi ? `Select ${NUMWORD[need] || need}.` : "Select ONE."}</div>
          <div class="q-options">
            ${order.map((oi, pos) => {
              let cls = "q-opt" + (multi ? " multi" : "");
              const sel = selected.includes(oi);
              if (revealed) {
                if (q.correct.includes(oi) && sel) cls += " correct";
                else if (q.correct.includes(oi)) cls += " correct missed";
                else if (sel) cls += " wrong";
              } else if (sel) cls += " selected";
              return `<button type="button" class="${cls}" data-oi="${oi}" ${revealed ? "disabled" : ""}><span class="letter">${LETTERS[pos]}</span><span>${q.options[oi]}</span></button>`;
            }).join("")}
          </div>
          ${opts.mode === "instant" && !revealed ? `<div class="q-actions"><button class="btn btn-primary btn-sm" data-act="check" ${selected.length !== need ? "disabled" : ""}>Check answer</button><span class="muted" style="font-size:13px">${multi ? `Choose ${need} options` : ""}</span></div>` : ""}
          ${revealed ? `
            <div class="q-feedback">
              ${opts.mode !== "review" || selected.length ? `<div class="verdict ${isRight ? "ok" : "no"}">${isRight ? "✓ Correct" : selected.length ? "✗ Incorrect" : "— Not answered"}</div>` : ""}
              <div>${q.explanation}</div>
              <div class="row" style="margin-top:10px"><a class="btn btn-sm" href="${lessonHref(q.skill)}">Review lesson ${h(q.skill)} →</a>${opts.extraActions || ""}</div>
            </div>` : ""}
        </div>`;
      $$(".q-opt", container).forEach((b) =>
        b.addEventListener("click", () => {
          const oi = +b.dataset.oi;
          if (multi) {
            if (selected.includes(oi)) selected = selected.filter((x) => x !== oi);
            else if (selected.length < need) selected.push(oi);
            else { selected.shift(); selected.push(oi); }
          } else selected = [oi];
          if (opts.onChange) opts.onChange(selected.slice(), order);
          draw();
        })
      );
      const chk = $('[data-act="check"]', container);
      if (chk) chk.addEventListener("click", () => {
        revealed = true;
        const ok = sameSet(selected, q.correct);
        recordAnswer(q.id, ok, opts.source || "practice");
        if (opts.onCheck) opts.onCheck(ok);
        draw();
      });
      wireCopy(container);
    }
    draw();
    return { order, get selected() { return selected; } };
  }

  function wireCopy(root) {
    $$(".copy-btn", root).forEach((b) => {
      if (b.dataset.wired) return;
      b.dataset.wired = 1;
      b.addEventListener("click", () => {
        const code = b.closest(".codeblock").querySelector("code").innerText;
        navigator.clipboard?.writeText(code).then(() => { b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1200); });
      });
    });
  }
  function hydrate(root) {
    $$(".quiz-embed", root).forEach((el) => {
      const q = Q[el.dataset.qid];
      if (q) renderQuestion(el, q, { mode: "instant", source: "lesson" });
    });
    wireCopy(root);
  }

  // ------------------------------------------------------------------ stats
  function skillStats() {
    const ans = getAnswers();
    const comp = getCompleted();
    const out = {};
    for (const id of SKILL_IDS) {
      const qs = QBY[id] || [];
      const seen = qs.filter((q) => ans[q.id]);
      const lastCorrect = seen.filter((q) => ans[q.id].last).length;
      const acc = seen.length ? lastCorrect / seen.length : null;
      const coverage = qs.length ? seen.length / qs.length : 0;
      out[id] = { total: qs.length, seen: seen.length, acc, coverage, done: !!comp[id] };
    }
    return out;
  }
  function readiness() {
    const st = skillStats();
    let w = 0, s = 0, covered = 0;
    for (const id of SKILL_IDS) {
      const sk = SKILLS[id];
      w += sk.weight;
      const a = st[id].acc;
      // unseen skills count as 0.25 (guessing) so readiness can't be inflated by skipping
      const conf = Math.min(1, st[id].seen / 5);
      const est = a == null ? 0.25 : a * conf + 0.25 * (1 - conf);
      s += sk.weight * est;
      if (st[id].seen) covered += sk.weight;
    }
    const p = s / w;
    return { p, scaled: scaled(p), covered: covered / w };
  }

  // ------------------------------------------------------------------ views
  const views = {};

  views.home = () => {
    const r = readiness();
    const comp = getCompleted();
    const done = Object.keys(comp).filter((k) => comp[k]).length;
    const mocks = store.get("mocks", []);
    const best = mocks.filter((m) => m.mode === "full").reduce((b, m) => Math.max(b, m.scaled), 0);
    const resume = store.get("lastLesson", null);
    main.innerHTML = `
      <section class="hero">
        <div class="eyebrow">Claude Certification Program · Exam Guide v1.0 · Effective July 2026 · Exam code CCDV-F</div>
        <h1>Claude Certified Developer – Foundations: everything you need to pass.</h1>
        <p class="lead">A complete prep track built on the official blueprint: lessons for all 25 weighted skills, ${D.questions.length} original exam-style questions, drill mode, flashcards, a diagnostic and timed 53-question mock exams scored on the 100–1,000 scale.</p>
        <div class="row" style="margin-top:20px">
          <a class="btn btn-primary" href="${resume ? resume : "#/learn"}">${resume ? "Continue studying →" : "Start the curriculum →"}</a>
          <a class="btn" href="#/diagnostic">Take the diagnostic</a>
          <a class="btn" href="#/mock">Mock exam</a>
        </div>
        <div class="facts">
          <div class="fact"><div class="num">53</div><div class="lbl">Items</div></div>
          <div class="fact"><div class="num">120</div><div class="lbl">Minutes</div></div>
          <div class="fact"><div class="num">720</div><div class="lbl">Pass (100–1,000)</div></div>
          <div class="fact"><div class="num">8 / 25</div><div class="lbl">Domains / skills</div></div>
          <div class="fact"><div class="num">$125</div><div class="lbl">Fee per attempt</div></div>
          <div class="fact"><div class="num">12 mo</div><div class="lbl">Validity</div></div>
        </div>
      </section>

      <section class="section grid grid-4">
        <div class="card stat"><div class="lbl">Lessons completed</div><div class="num">${done} / ${ORDERED.length}</div></div>
        <div class="card stat"><div class="lbl">Questions answered</div><div class="num">${Object.keys(getAnswers()).length} / ${D.questions.length}</div></div>
        <div class="card stat"><div class="lbl">Readiness estimate</div><div class="num" style="color:${r.scaled >= 720 ? "var(--good)" : "var(--ink)"}">${r.scaled}</div></div>
        <div class="card stat"><div class="lbl">Best full mock</div><div class="num">${best || "—"}</div></div>
      </section>

      <section class="section">
        <h2>How to use this guide</h2>
        <div class="grid grid-4">
          ${[
            ["1", "Diagnose", "Take the 24-question diagnostic to see which domains need the most work.", "#/diagnostic"],
            ["2", "Learn", "Work through the 25 lessons. Each ends with exam traps, practice questions and a build exercise.", "#/learn"],
            ["3", "Drill & memorize", "Drill weak skills with instant feedback, and run flashcards daily for facts and numbers.", "#/drill"],
            ["4", "Simulate", "Sit full 53-question mocks under the 120-minute clock. Aim for 800+ consistently before booking.", "#/mock"],
          ].map(([n, t, d, href]) => `<a class="card" href="${href}"><div class="eyebrow">Step ${n}</div><h3 style="margin:.3em 0">${t}</h3><p class="muted" style="margin:0;font-size:14.5px">${d}</p></a>`).join("")}
        </div>
      </section>

      <section class="section">
        <h2>Exam blueprint</h2>
        <p class="muted">Anthropic weights the 25 skills individually. A third of the exam sits in Applications and Integration; lessons and the question bank are sized by these weights.</p>
        <div class="card">${blueprintBars()}</div>
      </section>

      <section class="section">
        <h2>Domains</h2>
        ${domainCards()}
      </section>`;
  };

  function blueprintBars(withProgress = true) {
    const st = skillStats();
    return DOMAINS.map((d) => {
      const done = d.skills.filter((s) => st[s.id].done).length;
      return `<div class="bp-row">
        <div class="bp-name"><a href="#/learn/${d.slug}">D${d.id} · ${h(d.name)}</a>${withProgress ? `<small>${done}/${d.skills.length} lessons done · ${d.skills.length} skill${d.skills.length > 1 ? "s" : ""}</small>` : ""}</div>
        <div class="bar"><span style="width:${(d.weight / 33.1) * 100}%;background:${DCOLOR(d.id)}"></span></div>
        <div class="bp-pct">${d.weight}%</div>
      </div>`;
    }).join("");
  }

  function domainCards() {
    const st = skillStats();
    return `<div class="grid grid-2">${DOMAINS.map((d) => `
      <div class="card dom-card" style="--dc:${DCOLOR(d.id)}">
        <div class="dom-head"><span class="eyebrow">Domain ${d.id}</span><span class="dom-weight">${d.weight}%</span></div>
        <h3><a href="#/learn/${d.slug}" style="color:inherit;text-decoration:none">${h(d.name)}</a></h3>
        <p>${h(d.summary)}</p>
        <ul class="skill-list">${d.skills.map((s) => `
          <li><span class="check ${st[s.id].done ? "done" : ""}">${st[s.id].done ? "✓" : ""}</span><span class="sid">${s.id}</span><a href="${lessonHref(s.id)}">${h(s.name)}</a><span class="w">${s.weight}%</span></li>`).join("")}
        </ul>
      </div>`).join("")}</div>`;
  }

  views.learn = () => {
    main.innerHTML = `
      <div class="eyebrow">Core syllabus</div>
      <h1>Curriculum</h1>
      <p class="lead">The CCDV-F exam covers 8 domains and 25 individually weighted skills. Each lesson below maps 1:1 to a skill in the official Exam Guide v1.0 and is sized by its weight — spend your time accordingly.</p>
      <div class="card" style="margin:22px 0">${blueprintBars()}</div>
      ${domainCards()}
      <div class="section card">
        <h3>Blueprint coverage</h3>
        <p class="muted" style="font-size:14px">Every skill in the official Exam Guide v1.0 maps to one lesson. Question counts are sized by skill weight.</p>
        <div class="table-wrap" style="border:0"><table class="skill-table"><thead><tr><th>Skill</th><th>Lesson sections</th><th>Weight</th><th>Questions</th><th>Flashcards</th></tr></thead><tbody>
          ${SKILL_IDS.map((id) => { const l = LESSON[id]; return `<tr><td><a href="${lessonHref(id)}">${id} ${h(SKILLS[id].name)}</a></td><td style="font-size:13px;color:var(--ink-2)">${l.headings.map((x) => h(x.text)).filter((t) => !/^(What you need to know|Exam traps|Practice questions|Build exercise)$/.test(t)).join(" · ")}</td><td>${SKILLS[id].weight}%</td><td>${(QBY[id] || []).length}</td><td>${D.flashcards.filter((c) => c.skill === id).length}</td></tr>`; }).join("")}
        </tbody></table></div>
      </div>
      <div class="section card">
        <h3>Recommended order</h3>
        <p class="muted" style="margin-bottom:0">Follow the numbering (1.1 → 8.3). Domain 2 builds on the API concepts you meet in Domain 1, and Domains 5–8 assume you can read a Messages API request. If you are short on time, prioritize by weight: 2.5, 2.4, 2.3, 5.2, 1.2, 5.1, 1.3, 6.2, 1.1, 8.1.</p>
      </div>`;
  };

  views.domain = (slug) => {
    const d = DOMAINS.find((x) => x.slug === slug);
    if (!d) return views.notfound();
    const st = skillStats();
    main.innerHTML = `
      <div class="breadcrumb"><a href="#/learn">Learn</a> / <span>Domain ${d.id}</span></div>
      <div class="row" style="align-items:baseline"><h1 style="margin-bottom:.2em">${h(d.name)}</h1><span class="chip chip-accent" style="font-size:15px">${d.weight}% of exam</span></div>
      <p class="lead">${h(d.summary)}</p>
      <div class="grid grid-2" style="margin-top:24px">
        ${d.skills.map((s) => {
          const l = LESSON[s.id];
          const x = st[s.id];
          return `<a class="card" href="${lessonHref(s.id)}">
            <div class="row"><span class="eyebrow">Skill ${s.id}</span><span class="spacer"></span><span class="chip">${s.weight}%</span>${x.done ? '<span class="chip chip-good">✓ Done</span>' : ""}</div>
            <h3 style="margin:.4em 0">${h(s.name)}</h3>
            <p class="muted" style="font-size:14.5px">${h(l ? l.summary : s.guide)}</p>
            <div class="row muted" style="font-size:13px"><span>${l ? l.minutes : "?"} min read</span><span>·</span><span>${x.total} practice questions</span>${x.acc != null ? `<span>·</span><span>${pct(x.acc)}% correct</span>` : ""}</div>
          </a>`;
        }).join("")}
      </div>
      <div class="row section"><a class="btn btn-primary" href="#/drill?domain=${d.id}">Drill this domain</a><a class="btn" href="#/learn">All domains</a></div>`;
  };

  views.lesson = (dslug, sslug) => {
    const d = DOMAINS.find((x) => x.slug === dslug);
    const s = d && d.skills.find((x) => x.slug === sslug);
    if (!s) return views.notfound();
    const l = LESSON[s.id];
    if (!l) return views.notfound();
    store.set("lastLesson", location.hash);
    const idx = ORDERED.indexOf(l);
    const prev = ORDERED[idx - 1], next = ORDERED[idx + 1];
    const comp = getCompleted();
    const nq = (QBY[s.id] || []).length;
    main.innerHTML = `
      <div class="lesson-layout">
        <article>
          <div class="breadcrumb"><a href="#/learn">Learn</a> / <a href="#/learn/${d.slug}">${h(d.name)}</a> / <span>${s.id}</span></div>
          <h1>${s.id} ${h(l.title)}</h1>
          <div class="lesson-meta">
            <span class="chip" style="color:${DCOLOR(d.id)}">Domain ${d.id}</span>
            <span class="chip chip-accent">${s.weight}% of exam</span>
            <span class="chip">≈ ${l.minutes} min</span>
            <span class="chip">${nq} practice questions</span>
            <button class="chip ${comp[s.id] ? "chip-good" : ""}" id="mark" style="cursor:pointer">${comp[s.id] ? "✓ Completed" : "Mark complete"}</button>
          </div>
          <div class="guide-box"><b>Official skill description (Exam Guide v1.0)</b>${h(s.guide)}</div>
          <div class="prose" id="lesson-body">${l.html}</div>
          ${l.sources.length ? `<h3>Sources & further reading</h3><ul class="prose">${l.sources.map((x) => { const m = x.match(/^(.*?)\s*\|\s*(https?:\S+)$/); return m ? `<li><a href="${m[2]}" target="_blank" rel="noopener">${h(m[1])}</a></li>` : `<li>${h(x)}</li>`; }).join("")}</ul>` : ""}
          <div class="card" style="margin-top:28px">
            <div class="row"><div><h3 style="margin:0">Practice skill ${s.id}</h3><p class="muted" style="margin:0">${nq} questions for this skill in the bank.</p></div><span class="spacer"></span>
            <a class="btn btn-primary" href="#/drill?skill=${s.id}">Drill ${s.id}</a>
            <button class="btn" id="mark2">${comp[s.id] ? "✓ Completed" : "Mark complete"}</button></div>
          </div>
          <nav class="pager">
            ${prev ? `<a href="${lessonHref(prev.skill)}"><small>← Previous</small>${prev.skill} ${h(prev.title)}</a>` : "<span></span>"}
            ${next ? `<a class="next" href="${lessonHref(next.skill)}"><small>Next →</small>${next.skill} ${h(next.title)}</a>` : `<a class="next" href="#/mock"><small>Finished the curriculum →</small>Take a full mock exam</a>`}
          </nav>
        </article>
        <aside class="toc">
          <h4>On this page</h4>
          ${l.headings.map((x) => `<a href="#" data-target="${x.id}">${h(x.text)}</a>`).join("")}
          <div class="toc-actions">
            <a class="btn btn-sm" href="#/drill?skill=${s.id}">Drill this skill</a>
            <a class="btn btn-sm" href="#/flashcards?skill=${s.id}">Flashcards</a>
          </div>
        </aside>
      </div>`;
    hydrate(main);
    $$(".toc a[data-target]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); document.getElementById(a.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" }); }));
    const toggle = () => {
      const c = getCompleted();
      c[s.id] = !c[s.id];
      store.set("completed", c);
      toast(c[s.id] ? `Lesson ${s.id} marked complete` : `Lesson ${s.id} marked incomplete`);
      const label = c[s.id] ? "✓ Completed" : "Mark complete";
      $("#mark").textContent = label; $("#mark2").textContent = label;
      $("#mark").classList.toggle("chip-good", !!c[s.id]);
    };
    $("#mark").addEventListener("click", toggle);
    $("#mark2").addEventListener("click", toggle);
  };

  // ---------------------------------------------------------------- drill
  views.drill = (params) => {
    const st = skillStats();
    const ans = getAnswers();
    const preDomain = params.get("domain");
    const preSkill = params.get("skill");
    main.innerHTML = `
      <div class="eyebrow">Study tools</div>
      <h1>Drill Mode</h1>
      <p class="lead">Answer questions one at a time with instant feedback and a full explanation. Every answer feeds your Progress Dashboard.</p>
      <div class="card narrow" style="margin-top:20px">
        <div class="field"><span>Scope</span>
          <select id="scope">
            <option value="all">All domains (weighted by blueprint)</option>
            ${DOMAINS.map((d) => `<option value="d${d.id}" ${preDomain == d.id ? "selected" : ""}>Domain ${d.id}: ${h(d.name)} (${d.weight}%)</option>`).join("")}
            ${SKILL_IDS.map((id) => `<option value="s${id}" ${preSkill === id ? "selected" : ""}>Skill ${id}: ${h(SKILLS[id].name)} (${(QBY[id] || []).length} q)</option>`).join("")}
          </select>
        </div>
        <div class="field"><span>Which questions</span>
          <select id="filter">
            <option value="unseen">Unseen first, then the rest</option>
            <option value="missed">Only questions I got wrong last time (${Object.values(ans).filter((a) => !a.last).length})</option>
            <option value="weak">Weakest skills first (adaptive)</option>
            <option value="any">Random</option>
          </select>
        </div>
        <div class="field"><span>Number of questions</span>
          <select id="count"><option>10</option><option selected>15</option><option>25</option><option>40</option><option value="999">All matching</option></select>
        </div>
        <button class="btn btn-primary" id="go">Start drill</button>
      </div>`;
    $("#go").addEventListener("click", () => {
      const scope = $("#scope").value, filter = $("#filter").value, count = +$("#count").value;
      let pool = D.questions.slice();
      if (scope.startsWith("d")) pool = pool.filter((q) => q.domain == scope.slice(1));
      if (scope.startsWith("s")) pool = pool.filter((q) => q.skill === scope.slice(1));
      const a = getAnswers();
      if (filter === "missed") pool = pool.filter((q) => a[q.id] && !a[q.id].last);
      let list;
      if (filter === "weak") {
        const s2 = skillStats();
        const weakness = (q) => (s2[q.skill].acc == null ? 0.5 : s2[q.skill].acc) - (a[q.id] ? 0 : 0.3) + Math.random() * 0.25;
        list = pool.sort((x, y) => weakness(x) - weakness(y)).slice(0, count);
      } else if (filter === "unseen") {
        list = shuffle(pool).sort((x, y) => (a[x.id] ? 1 : 0) - (a[y.id] ? 1 : 0)).slice(0, count);
        if (scope === "all" && count < 999) {
          const ids = SKILL_IDS;
          list = pickWeighted(Math.min(count, pool.length), ids);
        }
      } else list = shuffle(pool).slice(0, count);
      if (!list.length) { toast("No questions match this filter yet."); return; }
      runDrill(list);
    });
  };

  function runDrill(list) {
    let i = 0, correct = 0, answered = 0;
    const results = [];
    function step() {
      if (i >= list.length) return finish();
      const q = list[i];
      main.innerHTML = `
        <div class="row"><div class="eyebrow">Drill · ${i + 1} / ${list.length}</div><span class="spacer"></span><span class="chip chip-good">${correct} correct</span><span class="chip">${answered - correct} wrong</span><a class="btn btn-sm" href="#/drill">End drill</a></div>
        <div class="bar" style="margin:10px 0"><span style="width:${(i / list.length) * 100}%;background:var(--accent)"></span></div>
        <div id="qbox" class="narrow"></div>
        <div class="row narrow" style="justify-content:flex-end"><button class="btn btn-primary" id="next" style="display:none">${i + 1 < list.length ? "Next question →" : "See results"}</button></div>`;
      renderQuestion($("#qbox"), q, {
        mode: "instant", source: "drill", number: i + 1, total: list.length,
        onCheck(ok) { answered++; if (ok) correct++; results.push({ q, ok }); $("#next").style.display = ""; $("#next").focus(); },
      });
      $("#next").addEventListener("click", () => { i++; step(); window.scrollTo(0, 0); });
    }
    function finish() {
      const bySkill = {};
      results.forEach((r) => { const b = (bySkill[r.q.skill] = bySkill[r.q.skill] || { n: 0, c: 0 }); b.n++; if (r.ok) b.c++; });
      main.innerHTML = `
        <div class="eyebrow">Drill complete</div>
        <h1>${correct} / ${answered} correct (${answered ? pct(correct / answered) : 0}%)</h1>
        <div class="card narrow"><table class="skill-table"><thead><tr><th>Skill</th><th></th><th>Result</th></tr></thead><tbody>
          ${Object.entries(bySkill).map(([id, b]) => `<tr><td><a href="${lessonHref(id)}">${id} ${h(SKILLS[id].name)}</a></td><td></td><td>${b.c}/${b.n}</td></tr>`).join("")}
        </tbody></table></div>
        <div class="row section"><a class="btn btn-primary" href="#/drill">New drill</a><a class="btn" href="#/progress">Progress dashboard</a></div>
        <h2>Review</h2><div id="rev" class="narrow"></div>`;
      const rev = $("#rev");
      results.filter((r) => !r.ok).concat(results.filter((r) => r.ok)).forEach((r) => {
        const div = document.createElement("div");
        rev.appendChild(div);
        renderQuestion(div, r.q, { mode: "review", selected: [] });
      });
    }
    step();
  }

  // ---------------------------------------------------------------- exam engine (diagnostic + mock)
  const EXAM_KEY = "examInProgress";
  function startExam(cfg) {
    const avoid = new Set(store.get("mockSeen", []));
    const qs = pickWeighted(cfg.n, SKILL_IDS, cfg.mode === "diagnostic" ? new Set() : avoid);
    const exam = {
      mode: cfg.mode, title: cfg.title, durationSec: cfg.minutes * 60, start: Date.now(),
      items: qs.map((q) => ({ id: q.id, order: shuffle(q.options.map((_, i) => i)), sel: [], flag: false })),
      cur: 0,
    };
    store.set(EXAM_KEY, exam);
    location.hash = "#/exam";
  }

  views.exam = () => {
    const exam = store.get(EXAM_KEY, null);
    if (!exam) { location.hash = "#/mock"; return; }
    let timerId;
    const remaining = () => exam.durationSec - (Date.now() - exam.start) / 1000;
    function save() { store.set(EXAM_KEY, exam); }
    function draw() {
      const it = exam.items[exam.cur];
      const q = Q[it.id];
      const answeredN = exam.items.filter((x) => x.sel.length).length;
      main.innerHTML = `
        <div class="exam-bar">
          <strong>${h(exam.title)}</strong>
          <span class="muted">${answeredN}/${exam.items.length} answered</span>
          <span class="spacer"></span>
          <span class="timer" id="timer">${fmtTime(remaining())}</span>
          <button class="btn btn-sm" id="flag">${it.flag ? "★ Flagged" : "☆ Flag for review"}</button>
          <button class="btn btn-sm btn-primary" id="submit">Submit exam</button>
        </div>
        <div class="exam-layout">
          <div>
            <div id="qbox"></div>
            <div class="row">
              <button class="btn" id="prev" ${exam.cur === 0 ? "disabled" : ""}>← Previous</button>
              <span class="spacer"></span>
              <button class="btn btn-primary" id="nextq" ${exam.cur === exam.items.length - 1 ? "disabled" : ""}>Next →</button>
            </div>
            <p class="muted" style="font-size:13px;margin-top:14px">Keyboard: <span class="kbd">←</span> <span class="kbd">→</span> navigate · <span class="kbd">1</span>–<span class="kbd">5</span> select · <span class="kbd">F</span> flag</p>
          </div>
          <aside>
            <div class="card">
              <h4 style="margin:0 0 10px;font-family:var(--sans);font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Navigator</h4>
              <div class="navgrid">${exam.items.map((x, i) => `<button class="${x.sel.length ? "answered" : ""} ${x.flag ? "flagged" : ""} ${i === exam.cur ? "current" : ""}" data-i="${i}">${i + 1}</button>`).join("")}</div>
              <div class="legend"><span>■ answered</span><span style="color:var(--warn)">● flagged</span></div>
            </div>
          </aside>
        </div>`;
      renderQuestion($("#qbox"), q, {
        mode: "exam", order: it.order, selected: it.sel, number: exam.cur + 1, total: exam.items.length, showSkill: false,
        onChange(sel) { it.sel = sel; save(); $$(".navgrid button")[exam.cur].classList.toggle("answered", sel.length > 0); $(".exam-bar .muted").textContent = `${exam.items.filter((x) => x.sel.length).length}/${exam.items.length} answered`; },
      });
      $("#prev").addEventListener("click", () => go(exam.cur - 1));
      $("#nextq").addEventListener("click", () => go(exam.cur + 1));
      $("#flag").addEventListener("click", () => { it.flag = !it.flag; save(); draw(); });
      $("#submit").addEventListener("click", () => {
        const un = exam.items.filter((x) => x.sel.length === 0).length;
        const fl = exam.items.filter((x) => x.flag).length;
        if (confirm(`Submit the exam?${un ? `\n${un} question(s) unanswered.` : ""}${fl ? `\n${fl} question(s) flagged.` : ""}`)) finishExam();
      });
      $$(".navgrid button").forEach((b) => b.addEventListener("click", () => go(+b.dataset.i)));
    }
    function go(i) { if (i < 0 || i >= exam.items.length) return; exam.cur = i; save(); draw(); window.scrollTo(0, 0); }
    function tick() {
      const t = $("#timer");
      if (!t) { clearInterval(timerId); return; }
      const r = remaining();
      t.textContent = fmtTime(r);
      t.classList.toggle("low", r < 300);
      if (r <= 0) { clearInterval(timerId); alert("Time is up — the exam will be submitted."); finishExam(); }
    }
    function onKey(e) {
      if (!$("#qbox") || e.target.matches("input,select,textarea")) return;
      if (e.key === "ArrowRight") go(exam.cur + 1);
      else if (e.key === "ArrowLeft") go(exam.cur - 1);
      else if (e.key === "f" || e.key === "F") $("#flag")?.click();
      else if (/^[1-6]$/.test(e.key)) $$(".q-opt")[+e.key - 1]?.click();
    }
    function finishExam() {
      clearInterval(timerId);
      document.removeEventListener("keydown", onKey);
      const res = gradeExam(exam);
      store.del(EXAM_KEY);
      store.set("lastResult", res);
      location.hash = "#/results";
    }
    document.addEventListener("keydown", onKey);
    window.__cleanup = () => { clearInterval(timerId); document.removeEventListener("keydown", onKey); };
    draw();
    timerId = setInterval(tick, 1000);
    tick();
  };

  function gradeExam(exam) {
    const perDomain = {}, perSkill = {};
    let c = 0;
    const items = exam.items.map((it) => {
      const q = Q[it.id];
      const ok = sameSet(it.sel, q.correct);
      if (it.sel.length) recordAnswer(q.id, ok, exam.mode);
      if (ok) c++;
      const dd = (perDomain[q.domain] = perDomain[q.domain] || { n: 0, c: 0 });
      dd.n++; if (ok) dd.c++;
      const ss = (perSkill[q.skill] = perSkill[q.skill] || { n: 0, c: 0 });
      ss.n++; if (ok) ss.c++;
      return { ...it, ok };
    });
    const p = c / exam.items.length;
    const res = {
      mode: exam.mode, title: exam.title, date: Date.now(), n: exam.items.length, correct: c, p, scaled: scaled(p),
      seconds: Math.min(exam.durationSec, Math.round((Date.now() - exam.start) / 1000)), durationSec: exam.durationSec,
      perDomain, perSkill, items,
    };
    if (exam.mode !== "diagnostic") {
      const seen = new Set(store.get("mockSeen", []));
      exam.items.forEach((x) => seen.add(x.id));
      store.set("mockSeen", Array.from(seen));
    }
    const hist = store.get("mocks", []);
    hist.push({ mode: res.mode, title: res.title, date: res.date, n: res.n, correct: c, p, scaled: res.scaled, seconds: res.seconds, perDomain });
    store.set("mocks", hist);
    return res;
  }

  function scoreRing(score) {
    const frac = (score - 100) / 900;
    const r = 70, C2 = 2 * Math.PI * r;
    const cut = (720 - 100) / 900;
    const ang = cut * 2 * Math.PI - Math.PI / 2;
    const color = score >= 720 ? "var(--good)" : "var(--bad)";
    return `<svg class="score-ring" viewBox="0 0 170 170" role="img" aria-label="Scaled score ${score}">
      <circle cx="85" cy="85" r="${r}" fill="none" stroke="var(--bg-sunk)" stroke-width="14"/>
      <circle cx="85" cy="85" r="${r}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C2 * frac} ${C2}" transform="rotate(-90 85 85)"/>
      <line x1="${85 + (r - 11) * Math.cos(ang)}" y1="${85 + (r - 11) * Math.sin(ang)}" x2="${85 + (r + 11) * Math.cos(ang)}" y2="${85 + (r + 11) * Math.sin(ang)}" stroke="var(--ink)" stroke-width="2"/>
      <text x="85" y="88" text-anchor="middle" font-family="var(--serif)" font-size="36" font-weight="700" fill="var(--ink)">${score}</text>
      <text x="85" y="110" text-anchor="middle" font-size="11" fill="var(--muted)">of 1,000 · pass 720</text>
    </svg>`;
  }

  views.results = () => {
    const res = store.get("lastResult", null);
    if (!res) { location.hash = "#/mock"; return; }
    const pass = res.scaled >= 720;
    const weakSkills = Object.entries(res.perSkill).map(([id, b]) => ({ id, ...b, p: b.c / b.n })).filter((x) => x.p < 0.7).sort((a, b) => a.p - b.p || SKILLS[b.id].weight - SKILLS[a.id].weight);
    main.innerHTML = `
      <div class="eyebrow">${h(res.title)} · results</div>
      <div class="score-hero" style="margin:14px 0 26px">
        ${scoreRing(res.scaled)}
        <div>
          <div class="verdict ${pass ? "pass" : "fail"}">${res.mode === "diagnostic" ? (pass ? "On track to pass" : "Not yet at passing level") : pass ? "PASS" : "FAIL"}</div>
          <p style="margin:4px 0">${res.correct} of ${res.n} correct (${pct(res.p)}%) · time used ${fmtTime(res.seconds)} of ${fmtTime(res.durationSec)}</p>
          <p class="muted" style="font-size:13.5px;max-width:520px">Scaled-score estimate: the official cut score is 720 on 100–1,000; Anthropic does not publish the raw-to-scaled conversion. This guide maps ~70% correct to 720. Aim for 80%+ (≈ 813) on full mocks to have a safety margin.</p>
        </div>
      </div>
      <div class="grid grid-2">
        <div class="card"><h3>Percent correct by domain</h3>
          ${DOMAINS.map((d) => { const b = res.perDomain[d.id]; if (!b) return ""; const p = b.c / b.n; return `<div class="bp-row"><div class="bp-name">D${d.id} · ${h(d.name)}<small>${b.c}/${b.n} correct</small></div><div class="bar"><span style="width:${p * 100}%;background:${p >= 0.7 ? "var(--good)" : "var(--bad)"}"></span></div><div class="bp-pct">${pct(p)}%</div></div>`; }).join("")}
        </div>
        <div class="card"><h3>Study next</h3>
          ${weakSkills.length ? `<ul class="skill-list">${weakSkills.slice(0, 8).map((x) => `<li><span class="sid">${x.id}</span><a href="${lessonHref(x.id)}">${h(SKILLS[x.id].name)}</a><span class="w">${x.c}/${x.n}</span></li>`).join("")}</ul>
          <div class="row" style="margin-top:14px"><a class="btn btn-primary btn-sm" href="#/drill?skill=${weakSkills[0].id}">Drill ${weakSkills[0].id}</a><a class="btn btn-sm" href="#/progress">Progress</a></div>` : `<p>No skill below 70% — excellent. Keep sitting full mocks under time pressure.</p>`}
        </div>
      </div>
      <h2>Review your answers</h2>
      <div class="tabs" id="rtabs"><button data-f="wrong" class="active">Incorrect (${res.items.filter((x) => !x.ok).length})</button><button data-f="flag">Flagged (${res.items.filter((x) => x.flag).length})</button><button data-f="all">All (${res.items.length})</button></div>
      <div id="rlist" class="narrow"></div>
      <div class="row section"><a class="btn btn-primary" href="#/mock">New mock exam</a><a class="btn" href="#/progress">Progress dashboard</a></div>`;
    function list(f) {
      const box = $("#rlist");
      box.innerHTML = "";
      res.items.forEach((it, i) => {
        if (f === "wrong" && it.ok) return;
        if (f === "flag" && !it.flag) return;
        const div = document.createElement("div");
        box.appendChild(div);
        renderQuestion(div, Q[it.id], { mode: "review", order: it.order, selected: it.sel, number: i + 1, total: res.items.length });
      });
      if (!box.children.length) box.innerHTML = `<div class="empty">Nothing here.</div>`;
    }
    $$("#rtabs button").forEach((b) => b.addEventListener("click", () => { $$("#rtabs button").forEach((x) => x.classList.remove("active")); b.classList.add("active"); list(b.dataset.f); }));
    list("wrong");
  };

  views.mock = () => {
    const inprog = store.get(EXAM_KEY, null);
    const hist = store.get("mocks", []).filter((m) => m.mode !== "diagnostic");
    const seen = store.get("mockSeen", []).length;
    main.innerHTML = `
      <div class="eyebrow">Practice</div>
      <h1>Mock Exam</h1>
      <p class="lead">Sit an exam-realistic simulation: questions are drawn in proportion to the 25 skill weights, options are shuffled, multiple-response items tell you how many to select, and there is no feedback until you submit. Scored on the 100–1,000 scale with 720 to pass.</p>
      ${inprog ? `<div class="callout callout-warn"><div class="callout-label">Exam in progress</div><div class="callout-body"><p>You have an unfinished ${h(inprog.title)}.</p><div class="row"><a class="btn btn-primary btn-sm" href="#/exam">Resume</a><button class="btn btn-sm" id="discard">Discard</button></div></div></div>` : ""}
      <div class="grid grid-2" style="margin-top:20px">
        <div class="card"><div class="eyebrow">Full length</div><h3>Full mock · 53 questions · 120 minutes</h3><p class="muted">The real exam's format and pace (≈ 2 min 15 s per item). Use this for your final readiness checks.</p><button class="btn btn-primary" data-start="full">Start full mock</button></div>
        <div class="card"><div class="eyebrow">Half length</div><h3>Quick mock · 27 questions · 60 minutes</h3><p class="muted">Same weighting and scoring in half the time — good for mid-preparation checkpoints.</p><button class="btn" data-start="half">Start quick mock</button></div>
      </div>
      <p class="muted" style="margin-top:14px">Question bank: ${D.questions.length} items. Mocks prefer questions you have not seen in earlier mocks (${seen} seen so far). <button class="btn btn-sm btn-ghost" id="resetseen">Reset mock rotation</button></p>
      <div class="section"><h2>Exam technique</h2>
        <div class="grid grid-3">
          <div class="card"><h4 style="margin-top:0">Read the last sentence first</h4><p class="muted" style="margin:0">Questions ask for the <em>best</em>, <em>most effective</em> or <em>first</em> step. Identify that qualifier before reading options; several options are often technically possible.</p></div>
          <div class="card"><h4 style="margin-top:0">Prefer deterministic controls</h4><p class="muted" style="margin:0">When an option enforces something in code (hooks, permissions, schemas, server-side checks) and another only asks the model nicely in a prompt, the enforced option is usually right for safety- or compliance-critical requirements.</p></div>
          <div class="card"><h4 style="margin-top:0">Pace and flag</h4><p class="muted" style="margin:0">53 items in 120 minutes. Answer every item (no penalty for guessing), flag uncertain ones, and leave ~15 minutes to revisit flags.</p></div>
        </div>
      </div>
      ${hist.length ? `<div class="section"><h2>History</h2><div class="card">${historyTable(hist)}</div></div>` : ""}`;
    $$("[data-start]").forEach((b) => b.addEventListener("click", () => {
      if (store.get(EXAM_KEY, null) && !confirm("Discard the exam in progress and start a new one?")) return;
      if (b.dataset.start === "full") startExam({ mode: "full", title: "Full mock exam", n: 53, minutes: 120 });
      else startExam({ mode: "half", title: "Quick mock exam", n: 27, minutes: 60 });
    }));
    $("#discard")?.addEventListener("click", () => { store.del(EXAM_KEY); views.mock(); });
    $("#resetseen").addEventListener("click", () => { store.del("mockSeen"); toast("Mock rotation reset"); views.mock(); });
  };

  function historyTable(hist) {
    return `<div class="table-wrap" style="border:0;margin:0"><table><thead><tr><th>Date</th><th>Type</th><th>Correct</th><th>Scaled</th><th>Result</th><th>Time</th></tr></thead><tbody>
      ${hist.slice().reverse().map((m) => `<tr><td>${new Date(m.date).toLocaleString()}</td><td>${h(m.title)}</td><td>${m.correct}/${m.n} (${pct(m.p)}%)</td><td><b>${m.scaled}</b></td><td>${m.scaled >= 720 ? '<span class="chip chip-good">Pass</span>' : '<span class="chip chip-bad">Below 720</span>'}</td><td>${fmtTime(m.seconds)}</td></tr>`).join("")}
    </tbody></table></div>`;
  }

  views.diagnostic = () => {
    const last = store.get("mocks", []).filter((m) => m.mode === "diagnostic").pop();
    main.innerHTML = `
      <div class="eyebrow">Practice</div>
      <h1>Diagnostic Test</h1>
      <p class="lead">24 questions in 45 minutes, sampled across all 8 domains in proportion to the blueprint. Take it before you start studying to find your weak areas, then again halfway through.</p>
      <div class="card narrow" style="margin-top:20px">
        <ul>
          <li>Same item formats as the real exam (single answer and multiple response).</li>
          <li>No feedback until the end; then you get per-domain results and a list of skills to study first.</li>
          <li>Results feed your Progress Dashboard and the adaptive drill.</li>
        </ul>
        <button class="btn btn-primary" id="startdiag">Start diagnostic</button>
      </div>
      ${last ? `<p class="muted" style="margin-top:14px">Last diagnostic: ${new Date(last.date).toLocaleDateString()} — ${last.correct}/${last.n} (${pct(last.p)}%), estimated ${last.scaled}.</p>` : ""}`;
    $("#startdiag").addEventListener("click", () => {
      if (store.get(EXAM_KEY, null) && !confirm("Discard the exam in progress?")) return;
      startExam({ mode: "diagnostic", title: "Diagnostic test", n: 24, minutes: 45 });
    });
  };

  // ---------------------------------------------------------------- progress
  views.progress = () => {
    const st = skillStats();
    const r = readiness();
    const hist = store.get("mocks", []);
    const comp = getCompleted();
    const done = Object.keys(comp).filter((k) => comp[k]).length;
    const ans = getAnswers();
    const weak = SKILL_IDS.map((id) => ({ id, ...st[id] }))
      .map((x) => ({ ...x, need: SKILLS[x.id].weight * (1 - (x.acc == null ? 0 : x.acc)) * (x.seen ? 1 : 1.2) }))
      .sort((a, b) => b.need - a.need).slice(0, 6);
    main.innerHTML = `
      <div class="eyebrow">Study tools</div>
      <h1>Progress Dashboard</h1>
      <div class="grid grid-4" style="margin-top:16px">
        <div class="card stat"><div class="lbl">Readiness estimate</div><div class="num" style="color:${r.scaled >= 720 ? "var(--good)" : "var(--ink)"}">${r.scaled}</div><div class="muted" style="font-size:12.5px">Weighted by blueprint · ${pct(r.covered)}% of weight practiced</div></div>
        <div class="card stat"><div class="lbl">Lessons</div><div class="num">${done}/${ORDERED.length}</div></div>
        <div class="card stat"><div class="lbl">Unique questions answered</div><div class="num">${Object.keys(ans).length}/${D.questions.length}</div></div>
        <div class="card stat"><div class="lbl">Mocks taken</div><div class="num">${hist.filter((m) => m.mode !== "diagnostic").length}</div></div>
      </div>
      <div class="grid grid-2 section">
        <div class="card"><h3>Focus next</h3><p class="muted" style="font-size:14px">Ranked by exam weight × (1 − accuracy). Unpracticed skills rank high.</p>
          <ul class="skill-list">${weak.map((x) => `<li><span class="sid">${x.id}</span><a href="${lessonHref(x.id)}">${h(SKILLS[x.id].name)}</a><span class="w">${x.acc == null ? "not practiced" : pct(x.acc) + "%"}</span><a class="btn btn-sm" href="#/drill?skill=${x.id}">Drill</a></li>`).join("")}</ul>
        </div>
        <div class="card"><h3>Score trend</h3>${trendChart(hist)}</div>
      </div>
      <div class="section card"><h3>All skills</h3>
        <div class="table-wrap" style="border:0"><table class="skill-table"><thead><tr><th>Skill</th><th>Lesson</th><th>Weight</th><th>Practiced</th><th>Accuracy (last attempt)</th></tr></thead><tbody>
          ${DOMAINS.map((d) => `<tr><td colspan="5" style="background:var(--bg-sunk);font-weight:700;color:${DCOLOR(d.id)}">D${d.id} · ${h(d.name)} (${d.weight}%)</td></tr>` + d.skills.map((s) => { const x = st[s.id]; return `<tr><td><a href="${lessonHref(s.id)}">${s.id} ${h(s.name)}</a></td><td>${x.done ? "✓" : "—"}</td><td>${s.weight}%</td><td>${x.seen}/${x.total}</td><td>${x.acc == null ? "—" : pct(x.acc) + "%"}<span class="mini-bar"><span style="width:${(x.acc || 0) * 100}%;background:${x.acc >= 0.7 ? "var(--good)" : "var(--bad)"}"></span></span></td></tr>`; }).join("")).join("")}
        </tbody></table></div>
      </div>
      ${hist.length ? `<div class="section card"><h3>Exam history</h3>${historyTable(hist)}</div>` : ""}
      <div class="section card"><h3>Your data</h3><p class="muted">Progress is stored only in this browser (localStorage). Export it to back up or move to another device.</p>
        <div class="row"><button class="btn btn-sm" id="exp">Export progress</button><label class="btn btn-sm">Import progress<input type="file" id="imp" accept="application/json" hidden></label><button class="btn btn-sm" id="reset" style="color:var(--bad)">Reset all progress</button></div>
      </div>`;
    $("#exp").addEventListener("click", () => {
      const dump = {};
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(PFX)) dump[k] = localStorage.getItem(k); }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 1)], { type: "application/json" }));
      a.download = `ccdv-progress-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    });
    $("#imp").addEventListener("change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { const dump = JSON.parse(await f.text()); Object.entries(dump).forEach(([k, v]) => k.startsWith(PFX) && localStorage.setItem(k, v)); toast("Progress imported"); views.progress(); } catch { toast("Invalid file"); }
    });
    $("#reset").addEventListener("click", () => {
      if (!confirm("Reset ALL progress (lessons, answers, mocks, flashcards)? This cannot be undone.")) return;
      Object.keys(localStorage).filter((k) => k.startsWith(PFX)).forEach((k) => localStorage.removeItem(k));
      toast("Progress reset"); views.progress();
    });
  };

  function trendChart(hist) {
    if (!hist.length) return `<div class="empty">Take the diagnostic or a mock exam to see your trend.</div>`;
    const W = 520, H = 200, P = 30;
    const pts = hist.slice(-15);
    const x = (i) => P + (pts.length === 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (pts.length - 1));
    const y = (s) => H - P - ((s - 100) / 900) * (H - 2 * P);
    const line = pts.map((m, i) => `${i ? "L" : "M"}${x(i)},${y(m.scaled)}`).join(" ");
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Score trend">
      <line x1="${P}" x2="${W - P}" y1="${y(720)}" y2="${y(720)}" stroke="var(--good)" stroke-dasharray="4 4"/>
      <text x="${W - P}" y="${y(720) - 5}" text-anchor="end" font-size="11" fill="var(--good)">720 pass</text>
      <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
      ${pts.map((m, i) => `<circle cx="${x(i)}" cy="${y(m.scaled)}" r="4.5" fill="${m.mode === "diagnostic" ? "var(--info)" : "var(--accent)"}"><title>${h(m.title)}: ${m.scaled}</title></circle><text x="${x(i)}" y="${y(m.scaled) - 9}" text-anchor="middle" font-size="10.5" fill="var(--ink-2)">${m.scaled}</text>`).join("")}
    </svg><div class="legend"><span style="color:var(--accent)">● mock</span><span style="color:var(--info)">● diagnostic</span></div>`;
  }

  // ---------------------------------------------------------------- flashcards
  const BOX_DAYS = [0, 1, 3, 7, 16];
  views.flashcards = (params) => {
    const pre = params.get("skill");
    const cards = store.get("cards", {});
    const all = D.flashcards.concat(D.glossary.map((g, i) => ({ id: "g" + i, front: `<p><strong>${h(g.term)}</strong></p><p class="muted">Define this term.</p>`, back: `<p>${g.html}</p>`, skill: g.skill, gloss: true })));
    const boxes = [0, 0, 0, 0, 0];
    D.flashcards.forEach((c) => boxes[(cards[c.id]?.box || 1) - 1]++);
    main.innerHTML = `
      <div class="eyebrow">Study tools</div>
      <h1>Flashcards</h1>
      <p class="lead">Spaced repetition (Leitner system) for the facts, numbers and distinctions the exam loves to test. Cards you know move up a box and come back later; cards you miss return to box 1.</p>
      <div class="card narrow" style="margin-top:18px">
        <div class="leitner">${boxes.map((n, i) => `<div><b>${n}</b>Box ${i + 1}<br><small>${BOX_DAYS[i] ? "every " + BOX_DAYS[i] + "d" : "daily"}</small></div>`).join("")}</div>
        <div class="field" style="margin-top:16px"><span>Deck</span>
          <select id="deck">
            <option value="due">Due today — core deck (${dueCards(D.flashcards, cards).length})</option>
            <option value="all">All core cards (${D.flashcards.length})</option>
            ${DOMAINS.map((d) => `<option value="d${d.id}">Domain ${d.id}: ${h(d.name)}</option>`).join("")}
            ${SKILL_IDS.map((id) => `<option value="s${id}" ${pre === id ? "selected" : ""}>Skill ${id}: ${h(SKILLS[id].name)}</option>`).join("")}
            <option value="gloss">Glossary terms (${D.glossary.length})</option>
          </select>
        </div>
        <button class="btn btn-primary" id="startfc">Start session</button>
      </div>`;
    $("#startfc").addEventListener("click", () => {
      const v = $("#deck").value;
      let list;
      if (v === "due") list = dueCards(D.flashcards, cards);
      else if (v === "all") list = D.flashcards;
      else if (v === "gloss") list = all.filter((c) => c.gloss);
      else if (v.startsWith("d")) list = all.filter((c) => c.skill && SKILLS[c.skill]?.domain.id == v.slice(1));
      else list = all.filter((c) => c.skill === v.slice(1));
      if (!list.length) { toast("No cards in this deck right now."); return; }
      runCards(shuffle(list));
    });
  };
  function dueCards(list, cards) { const now = Date.now(); return list.filter((c) => !cards[c.id] || cards[c.id].due <= now); }
  function runCards(list) {
    let i = 0, known = 0;
    function step() {
      if (i >= list.length) {
        main.innerHTML = `<div class="narrow"><div class="eyebrow">Session complete</div><h1>${known} / ${list.length} known</h1><div class="row"><a class="btn btn-primary" href="#/flashcards">Back to decks</a><a class="btn" href="#/drill">Drill questions</a></div></div>`;
        return;
      }
      const c = list[i];
      main.innerHTML = `
        <div class="row narrow" style="margin:0 auto 12px"><div class="eyebrow">Card ${i + 1} / ${list.length}</div><span class="spacer"></span>${c.skill ? `<a class="chip" href="${lessonHref(c.skill)}">${c.skill} ${h(SKILLS[c.skill]?.name || "")}</a>` : ""}<a class="btn btn-sm" href="#/flashcards">End</a></div>
        <div class="flashcard" id="fc"><div class="flashcard-inner">
          <div class="flashcard-face front"><span class="side-lbl">Question · click or press Space to flip</span>${c.front}</div>
          <div class="flashcard-face back"><span class="side-lbl">Answer</span>${c.back}</div>
        </div></div>
        <div class="row" style="justify-content:center;margin-top:18px">
          <button class="btn" id="no">✗ Didn't know <span class="kbd">1</span></button>
          <button class="btn btn-primary" id="yes">✓ Knew it <span class="kbd">2</span></button>
        </div>`;
      const fc = $("#fc");
      fc.addEventListener("click", () => fc.classList.toggle("flipped"));
      const rate = (ok) => {
        const cards = store.get("cards", {});
        const cur = cards[c.id] || { box: 1 };
        const box = ok ? Math.min(5, cur.box + 1) : 1;
        cards[c.id] = { box, due: Date.now() + BOX_DAYS[box - 1] * 864e5 };
        store.set("cards", cards);
        if (ok) known++;
        i++; step();
      };
      $("#no").addEventListener("click", () => rate(false));
      $("#yes").addEventListener("click", () => rate(true));
    }
    const onKey = (e) => {
      if (!$("#fc")) { document.removeEventListener("keydown", onKey); return; }
      if (e.key === " ") { e.preventDefault(); $("#fc").classList.toggle("flipped"); }
      if (e.key === "1") $("#no").click();
      if (e.key === "2") $("#yes").click();
    };
    document.addEventListener("keydown", onKey);
    step();
  }

  // ---------------------------------------------------------------- pages
  function pageView(key, eyebrow) {
    const p = D.pages[key];
    if (!p) return views.notfound();
    main.innerHTML = `
      <div class="lesson-layout">
        <article>
          <div class="eyebrow">${eyebrow}</div>
          <h1>${h(p.title)}</h1>
          ${p.summary ? `<p class="lead">${h(p.summary)}</p>` : ""}
          <div class="prose">${p.html}</div>
        </article>
        <aside class="toc"><h4>On this page</h4>${p.headings.map((x) => `<a href="#" data-target="${x.id}">${h(x.text)}</a>`).join("")}</aside>
      </div>`;
    hydrate(main);
    $$(".toc a[data-target]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); document.getElementById(a.dataset.target)?.scrollIntoView({ behavior: "smooth" }); }));
  }
  views.reference = () => pageView("quick-reference", "Look up");
  views.plan = () => pageView("study-plan", "Study tools");
  views.guide = () => {
    pageView("exam-guide", "Look up");
    const ex = BP.exam;
    const facts = `<div class="table-wrap"><table><tbody>
      ${[["Credential", ex.name], ["Exam code", ex.code], ["Number of items", ex.items], ["Item format", ex.format], ["Time limit", ex.minutes + " minutes"], ["Delivery", ex.delivery], ["Passing score", ex.passing], ["Exam fee", ex.fee], ["Validity", ex.validity], ["Result reporting", ex.reporting], ["Retakes", ex.retakes], ["Renewal", ex.renewal]].map(([k, v]) => `<tr><th style="width:200px">${k}</th><td>${h(v)}</td></tr>`).join("")}
    </tbody></table></div>
    <h2 id="blueprint-weights">Blueprint weights</h2>
    ${DOMAINS.map((d) => `<h3>Domain ${d.id}: ${h(d.name)} (${d.weight}%)</h3><div class="table-wrap"><table><thead><tr><th>Skill</th><th style="width:80px">Weight</th><th>What is measured</th></tr></thead><tbody>${d.skills.map((s) => `<tr><td><a href="${lessonHref(s.id)}">${s.id} ${h(s.name)}</a></td><td>${s.weight}%</td><td>${h(s.guide)}</td></tr>`).join("")}</tbody></table></div>`).join("")}`;
    const slot = $("#exam-facts-slot");
    if (slot) slot.outerHTML = facts;
  };

  views.exercises = () => {
    main.innerHTML = `
      <div class="eyebrow">Practice</div>
      <h1>Build Exercises</h1>
      <p class="lead">The Exam Guide recommends building and operating at least one Claude application that exercises the API, integrates tools, applies prompt and context engineering, and includes simple security and evaluation practices. Every lesson ends with a hands-on exercise; together they form that application.</p>
      <div class="callout callout-tip"><div class="callout-label">Reference solutions</div><div class="callout-body"><p>The repository folder <code>exercises/</code> contains tested reference implementations for the core exercises — agent loop (1.2/8.1), retry strategy (4.1), cost model (5.4), guardrail hook (7.3) and MCP server (8.2). Run <code>python exercises/test_solutions.py</code> (offline, no API key) to verify them.</p></div></div>
      <div class="grid grid-2" style="margin-top:20px">
        ${ORDERED.map((l) => {
          const tmp = document.createElement("div");
          tmp.innerHTML = l.html;
          const ex = tmp.querySelector(".callout-exercise");
          const title = ex ? ex.querySelector(".callout-title")?.textContent : null;
          if (!title) return "";
          const steps = ex.querySelectorAll("ol > li").length;
          return `<a class="card" href="${lessonHref(l.skill)}#exercise"><div class="row"><span class="eyebrow">Skill ${l.skill}</span><span class="spacer"></span><span class="chip">${steps} steps</span></div><h3 style="margin:.4em 0">${h(title)}</h3><p class="muted" style="margin:0;font-size:14px">${h(SKILLS[l.skill].name)}</p></a>`;
        }).join("")}
      </div>`;
  };

  views.glossary = (params) => {
    const g = D.glossary.slice().sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" }));
    main.innerHTML = `
      <div class="eyebrow">Look up</div>
      <h1>Glossary</h1>
      <p class="lead">${g.length} terms from the Claude API, Agent SDK, Claude Code, MCP, LLM fundamentals and application security.</p>
      <input type="search" class="big" id="gq" placeholder="Filter terms…" style="width:100%;max-width:520px;margin:10px 0 6px" value="${h(params.get("q") || "")}">
      <div id="glist" class="narrow"></div>`;
    function draw() {
      const q = $("#gq").value.trim().toLowerCase();
      const items = g.filter((x) => !q || x.term.toLowerCase().includes(q) || x.text.toLowerCase().includes(q));
      let letter = "";
      $("#glist").innerHTML = items.map((x) => {
        const L = /[a-z]/i.test(x.term[0]) ? x.term[0].toUpperCase() : "#";
        const head = L !== letter && !q ? `<div class="gloss-letter">${(letter = L)}</div>` : "";
        return `${head}<dl class="gloss-item"><dt>${h(x.term)} ${x.skill ? `<a class="chip" href="${lessonHref(x.skill)}">${x.skill}</a>` : ""}</dt><dd>${x.html}</dd></dl>`;
      }).join("") || `<div class="empty">No terms match.</div>`;
    }
    $("#gq").addEventListener("input", draw);
    draw();
  };

  views.search = (params) => {
    const q0 = params.get("q") || "";
    main.innerHTML = `
      <div class="eyebrow">Look up</div><h1>Search</h1>
      <input type="search" class="big" id="sq" placeholder="e.g. cache_control, stop_reason, exit code 2, stdio" style="width:100%;max-width:640px" value="${h(q0)}">
      <div id="sres" class="narrow" style="margin-top:14px"></div>`;
    function run() {
      const q = $("#sq").value.trim();
      const box = $("#sres");
      if (q.length < 2) { box.innerHTML = `<p class="muted">Type at least two characters.</p>`; return; }
      const ql = q.toLowerCase();
      const hits = [];
      const snippet = (text) => {
        const i = text.toLowerCase().indexOf(ql);
        if (i < 0) return h(text.slice(0, 160)) + "…";
        const s = Math.max(0, i - 80);
        return (s ? "…" : "") + h(text.slice(s, i)) + "<mark>" + h(text.slice(i, i + q.length)) + "</mark>" + h(text.slice(i + q.length, i + q.length + 120)) + "…";
      };
      D.lessons.forEach((l) => {
        const t = l.text.toLowerCase();
        let n = 0, k = -1;
        while ((k = t.indexOf(ql, k + 1)) >= 0) n++;
        if (l.title.toLowerCase().includes(ql)) n += 20;
        if (n) hits.push({ score: n, html: `<div class="search-hit"><span class="chip">Lesson ${l.skill}</span> <a href="${lessonHref(l.skill)}">${h(l.title)}</a><p>${snippet(l.text)}</p></div>` });
      });
      D.glossary.forEach((g) => {
        const n = (g.term.toLowerCase().includes(ql) ? 15 : 0) + (g.text.toLowerCase().includes(ql) ? 3 : 0);
        if (n) hits.push({ score: n, html: `<div class="search-hit"><span class="chip">Glossary</span> <a href="#/glossary?q=${encodeURIComponent(g.term)}">${h(g.term)}</a><p>${g.html}</p></div>` });
      });
      Object.entries(D.pages).forEach(([k, p]) => {
        const tmp = document.createElement("div"); tmp.innerHTML = p.html;
        const text = tmp.textContent;
        const n = text.toLowerCase().split(ql).length - 1;
        const route = { "quick-reference": "#/reference", "study-plan": "#/plan", "exam-guide": "#/guide" }[k];
        if (n && route) hits.push({ score: n, html: `<div class="search-hit"><span class="chip">${h(p.title)}</span> <a href="${route}">${h(p.title)}</a><p>${snippet(text)}</p></div>` });
      });
      hits.sort((a, b) => b.score - a.score);
      box.innerHTML = hits.length ? hits.slice(0, 40).map((x) => x.html).join("") : `<div class="empty">No results for “${h(q)}”.</div>`;
    }
    $("#sq").addEventListener("input", run);
    run();
    $("#sq").focus();
  };

  views.notfound = () => { main.innerHTML = `<h1>Not found</h1><p><a href="#/">Back to the start page</a></p>`; };

  // ------------------------------------------------------------------ router
  function route() {
    if (window.__cleanup) { window.__cleanup(); window.__cleanup = null; }
    const raw = location.hash.replace(/^#\/?/, "");
    const [path, qs] = raw.split("?");
    const params = new URLSearchParams(qs || "");
    const parts = path.split("/").filter(Boolean);
    closeMenus();
    const anchor = parts[0] === "learn" && parts.length === 3 && location.hash.includes("#exercise");
    switch (parts[0]) {
      case undefined: views.home(); break;
      case "learn":
        if (parts.length === 1) views.learn();
        else if (parts.length === 2) views.domain(parts[1]);
        else views.lesson(parts[1], parts[2].replace(/#.*$/, ""));
        break;
      case "drill": views.drill(params); break;
      case "mock": views.mock(); break;
      case "exam": views.exam(); break;
      case "results": views.results(); break;
      case "diagnostic": views.diagnostic(); break;
      case "progress": views.progress(); break;
      case "flashcards": views.flashcards(params); break;
      case "reference": views.reference(); break;
      case "glossary": views.glossary(params); break;
      case "guide": views.guide(); break;
      case "plan": views.plan(); break;
      case "exercises": views.exercises(); break;
      case "search": views.search(params); break;
      default: views.notfound();
    }
    if (anchor) setTimeout(() => $(".callout-exercise")?.scrollIntoView({ behavior: "smooth" }), 50);
    else window.scrollTo(0, 0);
    const t = $("h1", main);
    document.title = (t ? t.textContent.trim() + " · " : "") + "CCDV-F Study Guide";
  }

  // ------------------------------------------------------------------ chrome
  function closeMenus() { $$(".nav-group").forEach((g) => g.classList.remove("open")); $(".main-nav").classList.remove("open"); }
  $("#nav-curriculum").innerHTML = `<a href="#/learn" style="grid-column:1/-1"><b>All domains & lessons</b><span>8 domains · 25 weighted skills</span></a>` +
    DOMAINS.map((d) => `<a href="#/learn/${d.slug}" class="nav-dom"><span class="dot" style="background:${DCOLOR(d.id)}"></span><span><b>D${d.id} · ${h(d.name)}</b><span>${d.weight}% · ${d.skills.length} skill${d.skills.length > 1 ? "s" : ""}</span></span></a>`).join("");
  $$(".nav-trigger").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const g = b.parentElement, was = g.classList.contains("open");
    $$(".nav-group").forEach((x) => x.classList.remove("open"));
    if (!was) g.classList.add("open");
  }));
  document.addEventListener("click", (e) => { if (!e.target.closest(".nav-group")) $$(".nav-group").forEach((g) => g.classList.remove("open")); });
  $(".menu-toggle").addEventListener("click", () => $(".main-nav").classList.toggle("open"));
  $(".header-search").addEventListener("submit", (e) => { e.preventDefault(); const v = $(".header-search input").value; location.hash = "#/search?q=" + encodeURIComponent(v); });
  const theme = store.get("theme", null);
  if (theme) document.documentElement.dataset.theme = theme;
  $(".theme-toggle").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("theme", next);
  });
  window.addEventListener("hashchange", route);
  route();
})();
