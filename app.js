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

  /* ---- state ------------------------------------------------------------ */
  var deck    = [];   // the working, possibly shuffled, question list
  var index   = 0;    // pointer into deck
  var results = [];   // { id, verdict: 'right'|'wrong'|'skip', chose: 'A'|'B'|null }
  var topCard = null; // DOM node of the interactive card
  var locked  = false;// true while a card is flying off or the verdict is up

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

    if (index >= deck.length) { finish(); return; }

    var behind = deck[index + 1];
    if (behind) {
      var b = buildCard(behind);
      b.classList.add('card--behind');
      stage.appendChild(b);
    }

    var q = deck[index];
    topCard = buildCard(q);
    topCard.classList.add('card--top', 'card--animate');
    stage.appendChild(topCard);

    // Deal-in: start slightly low and faded, then settle.
    topCard.style.transform = 'translate3d(0, 22px, 0) scale(0.97)';
    topCard.style.opacity = '0';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        topCard.style.transform = 'translate3d(0,0,0)';
        topCard.style.opacity = '1';
      });
    });

    attachGesture(topCard);
    updateChrome(q);
  }

  /* Rails, tap-button labels, progress bar, counters. */
  function updateChrome(q) {
    railAText.textContent = '← ' + q.optionA;
    railBText.textContent = q.optionB + ' →';
    btnAText.textContent  = q.optionA;
    btnBText.textContent  = q.optionB;

    $('counter').textContent = (index + 1) + ' / ' + deck.length;

    var right = results.filter(function (r) { return r.verdict === 'right'; }).length;
    $('tally').textContent = right + ' right';
    $('progress-fill').style.width = (index / deck.length * 100) + '%';
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

  /* ---- commit an answer -------------------------------------------------- */
  /* choice is 'A', 'B' or 'skip'. Animates the card away, records the result,
     then raises the verdict sheet. */
  function commit(choice) {
    if (locked || !topCard) return;
    locked = true;

    var q = deck[index];
    var isSkip = choice === 'skip';
    var v = isSkip ? 'skip' : (choice === q.correct ? 'right' : 'wrong');

    results.push({ id: q.id, verdict: v, chose: isSkip ? null : choice });

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

    showVerdict(q, v, choice);
  }

  /* ---- verdict sheet ----------------------------------------------------- */
  function showVerdict(q, v, choice) {
    var correctLabel = q.correct === 'A' ? q.optionA : q.optionB;

    verdict.className = 'verdict verdict--' + (v === 'right' ? 'right' : v === 'wrong' ? 'wrong' : 'skip');
    $('verdict-mark').textContent =
      v === 'right' ? 'Right.' : v === 'wrong' ? 'Not that one.' : 'Skipped.';

    var line;
    if (v === 'right') {
      line = correctLabel + ' — yes.';
    } else if (v === 'wrong') {
      line = 'You said ' + (choice === 'A' ? q.optionA : q.optionB) +
             '. The answer is ' + correctLabel + '.';
    } else {
      line = 'The answer is ' + correctLabel + '. Flagged for review.';
    }
    $('verdict-line').textContent = line;
    $('verdict-why').textContent  = q.explanation;

    // Hand this card to the Ask panel and start it on a clean thread.
    askCtx     = { q: q, v: v, choice: choice };
    askHistory = [];
    askResetLog();

    verdict.classList.remove('is-hidden');
    $('btn-next').focus({ preventScroll: true });
  }

  function nextCard() {
    if (!ask.classList.contains('is-hidden')) return;   // chatting — stay put
    if (verdict.classList.contains('is-hidden')) return;
    verdict.classList.add('is-hidden');
    locked = false;
    index += 1;
    renderStack();
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

  /* ---- summary ----------------------------------------------------------- */
  function finish() {
    var right   = results.filter(function (r) { return r.verdict === 'right'; }).length;
    var wrong   = results.filter(function (r) { return r.verdict === 'wrong'; }).length;
    var skipped = results.filter(function (r) { return r.verdict === 'skip';  }).length;
    var answered = right + wrong;
    var acc = answered ? Math.round(right / answered * 100) : 0;

    $('sum-accuracy').textContent = acc + '%';
    $('sum-correct').textContent  = right + ' right';
    $('sum-wrong').textContent    = wrong + ' wrong';
    $('sum-skipped').textContent  = skipped + ' skipped';

    var byId = {};
    deck.forEach(function (q) { byId[q.id] = q; });

    var html = '';
    html += renderReview('Missed', results.filter(function (r) { return r.verdict === 'wrong'; }), byId, 'wrong');
    html += renderReview('Skipped', results.filter(function (r) { return r.verdict === 'skip'; }), byId, 'skip');
    if (!wrong && !skipped) {
      html = '<p class="review-h">Review</p><p class="review-empty">Nothing missed, nothing skipped. Clean board.</p>';
    }
    $('review-block').innerHTML = html;

    show('summary');
    screens.summary.querySelector('.screen__inner').scrollTop = 0;
  }

  function renderReview(title, rows, byId, kind) {
    if (!rows.length) return '';
    var out = '<p class="review-h">' + title + ' · ' + rows.length + '</p>';
    rows.forEach(function (r) {
      var q = byId[r.id];
      if (!q) return;
      var correctLabel = q.correct === 'A' ? q.optionA : q.optionB;
      out += '<div class="review-item review-item--' + kind + '">' +
             '<p class="review-item__q">' + esc(q.question) + '</p>' +
             '<p class="review-item__a"><b>' + esc(correctLabel) + '</b></p>' +
             '<p class="review-item__why">' + esc(q.explanation) + '</p>' +
             '</div>';
    });
    return out;
  }

  /* ---- deck control ------------------------------------------------------ */
  function startDeck(doShuffle) {
    var source = window.QUESTIONS || [];
    deck    = doShuffle ? shuffle(source) : source.slice();
    index   = 0;
    results = [];
    locked  = false;
    closeAsk();
    verdict.classList.add('is-hidden');
    show('quiz');
    renderStack();
  }

  /* ---- wiring ------------------------------------------------------------ */
  $('btn-start').addEventListener('click',         function () { startDeck(false); });
  $('btn-start-shuffle').addEventListener('click', function () { startDeck(true);  });
  $('btn-restart').addEventListener('click',       function () { startDeck(false); });
  $('btn-reshuffle').addEventListener('click',     function () { startDeck(true);  });

  $('btn-a').addEventListener('click',    function () { commit('A'); });
  $('btn-b').addEventListener('click',    function () { commit('B'); });
  $('btn-skip').addEventListener('click', function () { commit('skip'); });

  $('btn-next').addEventListener('click', function (e) { e.stopPropagation(); nextCard(); });
  verdict.addEventListener('click', nextCard);   // tap anywhere on the sheet

  document.addEventListener('keydown', function (e) {
    // While the Ask panel is up it owns the keyboard — otherwise a space typed
    // into the composer would advance the deck out from under the chat.
    if (!ask.classList.contains('is-hidden')) {
      if (e.key === 'Escape') closeAsk();
      return;
    }
    if (!verdict.classList.contains('is-hidden')) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); nextCard(); }
      return;
    }
    if (screens.quiz.classList.contains('is-hidden')) return;
    if (e.key === 'ArrowLeft')  commit('A');
    if (e.key === 'ArrowRight') commit('B');
    if (e.key === 'ArrowUp')    commit('skip');
  });

  $('deck-count').textContent =
    (window.QUESTIONS ? window.QUESTIONS.length : 0) + ' cards in the deck';

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
