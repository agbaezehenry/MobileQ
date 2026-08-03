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

    verdict.classList.remove('is-hidden');
    $('btn-next').focus({ preventScroll: true });
  }

  function nextCard() {
    if (verdict.classList.contains('is-hidden')) return;
    verdict.classList.add('is-hidden');
    locked = false;
    index += 1;
    renderStack();
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
