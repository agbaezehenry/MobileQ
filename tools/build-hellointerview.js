#!/usr/bin/env node
/* Turn hellointerview-questions/ into questions-hellointerview.js.
   ────────────────────────────────────────────────────────────────────────────
   Not part of the app. Chalkboard has no build step and still doesn't: the deck
   it writes is committed and loaded as plain JS. This exists so the deck can be
   regenerated when the source bank changes, rather than being hand-edited into
   drift.

     node tools/build-hellointerview.js

   The source bank is 1111 questions in three shapes; each maps onto one of the
   app's own (see the header of questions.js):

     scenario    → a written card. The bank's questions are already "what would
                   you do and why", which is what a written card is for. They
                   ship no keyPoints, which is fine — the grader reads its
                   checklist out of the reference answer when a card has none.
     true_false  → a two-choice card, True on the left and False on the right.
     mcq2        → a two-choice card, the bank's two options as the two sides.

   Topic strings are "folder · subsection", so the folder is what the chip row
   picks up as a family and the subsection is the sub-topic under it. Ids are
   prefixed hi- : they key FSRS review state forever, so they have to be unique
   against the metrics deck and stay stable across regenerations.
   ────────────────────────────────────────────────────────────────────────────*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'hellointerview-questions');
const OUT = path.join(ROOT, 'questions-hellointerview.js');

/* Folder slugs read well as families already ("core-concepts"); subsection
   slugs read better with the hyphens out ("api design", "cap theorem"). */
const readable = (slug) => String(slug).replace(/-/g, ' ');

/* Everything after the prefix, once the em-dash joining it to the prefix is
   gone. Falls back to the whole string if the shape is not what we expect, so
   a stray answer loses its formatting rather than its content.

   The bank writes these as one sentence — "GET, PUT, DELETE — these are
   idempotent…" — so the tail starts mid-sentence and lowercase. On the verdict
   sheet it is a paragraph of its own, where a lowercase opening reads as a
   typo, so it gets a capital. Only when the first word is plain letters: a
   `search_after` or a `p99` would be wrong to touch, and the bank has none
   today but will not stay that way. */
function reasonAfter(answer, prefix) {
  if (!answer.startsWith(prefix)) return answer;
  const rest = answer.slice(prefix.length).replace(/^\s*[—–-]\s*/, '').trim();
  if (!rest) return answer;
  return /^[a-z]+\b/.test(rest) ? rest[0].toUpperCase() + rest.slice(1) : rest;
}

function convert(q, family, sub) {
  const base = {
    id: 'hi-' + q.id,
    topic: family + ' · ' + sub,
  };

  if (q.type === 'true_false') {
    const yes = /^True\b/.test(q.answer);
    return Object.assign(base, {
      type: 'two-choice',
      question: q.question,
      optionA: 'True',
      optionB: 'False',
      correct: yes ? 'A' : 'B',
      explanation: reasonAfter(q.answer, yes ? 'True' : 'False'),
    });
  }

  if (q.type === 'mcq2') {
    const opts = q.options || [];
    const hit = opts.findIndex((o) => q.answer.startsWith(o));
    if (opts.length !== 2 || hit < 0) throw new Error('mcq2 ' + q.id + ': cannot tell which option is right');
    return Object.assign(base, {
      type: 'two-choice',
      question: q.question,
      optionA: opts[0],
      optionB: opts[1],
      correct: hit === 0 ? 'A' : 'B',
      explanation: reasonAfter(q.answer, opts[hit]),
    });
  }

  // scenario, and anything else the bank grows later
  return Object.assign(base, {
    type: 'open',
    question: q.question,
    answer: q.answer,
    // The bank's `concept` is a one-line statement of what the card is testing.
    // It is the closest thing it has to the metrics deck's explanation, and it
    // is worth showing: the model answer says what, this says why it was asked.
    explanation: q.concept || '',
  });
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
  const out = [];
  const report = [];

  for (const [family, subsections] of Object.entries(manifest.sections)) {
    for (const entry of subsections) {
      const file = JSON.parse(fs.readFileSync(path.join(SRC, entry.file), 'utf8'));
      const sub = readable(path.basename(entry.file, '.json'));
      const cards = file.questions.map((q) => convert(q, family, sub));
      out.push(...cards);
      report.push({ family, sub, n: cards.length });
    }
  }

  const seen = new Set();
  for (const c of out) {
    if (seen.has(c.id)) throw new Error('duplicate id: ' + c.id);
    seen.add(c.id);
  }

  const header = [
    '/* ==========================================================================',
    '   Chalkboard — the Hello Interview system-design bank.',
    '',
    '   GENERATED. Edit hellointerview-questions/ and re-run:',
    '       node tools/build-hellointerview.js',
    '   Hand edits here are lost on the next run.',
    '',
    '   Source: https://www.hellointerview.com/learn/system-design',
    '   ' + out.length + ' cards across ' + report.length + ' subsections.',
    '',
    '   Appends to the deck questions.js started, so index.html loads that first.',
    '   Card shapes and the topic convention are documented in questions.js.',
    '   ========================================================================== */',
    'window.QUESTIONS = (window.QUESTIONS || []).concat([',
  ].join('\n');

  const body = out.map((c) => '  ' + JSON.stringify(c)).join(',\n');
  fs.writeFileSync(OUT, header + '\n' + body + '\n]);\n');

  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log('wrote ' + path.relative(ROOT, OUT) + ' — ' + out.length + ' cards, ' + kb + ' KB');
  let family = null;
  for (const r of report) {
    if (r.family !== family) { family = r.family; console.log('\n  ' + family); }
    console.log('    ' + r.sub.padEnd(28) + String(r.n).padStart(4));
  }
}

main();
