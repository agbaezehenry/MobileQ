/* =============================================================================
   app.js — deck logic and the swipe gesture.

   Flow:
     start screen → card stack → verdict sheet (per card) → summary → restart

   Gesture model:
     · pointerdown  records the origin
     · pointermove  moves the card under the finger and lights the matching rail
     · pointerup    commits if past threshold (or thrown fast enough), else snaps back
     · left  = option A      right = option B      up = skip
   ============================================================================= */

(function () {
  'use strict';

  /* ---- constants -------------------------------------------------------- */
  var AXIS_LOCK   = 8;    // px of movement before we decide horizontal vs vertical
  var THRESH_Y    = 110;  // px upward to count as a skip
  var FLICK_SPEED = 0.55; // px/ms — a fast throw commits below the distance threshold
  var ROTATE_MAX  = 14;   // degrees of tilt at full drag

  /* Relearning steps, in minutes. A card you miss comes back after the first
     step; get it right and it moves to the second; get it right there and it
     graduates to FSRS's long-term schedule. Miss it again at any point and it
     drops back to the first step. This is the active-recall loop, and it is
     deliberately in front of FSRS rather than part of it — see fsrs.js. */
  var RELEARN_STEPS = [2, 10];

  /* A card you keep missing stops resurfacing after this many misses in one
     sitting. Without it a card you simply do not know yet can trap the queue. */
  var MAX_SESSION_MISSES = 3;

  /* Fast mode holds the correct card on screen just long enough for it to fly
     off and the tick to register, then deals the next one. */
  var FAST_ADVANCE_MS = 300;

  var MODE_LS = 'metric-board.mode';

  /* ---- element handles -------------------------------------------------- */
  var $ = function (id) { return document.getElementById(id); };

  var screens = {
    start:   $('screen-start'),
    quiz:    $('screen-quiz'),
    summary: $('screen-summary')
  };
  var stage      = $('stage');
  var railA      = $('rail-a'),  railB      = $('rail-b');
  var railAText  = $('rail-a-text'), railBText = $('rail-b-text');
  var btnAText   = $('btn-a-text'),  btnBText = $('btn-b-text');
  var verdict    = $('verdict');
  var flash      = $('flash');
  var backBtn    = $('btn-back');

  /* ---- state ------------------------------------------------------------ */
  /* The deck is no longer a flat list with a cursor. Two queues feed the stage:
     `main` is fresh material in deck order, `pending` is cards waiting to come
     back round. Whichever is ripe wins — see chooseNext(). */
  var main    = [];   // questions not yet seen this session
  var pending = [];   // [{ q, dueAt }] — missed cards, waiting out their step
  var current = null; // the question on screen
  var shownAt = 0;    // when it went up, for grading by hesitation
  var repeat  = false;// the card on screen came back round rather than being new
  var lastServed = null;

  var sess    = {};   // per-card session state, by id: { misses, step, parked }
  var history = [];   // [{ q, v, choice, ms, due }] — every card committed, in order
  var done    = 0;

  var histPos     = null;  // index into history while looking back; null when live
  var liveVerdict = null;  // the sheet's live contents, parked while looking back
  var pendingAdvance = false;

  var mode    = 'slow';
  var topCard = null; // DOM node of the interactive card
  var locked  = false;// true while a card is flying off or a sheet is up

  /* ---- helpers ---------------------------------------------------------- */
  function show(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle('is-hidden', k !== name);
    });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* Horizontal commit distance: whichever is larger of 100px and a quarter of
     the card, so it feels the same on a phone and on a wide desktop window. */
  function threshX() {
    return Math.max(100, (stage.clientWidth || 320) * 0.25);
  }

  /* ---- card construction ------------------------------------------------ */
  function buildCard(q) {
    var el = document.createElement('article');
    el.className = 'card';
    el.innerHTML =
      '<div class="card__wash card__wash--a"></div>' +
      '<div class="card__wash card__wash--b"></div>' +
      '<div class="card__wash card__wash--skip"></div>' +
      '<p class="card__tag">' + esc(q.topic) + '</p>' +
      '<h2 class="card__q">' + esc(q.question) + '</h2>' +
      '<div class="card__spacer"></div>' +
      '<div class="card__opts">' +
        '<div class="card__opt card__opt--a"><b>← ' + esc(q.optionA) + '</b></div>' +
        '<div class="card__opt card__opt--b"><b>' + esc(q.optionB) + ' →</b></div>' +
      '</div>';

    el.washA    = el.querySelector('.card__wash--a');
    el.washB    = el.querySelector('.card__wash--b');
    el.washSkip = el.querySelector('.card__wash--skip');
    return el;
  }

  /* Rebuild the visible stack: the live card plus one dimmed card behind it. */
  function renderStack() {
    stage.innerHTML = '';
    topCard = null;
    if (!current) return;

    var behind = peekNext();
    if (behind) {
      var b = buildCard(behind);
      b.classList.add('card--behind');
      stage.appendChild(b);
    }

    var card = buildCard(current);
    topCard = card;
    card.classList.add('card--top', 'card--animate');
    stage.appendChild(card);

    // Deal-in: start slightly low and faded, then settle. Settle on the local
    // handle, not on topCard — an answer committed inside these two frames
    // clears topCard, and in fast mode that is a realistic amount of time.
    card.style.transform = 'translate3d(0, 22px, 0) scale(0.97)';
    card.style.opacity = '0';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (!card.isConnected) return;
        card.style.transform = 'translate3d(0,0,0)';
        card.style.opacity = '1';
      });
    });

    attachGesture(card);
    updateChrome();
  }

  /* Rails, tap-button labels, progress bar, counters.
     The totals move as you go: every miss adds a card back into the run, so
     the denominator is honest rather than the deck length you started with. */
  function updateChrome() {
    if (current) {
      railAText.textContent = '← ' + current.optionA;
      railBText.textContent = current.optionB + ' →';
      btnAText.textContent  = current.optionA;
      btnBText.textContent  = current.optionB;
    }

    var live  = current ? 1 : 0;
    var total = done + main.length + pending.length + live;

    // A card that came back round is labelled, so a repeat never reads as a
    // card you have not seen. The position keeps counting either way.
    $('counter').textContent = (repeat && current ? 'recall · ' : '') +
                               (done + live) + ' / ' + total;

    var badge = $('recall-badge');
    badge.classList.toggle('is-hidden', !pending.length);
    badge.innerHTML = '&#8634;&nbsp;' + pending.length;

    var right = history.filter(function (r) { return r.v === 'right'; }).length;
    $('tally').innerHTML = right + ' &#10003;';
    $('progress-fill').style.width = (total ? done / total * 100 : 0) + '%';

    backBtn.disabled = history.length === 0;
  }

  /* ---- gesture ---------------------------------------------------------- */
  function attachGesture(card) {
    var startX = 0, startY = 0, startT = 0;
    var lastX  = 0, lastT  = 0;
    var dragging = false, axis = null, pid = null;

    function point(e) {
      if (e.touches && e.touches.length) return e.touches[0];
      if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0];
      return e;
    }

    function down(e) {
      if (locked) return;
      var p = point(e);
      dragging = true; axis = null;
      startX = lastX = p.clientX;
      startY = p.clientY;
      startT = lastT = Date.now();
      pid = e.pointerId;
      card.classList.remove('card--animate');
      if (card.setPointerCapture && pid !== undefined) {
        try { card.setPointerCapture(pid); } catch (err) { /* non-fatal */ }
      }
    }

    function move(e) {
      if (!dragging || locked) return;
      var p  = point(e);
      var dx = p.clientX - startX;
      var dy = p.clientY - startY;

      // Lock to one axis once the finger has clearly moved, so a slightly
      // diagonal swipe doesn't read as both an answer and a skip.
      if (!axis && Math.abs(dx) + Math.abs(dy) > AXIS_LOCK) {
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (e.cancelable) e.preventDefault();

      lastX = p.clientX; lastT = Date.now();

      if (axis === 'y') {
        var up = Math.min(0, dy);                 // upward only; downward resists
        var pSkip = clamp(-up / THRESH_Y, 0, 1);
        card.style.transform = 'translate3d(0,' + up + 'px,0) scale(' + (1 - pSkip * 0.04) + ')';
        card.washSkip.style.opacity = pSkip * 0.34;
        card.washA.style.opacity = card.washB.style.opacity = 0;
        railA.classList.remove('is-lit'); railB.classList.remove('is-lit');
      } else {
        var pX = clamp(dx / threshX(), -1, 1);
        card.style.transform =
          'translate3d(' + dx + 'px,' + (Math.abs(dx) * 0.045) + 'px,0) rotate(' +
          (pX * ROTATE_MAX) + 'deg)';
        card.washA.style.opacity = dx < 0 ? Math.abs(pX) * 0.36 : 0;
        card.washB.style.opacity = dx > 0 ? Math.abs(pX) * 0.36 : 0;
        card.washSkip.style.opacity = 0;
        railA.classList.toggle('is-lit', dx < -18);
        railB.classList.toggle('is-lit', dx >  18);
      }
    }

    function up(e) {
      if (!dragging) return;
      dragging = false;
      card.classList.add('card--animate');
      railA.classList.remove('is-lit');
      railB.classList.remove('is-lit');

      var p  = point(e);
      var dx = p.clientX - startX;
      var dy = p.clientY - startY;
      var dt = Math.max(1, Date.now() - startT);
      var speed = Math.abs(dx) / dt;

      if (axis === 'y' && -dy > THRESH_Y) { commit('skip'); return; }
      if (axis === 'x' && (Math.abs(dx) > threshX() ||
                           (speed > FLICK_SPEED && Math.abs(dx) > 45))) {
        commit(dx < 0 ? 'A' : 'B');
        return;
      }
      snapBack(card);
    }

    if (window.PointerEvent) {
      card.addEventListener('pointerdown',   down);
      card.addEventListener('pointermove',   move);
      card.addEventListener('pointerup',     up);
      card.addEventListener('pointercancel', up);
    } else {
      // Touch fallback for older mobile Safari / Android browsers.
      card.addEventListener('touchstart',  down, { passive: true });
      card.addEventListener('touchmove',   move, { passive: false });
      card.addEventListener('touchend',    up);
      card.addEventListener('touchcancel', up);
    }
  }

  function snapBack(card) {
    card.style.transform = 'translate3d(0,0,0) rotate(0deg)';
    card.washA.style.opacity = card.washB.style.opacity = card.washSkip.style.opacity = 0;
  }

  /* =========================================================================
     THE QUEUE

     Two sources feed the stage. `main` is the deck as dealt; `pending` holds
     cards that were missed and are waiting out a relearning step. A pending
     card whose clock is up always jumps the queue — that is what makes the
     recall active rather than a second pass at the end.

     When `main` runs dry the run enters its drain phase: the remaining pending
     cards are served early rather than making you sit out the clock, oldest
     due first, never the card that was just on screen if there is any choice.
     ========================================================================= */
  /* Returns { q, repeat } — repeat marks a card that came back off the pending
     queue rather than being dealt fresh. */
  function chooseNext(consume) {
    var now  = Date.now();
    var ripe = -1;
    for (var i = 0; i < pending.length; i++) {
      if (pending[i].dueAt <= now && (ripe < 0 || pending[i].dueAt < pending[ripe].dueAt)) ripe = i;
    }
    if (ripe >= 0) {
      return { q: consume ? pending.splice(ripe, 1)[0].q : pending[ripe].q, repeat: true };
    }

    if (main.length) return { q: consume ? main.shift() : main[0], repeat: false };

    if (pending.length) {
      var order = pending.map(function (_, i) { return i; }).sort(function (a, b) {
        return pending[a].dueAt - pending[b].dueAt;
      });
      var pick = order[0];
      if (order.length > 1 && pending[pick].q.id === lastServed) pick = order[1];
      return { q: consume ? pending.splice(pick, 1)[0].q : pending[pick].q, repeat: true };
    }
    return null;
  }

  function peekNext() {
    var n = chooseNext(false);
    return n && n.q;
  }

  function advance() {
    liveVerdict = null;
    verdict.classList.add('is-hidden');

    var n = chooseNext(true);
    if (!n) { current = null; repeat = false; finish(); return; }

    lastServed = n.q.id;
    current = n.q;
    repeat  = n.repeat;
    shownAt = Date.now();
    renderStack();
  }

  /* ---- grading ------------------------------------------------------------
     FSRS wants one of four grades, and this deck only ever collects one bit of
     information. Hesitation supplies the rest: a swipe you did not have to
     think about is Easy, one you sat on is Hard. Both are honest signals about
     how well the card is actually known. */
  function gradeFor(ms) {
    if (ms < 4500)  return 4;   // Easy
    if (ms > 15000) return 2;   // Hard
    return 3;                   // Good
  }

  /* Record the review with FSRS, then decide whether the card comes back this
     session. Returns minutes until it resurfaces, 0 if it is done for now, or
     -1 if it has been parked after too many misses. */
  function schedule(q, v, grade) {
    var now = Date.now();
    FSRS.set(q.id, FSRS.review(FSRS.get(q.id), grade, now));

    var s = sess[q.id] || (sess[q.id] = { misses: 0, step: -1, parked: false });
    if (s.parked) return -1;

    if (v === 'right') {
      if (s.step < 0) return 0;                 // never missed — nothing to redo
      s.step += 1;
      if (s.step >= RELEARN_STEPS.length) { s.step = -1; return 0; }
    } else {
      s.misses += 1;
      if (s.misses > MAX_SESSION_MISSES) { s.parked = true; s.step = -1; return -1; }
      s.step = 0;
    }

    var mins = RELEARN_STEPS[s.step];
    pending.push({ q: q, dueAt: now + mins * 60000 });
    return mins;
  }

  /* ---- commit an answer -------------------------------------------------- */
  /* choice is 'A', 'B' or 'skip'. Animates the card away, grades it, queues any
     repeat, then either raises the verdict sheet or — in fast mode on a correct
     answer — flashes a tick and deals the next card. */
  function commit(choice) {
    if (locked || !topCard || !current || histPos !== null) return;
    locked = true;

    var q = current;
    var isSkip = choice === 'skip';
    var v = isSkip ? 'skip' : (choice === q.correct ? 'right' : 'wrong');
    var ms = Date.now() - shownAt;
    var due = schedule(q, v, v === 'right' ? gradeFor(ms) : 1);

    history.push({ q: q, v: v, choice: isSkip ? null : choice, ms: ms, due: due });
    done += 1;

    // Fly off in the committed direction.
    var card = topCard;
    card.classList.remove('card--animate');
    card.classList.add('card--fly');
    var w = window.innerWidth, h = window.innerHeight;
    if (isSkip) {
      card.style.transform = 'translate3d(0,' + (-h * 1.1) + 'px,0) scale(0.9)';
      card.washSkip.style.opacity = 0.34;
    } else if (choice === 'A') {
      card.style.transform = 'translate3d(' + (-w * 1.3) + 'px,40px,0) rotate(-22deg)';
      card.washA.style.opacity = 0.36;
    } else {
      card.style.transform = 'translate3d(' + (w * 1.3) + 'px,40px,0) rotate(22deg)';
      card.washB.style.opacity = 0.36;
    }
    card.style.opacity = '0';
    topCard = null;
    current = null;
    updateChrome();

    if (mode === 'fast' && v === 'right') {
      flashTick();
      pendingAdvance = true;
      window.setTimeout(function () {
        if (!pendingAdvance) return;
        if (histPos !== null) return;    // paged back mid-flight; resume will deal
        pendingAdvance = false;
        locked = false;
        advance();
      }, FAST_ADVANCE_MS);
      return;
    }

    liveVerdict = history[history.length - 1];
    renderVerdict(liveVerdict, null);
  }

  /* Fast mode's whole feedback budget for a correct answer. */
  function flashTick() {
    flash.classList.remove('is-on');
    void flash.offsetWidth;              // force a reflow so the animation restarts
    flash.classList.add('is-on');
    window.setTimeout(function () { flash.classList.remove('is-on'); }, 520);
  }

  /* ---- verdict sheet ------------------------------------------------------
     One sheet, two jobs. Live (`hist` null) it reports the card you just
     committed. In look-back mode it replays an earlier one, read-only, with
     ◂ ▸ to page and Resume to drop back where you were. */
  function renderVerdict(e, hist) {
    var q = e.q;
    var correctLabel = q.correct === 'A' ? q.optionA : q.optionB;

    verdict.className = 'verdict verdict--' +
      (e.v === 'right' ? 'right' : e.v === 'wrong' ? 'wrong' : 'skip') +
      (hist ? ' verdict--history' : '');

    $('verdict-mark').textContent =
      e.v === 'right' ? 'Right.' : e.v === 'wrong' ? 'Not that one.' : 'Skipped.';

    var line;
    if (e.v === 'right') {
      line = correctLabel + ' — yes.';
    } else if (e.v === 'wrong') {
      line = 'You said ' + (e.choice === 'A' ? q.optionA : q.optionB) +
             '. The answer is ' + correctLabel + '.';
    } else {
      line = 'The answer is ' + correctLabel + '.';
    }
    if (e.due > 0)       line += ' Back in ' + e.due + ' min.';
    else if (e.due < 0)  line += ' Parked — it will be waiting next session.';
    $('verdict-line').textContent = line;
    $('verdict-why').textContent  = q.explanation;

    var pos = $('verdict-pos');
    pos.classList.toggle('is-hidden', !hist);
    if (hist) pos.textContent = 'looking back · ' + (hist.pos + 1) + ' of ' + history.length;

    $('btn-next').textContent = hist ? 'Resume' : 'Next card';
    $('btn-prev').disabled = hist ? hist.pos <= 0 : history.length < 2;
    $('btn-fwd').classList.toggle('is-hidden', !hist);
    $('verdict-foot').textContent = hist
      ? 'tap anywhere to resume · ← → to page'
      : 'tap anywhere, or press space';

    // Hand this card to the Ask panel and start it on a clean thread.
    askCtx     = { q: q, v: e.v, choice: e.choice };
    askHistory = [];
    askResetLog();

    verdict.classList.remove('is-hidden');
    $('btn-next').focus({ preventScroll: true });
  }

  function nextCard() {
    if (!ask.classList.contains('is-hidden')) return;   // chatting — stay put
    if (histPos !== null) return;
    if (verdict.classList.contains('is-hidden')) return;
    locked = false;
    advance();
  }

  /* =========================================================================
     LOOKING BACK

     Every committed card lands in `history`, so the one you just answered is
     never gone — useful in fast mode especially, where a correct answer flies
     past without a verdict. Answers are not re-openable: this is a review, not
     a second attempt, so nothing here touches the score or the schedule.
     ========================================================================= */

  /* The newest position you can page to. When the live sheet is up it already
     shows the last entry, so look-back stops one short of it. */
  function histMax() {
    return history.length - (liveVerdict ? 2 : 1);
  }

  function goBack() {
    var target = histPos !== null ? histPos - 1 : histMax();
    if (target < 0) return;
    openHistory(target);
  }

  function goFwd() {
    if (histPos === null) return;
    if (histPos + 1 > histMax()) { exitHistory(); return; }
    openHistory(histPos + 1);
  }

  function openHistory(pos) {
    if (pos < 0 || pos >= history.length) return;
    histPos = pos;
    locked  = true;                       // the card underneath stops listening
    renderVerdict(history[pos], { pos: pos });
  }

  function exitHistory() {
    histPos = null;

    if (liveVerdict) { renderVerdict(liveVerdict, null); return; }

    verdict.classList.add('is-hidden');
    askCtx = null;
    if (pendingAdvance) {                 // fast mode was mid-hop when we paged back
      pendingAdvance = false;
      locked = false;
      advance();
      return;
    }
    locked = false;
    updateChrome();
  }

  /* =========================================================================
     ASK — chat about the card you just answered.

     The card is preloaded as the system prompt (question, both options, what
     you picked, the right answer, the explanation), so the first message can
     be "why?" instead of a restatement of the question.

     There is no backend here — this is a static site — so the request goes
     straight from the browser to api.anthropic.com using a key you paste in
     once. That key is kept in this browser's localStorage and is sent to
     nobody but Anthropic. Don't use this build on a shared device.
     ========================================================================= */

  var ASK_URL     = 'https://api.anthropic.com/v1/messages';
  var ASK_MODEL   = 'claude-opus-5';
  var ASK_VERSION = '2023-06-01';
  var ASK_KEY_LS  = 'metric-board.anthropic-key';
  var ASK_MAX_TOK = 4096;   // a ceiling, not a target — length is set by the prompt

  var ask        = $('ask');
  var askLog     = $('ask-log');
  var askForm    = $('ask-form');
  var askInput   = $('ask-input');
  var askSendBtn = $('ask-send');
  var askKeyBox  = $('ask-key');
  var askKeyIn   = $('ask-key-input');
  var askFoot    = $('ask-foot-note');
  var askForget  = $('btn-key-forget');

  var askCtx     = null;   // { q, v, choice } — the card under discussion
  var askHistory = [];     // the Messages API `messages` array for this card
  var askBusy    = false;
  var askAbort   = null;

  /* localStorage throws in some private-browsing modes; degrade to "no key". */
  function keyGet() {
    try { return localStorage.getItem(ASK_KEY_LS) || ''; } catch (e) { return ''; }
  }
  function keySet(v) {
    try {
      if (v) localStorage.setItem(ASK_KEY_LS, v);
      else   localStorage.removeItem(ASK_KEY_LS);
    } catch (e) { /* non-fatal — the key just won't persist */ }
  }

  /* ---- the preloaded context -------------------------------------------- */
  function askSystem(c) {
    var q = c.q;
    var correctLabel = q.correct === 'A' ? q.optionA : q.optionB;
    var picked = c.choice === 'A' ? q.optionA : c.choice === 'B' ? q.optionB : null;
    var did = c.v === 'right' ? 'got it right'
            : c.v === 'wrong' ? 'got it wrong'
            : 'skipped it';

    return [
      'You are a tutor inside Metric Board, a swipe-quiz app that drills business, offline, online and training metrics.',
      'The user has just worked the card below and is asking you about it. The card and its explanation are on screen in front of them, so do not read them back.',
      '',
      '<card>',
      'Topic: ' + q.topic,
      'Question: ' + q.question,
      'Left option (A): ' + q.optionA,
      'Right option (B): ' + q.optionB,
      'Correct answer: ' + q.correct + ' — ' + correctLabel,
      "Explanation shown in the app: " + q.explanation,
      'Outcome: the user ' + did + (picked ? ', choosing "' + picked + '"' : ''),
      '</card>',
      '',
      'Answer their follow-ups about this card and the ideas around it. If they got it wrong, go at the specific confusion their choice points to rather than re-explaining from the top.',
      'You are on a phone screen. Keep it to a few short paragraphs. Lead with the answer, then the reasoning.',
      'Plain text only: no markdown, no headers, no bullet syntax, no LaTeX. Write formulas inline, like "precision = TP / (TP + FP)".',
      'Drifting to neighbouring metrics topics is fine. If they ask something unrelated, answer briefly and leave it there.'
    ].join('\n');
  }

  /* One-tap openers, picked to match how the card went. */
  function askChips(c) {
    if (c.v === 'wrong') {
      return ['Why is my answer wrong?',
              'How do I tell these two apart?',
              'When would my answer have been right?'];
    }
    if (c.v === 'skip') {
      return ['Explain this one from scratch',
              "What's the intuition here?",
              'Where does this actually get used?'];
    }
    return ["Why is that the answer?",
            'When does this break down?',
            "What's commonly confused with this?"];
  }

  /* ---- panel state ------------------------------------------------------- */
  function setKb(px) {
    document.documentElement.style.setProperty('--kb', px + 'px');
  }

  function askScroll() { askLog.scrollTop = askLog.scrollHeight; }

  function askMode() {
    var has = !!keyGet();
    askKeyBox.classList.toggle('is-hidden', has);
    askForm.classList.toggle('is-hidden', !has);
    askForget.classList.toggle('is-hidden', !has);
    askFoot.textContent = has ? ASK_MODEL + ' · key stored on this device' : '';
    askSendBtn.disabled = askBusy;
  }

  function openAsk() {
    if (!askCtx) return;
    $('ask-topic').textContent = askCtx.q.topic;
    $('ask-title').textContent = askCtx.q.question;
    ask.classList.remove('is-hidden');
    askMode();
    if (!keyGet()) {
      askKeyIn.focus({ preventScroll: true });
    } else if (!('ontouchstart' in window)) {
      // On touch, leave focus alone — the keyboard would cover the openers.
      askInput.focus({ preventScroll: true });
    }
  }

  function closeAsk() {
    if (askAbort) { askAbort.abort(); askAbort = null; }
    askBusy = false;
    askSendBtn.disabled = false;
    ask.classList.add('is-hidden');
    setKb(0);
  }

  function askBubble(role, text) {
    var el = document.createElement('div');
    el.className = 'ask__msg ask__msg--' + role;
    if (text !== undefined) el.textContent = text;
    askLog.appendChild(el);
    askScroll();
    return el;
  }

  /* Empty state: one line of orientation plus the tappable openers. */
  function askResetLog() {
    askLog.innerHTML = '';
    if (!keyGet() || !askCtx) return;

    var hint = document.createElement('p');
    hint.className = 'ask__hint';
    hint.textContent =
      'This card, your answer and the explanation are already loaded. Ask away.';
    askLog.appendChild(hint);

    var chips = document.createElement('div');
    chips.className = 'ask__chips';
    askChips(askCtx).forEach(function (text) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ask__chip';
      b.textContent = text;
      b.addEventListener('click', function () { askSubmit(text); });
      chips.appendChild(b);
    });
    askLog.appendChild(chips);
  }

  function autosize() {
    askInput.style.height = 'auto';
    askInput.style.height = Math.min(124, askInput.scrollHeight) + 'px';
  }

  /* ---- send -------------------------------------------------------------- */
  function askSubmit(text) {
    text = String(text || '').trim();
    if (!text || askBusy || !askCtx) return;

    var key = keyGet();
    if (!key) { askMode(); return; }

    // First real message clears the empty state.
    if (askLog.querySelector('.ask__hint')) askLog.innerHTML = '';

    askBubble('user', text);
    askHistory.push({ role: 'user', content: text });

    askInput.value = '';
    autosize();
    askBusy = true;
    askSendBtn.disabled = true;

    var bubble = askBubble('bot');
    bubble.innerHTML = '<span class="ask__dots"><i></i><i></i><i></i></span>';

    var got = '';
    var stop = null;

    function settle() {
      askBusy = false;
      askSendBtn.disabled = false;
      askAbort = null;
    }

    askStream(
      key,
      function onText(chunk) {
        if (!got) bubble.textContent = '';   // drop the waiting dots
        got += chunk;
        bubble.textContent = got;
        askScroll();
      },
      function onStop(reason) { stop = reason; },
      function onDone() {
        settle();
        if (!got) {
          bubble.remove();
          askHistory.pop();                  // keep the thread clean for a retry
          askBubble('note', stop === 'refusal'
            ? 'Claude declined to answer that one.'
            : 'Came back empty. Try asking again.');
        } else {
          if (stop === 'max_tokens') {
            bubble.textContent = got + '\n\n(cut off — ask for the rest)';
          }
          askHistory.push({ role: 'assistant', content: got });
        }
        askScroll();
      },
      function onError(err) {
        settle();
        if (err && err.name === 'AbortError') {
          bubble.remove();
          if (got) askHistory.push({ role: 'assistant', content: got });
          else askHistory.pop();
          return;
        }

        if (got) {
          askHistory.push({ role: 'assistant', content: got });
        } else {
          bubble.remove();
          askHistory.pop();
        }

        var msg = (err && err.message) || 'Request failed.';
        if (err instanceof TypeError) {
          msg = 'Could not reach the API. Check your connection.';
        }
        askBubble('note', msg);
        askScroll();
      }
    );
  }

  function askStream(key, onText, onStop, onDone, onError) {
    askAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;

    var body = {
      model: ASK_MODEL,
      max_tokens: ASK_MAX_TOK,
      stream: true,
      system: askSystem(askCtx),
      // Thinking is on by default on Opus 5. Low effort keeps a tutoring reply
      // quick and cheap; turning thinking off outright is the worse trade here,
      // since it can leak <thinking> tags into the visible answer.
      output_config: { effort: 'low' },
      messages: askHistory
    };

    fetch(ASK_URL, {
      method: 'POST',
      signal: askAbort ? askAbort.signal : undefined,
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': ASK_VERSION,
        // Opts this origin into CORS on the Messages API. Only reasonable
        // because the key is the user's own and stays on their device.
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(askHttpError(res.status, t));
        });
      }
      // Stream when the browser hands us a readable body; otherwise read the
      // whole SSE payload at once and run it through the same parser.
      if (res.body && res.body.getReader && typeof TextDecoder !== 'undefined') {
        return askPump(res.body.getReader(), onText, onStop);
      }
      return res.text().then(function (t) { askParse(t, onText, onStop); });
    }).then(onDone, onError);
  }

  function askPump(reader, onText, onStop) {
    var dec = new TextDecoder();
    var buf = '';
    return (function step() {
      return reader.read().then(function (r) {
        if (r.done) { askParse(buf, onText, onStop); return; }
        buf += dec.decode(r.value, { stream: true });
        // Only parse whole lines; a partial one waits for the next chunk.
        var cut = buf.lastIndexOf('\n');
        if (cut >= 0) {
          askParse(buf.slice(0, cut + 1), onText, onStop);
          buf = buf.slice(cut + 1);
        }
        return step();
      });
    })();
  }

  /* Minimal SSE reader — only `data:` lines matter to us. Thinking deltas are
     ignored on purpose, so only the answer itself reaches the bubble. */
  function askParse(chunk, onText, onStop) {
    chunk.split('\n').forEach(function (line) {
      if (line.slice(0, 5) !== 'data:') return;
      var raw = line.slice(5).trim();
      if (!raw) return;

      var ev;
      try { ev = JSON.parse(raw); } catch (e) { return; }

      if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
        onText(ev.delta.text);
      } else if (ev.type === 'message_delta' && ev.delta && ev.delta.stop_reason) {
        onStop(ev.delta.stop_reason);
      } else if (ev.type === 'error') {
        throw new Error((ev.error && ev.error.message) || 'The API returned a stream error.');
      }
    });
  }

  function askHttpError(status, text) {
    var msg = '';
    try {
      var j = JSON.parse(text);
      msg = (j && j.error && j.error.message) || '';
    } catch (e) { /* body wasn't JSON */ }

    if (status === 401 || status === 403) {
      return 'That API key was rejected. Forget it below and save another.';
    }
    if (status === 429) return 'Rate limited. Wait a moment and try again.';
    if (status === 529) return 'The API is overloaded right now. Try again shortly.';
    if (status >= 500)  return 'Server error from the API (' + status + '). Try again.';
    return msg || ('Request failed (' + status + ').');
  }

  /* ---- ask wiring -------------------------------------------------------- */
  $('btn-ask').addEventListener('click', function (e) {
    e.stopPropagation();          // the verdict sheet advances on any tap
    openAsk();
  });
  $('btn-ask-close').addEventListener('click', closeAsk);
  ask.addEventListener('click', function (e) {
    if (e.target === ask) closeAsk();   // tap the dimmed margin to dismiss
  });

  $('btn-key-save').addEventListener('click', function () {
    var v = askKeyIn.value.trim();
    if (!v) { askKeyIn.focus(); return; }
    keySet(v);
    askKeyIn.value = '';
    askMode();
    askResetLog();
    askInput.focus({ preventScroll: true });
  });
  askKeyIn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); $('btn-key-save').click(); }
  });

  askForget.addEventListener('click', function () {
    keySet('');
    askHistory = [];
    askMode();
    askResetLog();
  });

  askForm.addEventListener('submit', function (e) {
    e.preventDefault();
    askSubmit(askInput.value);
  });
  askInput.addEventListener('input', autosize);
  askInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askSubmit(askInput.value);
    }
  });

  /* Keep the composer above the on-screen keyboard on iOS. */
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      if (ask.classList.contains('is-hidden')) { setKb(0); return; }
      var vv = window.visualViewport;
      setKb(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
      askScroll();
    });
  }

  /* ---- summary -----------------------------------------------------------
     Counts are over attempts, not cards, because a card you missed and then
     retook twice is three attempts and the tally you watched said so. The
     review lists below are per card, which is what you actually want to read. */
  function finish() {
    verdict.classList.add('is-hidden');
    liveVerdict = null;
    histPos = null;
    locked = false;
    closeAsk();

    var right   = history.filter(function (r) { return r.v === 'right'; }).length;
    var wrong   = history.filter(function (r) { return r.v === 'wrong'; }).length;
    var skipped = history.filter(function (r) { return r.v === 'skip';  }).length;
    var answered = right + wrong;
    var acc = answered ? Math.round(right / answered * 100) : 0;

    $('sum-accuracy').textContent = acc + '%';
    $('sum-correct').textContent  = right + ' right';
    $('sum-wrong').textContent    = wrong + ' wrong';
    $('sum-skipped').textContent  = skipped + ' skipped';

    // Roll attempts up into one row per card, keeping deck order.
    var order = [], byId = {};
    history.forEach(function (r) {
      var row = byId[r.q.id];
      if (!row) { row = byId[r.q.id] = { q: r.q, wrong: 0, skip: 0 }; order.push(row); }
      if (r.v === 'wrong') row.wrong += 1;
      if (r.v === 'skip')  row.skip  += 1;
    });

    var parked  = order.filter(function (r) { var s = sess[r.q.id]; return s && s.parked; });
    var missed  = order.filter(function (r) { return r.wrong && parked.indexOf(r) < 0; });
    var skips   = order.filter(function (r) { return r.skip && !r.wrong && parked.indexOf(r) < 0; });

    var html = '';
    html += renderReview('Still shaky', parked, 'wrong',
                         'Missed too often to keep circling today. FSRS has them queued for next time.');
    html += renderReview('Missed, then recovered', missed, 'wrong', '');
    html += renderReview('Skipped', skips, 'skip', '');
    if (!html) {
      html = '<p class="review-h">Review</p>' +
             '<p class="review-empty">Nothing missed, nothing skipped. Clean board.</p>';
    }
    $('review-block').innerHTML = html;
    $('sum-sched').textContent = schedLine();

    show('summary');
    screens.summary.querySelector('.screen__inner').scrollTop = 0;
    startStats();
  }

  function renderReview(title, rows, kind, note) {
    if (!rows.length) return '';
    var out = '<p class="review-h">' + title + ' · ' + rows.length + '</p>';
    if (note) out += '<p class="review-note">' + esc(note) + '</p>';
    rows.forEach(function (r) {
      var q = r.q;
      var correctLabel = q.correct === 'A' ? q.optionA : q.optionB;
      var times = r.wrong > 1 ? ' <span class="review-item__n">missed ' + r.wrong + '×</span>' : '';
      out += '<div class="review-item review-item--' + kind + '">' +
             '<p class="review-item__q">' + esc(q.question) + times + '</p>' +
             '<p class="review-item__a"><b>' + esc(correctLabel) + '</b></p>' +
             '<p class="review-item__why">' + esc(q.explanation) + '</p>' +
             '</div>';
    });
    return out;
  }

  /* When the cards worked this session next come round, per FSRS. */
  function schedLine() {
    if (!history.length) return '';
    var now = Date.now(), soonest = Infinity, seen = {}, n = 0;
    history.forEach(function (r) {
      if (seen[r.q.id]) return;
      seen[r.q.id] = 1; n += 1;
      var due = FSRS.get(r.q.id).due;
      if (due < soonest) soonest = due;
    });
    if (!isFinite(soonest)) return '';
    return n + ' cards scheduled · first one back ' + fmtWhen(soonest - now) + '.';
  }

  function fmtWhen(ms) {
    if (ms <= 60000) return 'in a moment';
    var mins = Math.round(ms / 60000);
    if (mins < 90)   return 'in ' + mins + ' min';
    var hrs = Math.round(mins / 60);
    if (hrs < 36)    return 'in ' + hrs + ' hour' + (hrs === 1 ? '' : 's');
    return 'in ' + Math.round(hrs / 24) + ' days';
  }

  /* ---- deck control ------------------------------------------------------ */
  /* kind: 'deck' | 'shuffle' | 'due' */
  function startDeck(kind) {
    var source = window.QUESTIONS || [];
    var list;

    if (kind === 'due') {
      var now = Date.now();
      list = source.filter(function (q) {
        var st = FSRS.get(q.id);
        return st.reps > 0 && st.due <= now;
      });
      if (!list.length) list = source.slice();   // nothing due after all
    } else {
      list = kind === 'shuffle' ? shuffle(source) : source.slice();
    }

    main    = list;
    pending = [];
    history = [];
    sess    = {};
    done    = 0;
    current = null;
    repeat  = false;
    lastServed  = null;
    histPos     = null;
    liveVerdict = null;
    pendingAdvance = false;
    locked  = false;

    closeAsk();
    verdict.classList.add('is-hidden');
    show('quiz');
    advance();
  }

  /* ---- pace -------------------------------------------------------------- */
  function setMode(m) {
    mode = m === 'fast' ? 'fast' : 'slow';
    try { localStorage.setItem(MODE_LS, mode); } catch (e) { /* won't persist */ }

    $('mode-slow').setAttribute('aria-checked', String(mode === 'slow'));
    $('mode-fast').setAttribute('aria-checked', String(mode === 'fast'));
    $('mode-slow').classList.toggle('is-on', mode === 'slow');
    $('mode-fast').classList.toggle('is-on', mode === 'fast');

    var pill = $('btn-mode');
    pill.textContent = mode;
    pill.classList.toggle('pill--fast', mode === 'fast');
  }

  /* ---- key gate ----------------------------------------------------------
     The key is asked for once at the top of a run rather than the first time
     you reach for Ask, which is always mid-thought about a question. Skippable:
     the deck itself needs nothing. Skipping is remembered for this page load
     only, so it asks again next launch but never twice in a sitting. */
  var gate = $('gate');
  var gateThen    = null;   // which start to run once the gate closes
  var gateSkipped = false;

  function startWithGate(kind) {
    if (!keyGet() && !gateSkipped) { gateThen = kind; openGate(); return; }
    startDeck(kind);
  }

  function openGate() {
    var has = !!keyGet();
    $('gate-input').value = '';
    $('gate-eyebrow').textContent = gateThen ? 'before you start' : 'ask';
    $('gate-title').textContent   = has ? 'Replace your API key' : 'Anthropic API key';
    $('btn-gate-save').textContent = gateThen ? 'Save & start' : 'Save key';
    $('btn-gate-skip').textContent = gateThen ? 'Start without it' : 'Close';
    $('btn-gate-forget').classList.toggle('is-hidden', !has);
    gate.classList.remove('is-hidden');
    $('gate-input').focus({ preventScroll: true });
  }

  function closeGate() {
    gate.classList.add('is-hidden');
    var kind = gateThen;
    gateThen = null;
    keyStateLine();
    if (kind) startDeck(kind);
  }

  function keyStateLine() {
    var has = !!keyGet();
    $('key-state').textContent = has
      ? 'Ask key stored on this device.'
      : 'No Ask key yet — the deck works without one.';
    $('btn-key-open').textContent = has ? 'replace' : 'add one';
  }

  /* ---- start screen counts ----------------------------------------------- */
  function startStats() {
    var source = window.QUESTIONS || [];
    var now = Date.now(), studied = 0, due = 0;
    source.forEach(function (q) {
      var st = FSRS.get(q.id);
      if (!st.reps) return;
      studied += 1;
      if (st.due <= now) due += 1;
    });

    $('deck-count').textContent = source.length + ' cards · ' + studied +
      ' studied · ' + due + ' due now';

    var b = $('btn-start-due');
    b.classList.toggle('is-hidden', due === 0);
    b.textContent = 'Review due · ' + due;
  }

  /* ---- wiring ------------------------------------------------------------ */
  $('btn-start').addEventListener('click',         function () { startWithGate('deck');    });
  $('btn-start-shuffle').addEventListener('click', function () { startWithGate('shuffle'); });
  $('btn-start-due').addEventListener('click',     function () { startWithGate('due');     });
  $('btn-restart').addEventListener('click',       function () { startDeck('deck');    });
  $('btn-reshuffle').addEventListener('click',     function () { startDeck('shuffle'); });

  $('btn-a').addEventListener('click',    function () { commit('A'); });
  $('btn-b').addEventListener('click',    function () { commit('B'); });
  $('btn-skip').addEventListener('click', function () { commit('skip'); });

  $('mode-slow').addEventListener('click', function () { setMode('slow'); });
  $('mode-fast').addEventListener('click', function () { setMode('fast'); });
  $('btn-mode').addEventListener('click',  function () { setMode(mode === 'fast' ? 'slow' : 'fast'); });

  backBtn.addEventListener('click', goBack);
  $('btn-prev').addEventListener('click', function (e) { e.stopPropagation(); goBack(); });
  $('btn-fwd').addEventListener('click',  function (e) { e.stopPropagation(); goFwd();  });
  $('btn-next').addEventListener('click', function (e) {
    e.stopPropagation();
    if (histPos !== null) exitHistory(); else nextCard();
  });
  verdict.addEventListener('click', function () {   // tap anywhere on the sheet
    if (histPos !== null) exitHistory(); else nextCard();
  });

  $('btn-key-open').addEventListener('click', openGate);
  $('btn-gate-save').addEventListener('click', function () {
    var v = $('gate-input').value.trim();
    if (!v) { $('gate-input').focus(); return; }
    keySet(v);
    askMode();
    closeGate();
  });
  $('btn-gate-skip').addEventListener('click', function () {
    if (gateThen) gateSkipped = true;
    closeGate();
  });
  $('btn-gate-forget').addEventListener('click', function () {
    keySet('');
    askMode();
    openGate();
  });
  $('gate-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); $('btn-gate-save').click(); }
  });

  $('btn-forget-memory').addEventListener('click', function () {
    if (!window.confirm('Clear what the app remembers about every card? Scheduling starts from scratch.')) return;
    FSRS.clear();
    startStats();
    $('sum-sched').textContent = 'Memory cleared.';
  });

  document.addEventListener('keydown', function (e) {
    // Whichever sheet is up owns the keyboard — otherwise a space typed into
    // the composer would advance the deck out from under the chat.
    if (!ask.classList.contains('is-hidden')) {
      if (e.key === 'Escape') closeAsk();
      return;
    }
    if (!gate.classList.contains('is-hidden')) {
      if (e.key === 'Escape') $('btn-gate-skip').click();
      return;
    }
    if (histPos !== null) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goBack(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goFwd();  }
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); exitHistory();
      }
      return;
    }
    if (!verdict.classList.contains('is-hidden')) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); nextCard(); }
      if (e.key === 'ArrowLeft')              { e.preventDefault(); goBack();  }
      return;
    }
    if (screens.quiz.classList.contains('is-hidden')) return;
    if (e.key === 'Backspace')  { e.preventDefault(); goBack(); return; }
    if (e.key === 'ArrowLeft')  commit('A');
    if (e.key === 'ArrowRight') commit('B');
    if (e.key === 'ArrowUp')    commit('skip');
  });

  /* ---- boot -------------------------------------------------------------- */
  var savedMode = 'slow';
  try { savedMode = localStorage.getItem(MODE_LS) || 'slow'; } catch (e) { /* blocked */ }
  setMode(savedMode);
  startStats();
  keyStateLine();

  show('start');

  /* ---- service worker ----------------------------------------------------
     Relative path and relative scope, so this works from a /repo-name/ subpath
     on GitHub Pages as well as from the domain root. */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .catch(function (err) { console.warn('Service worker not registered:', err); });
    });
  }
})();
