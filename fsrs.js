/* =============================================================================
   fsrs.js — FSRS-5 scheduler plus the per-card memory it runs on.

   FSRS models a card as two numbers:

     stability  S  — days until recall probability falls to 90%
     difficulty D  — 1..10, how hard this card is for this person

   and one derived quantity:

     retrievability R(t) = (1 + FACTOR · t/S) ^ DECAY

   which is the probability you'd still recall it t days after the last review.
   Every review updates S and D from the grade you gave it, and the next due
   date is the t at which R falls back to the target retention.

   Two things worth knowing about how it is wired into this app:

   · FSRS thinks in days. A card you miss gets a small stability, but "small"
     still means hours or days — it would never come back inside one sitting.
     So minute-scale resurfacing is NOT done here; app.js keeps short relearning
     steps in front of this, the same split Anki uses. FSRS owns the long game,
     the relearning steps own the next few minutes.

   · Reviews less than a day apart use the FSRS-5 short-term stability formula,
     which is exactly the case a drill session produces. Answering the same card
     four times in ten minutes therefore does not inflate its stability the way
     four reviews on four days would.

   State is kept in localStorage, keyed by question id, so the deck remembers
   you between sessions. Nothing leaves the device.
   ============================================================================= */

(function () {
  'use strict';

  /* FSRS-5 default weights, from the reference implementation. Trained on the
     open Anki review-log dataset; they are the sane starting point when you
     have no review history of your own to optimise against. */
  var W = [
    0.40255, 1.18385, 3.173,   15.69105, 7.1949,  0.5345,  1.4604,
    0.0046,  1.54575, 0.1192,  1.01925,  1.9395,  0.11,    0.29605,
    2.2698,  0.2315,  2.9898,  0.51655,  0.6621
  ];

  var DECAY    = -0.5;
  var FACTOR   = 19 / 81;      /* chosen so R(S) === 0.9 exactly */
  var TARGET_R = 0.9;          /* aim to review when recall odds hit 90%      */
  var S_MIN    = 0.01;         /* days — floor, keeps the power laws finite   */
  var DAY      = 86400000;
  var I_MIN    = 5 / 1440;     /* days — never schedule closer than 5 minutes */
  var I_MAX    = 365;          /* days — nor further out than a year          */

  /* One stability credit per sitting. The FSRS-5 short-term formula multiplies
     stability by about 1.4 for each same-day success, which is fine when a card
     gets one or two of those. This deck hands a missed card two more exposures
     within ten minutes, and the deck can be re-run back to back — compounding
     that would push a card you have merely re-swiped out to a months-long
     interval on no real evidence. So successes closer together than this are
     recorded (reps, difficulty, due date) but do not grow stability. Misses
     always count: forgetting is information no matter how recent the last look. */
  var SESSION_MS = 30 * 60000;

  var LS_KEY = 'metric-board.fsrs.v1';

  /* ---- store ------------------------------------------------------------ */
  /* localStorage throws in some private-browsing modes. Degrade to an
     in-memory map: the session still schedules correctly, it just forgets. */
  var mem = {};
  try {
    mem = JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {};
  } catch (e) { mem = {}; }

  var saveTimer = null;
  function save() {
    if (saveTimer) return;                 // coalesce the burst during a drill
    saveTimer = setTimeout(function () {
      saveTimer = null;
      try { localStorage.setItem(LS_KEY, JSON.stringify(mem)); } catch (e) { /* full or blocked */ }
    }, 400);
  }

  function blank() {
    return { s: 0, d: 0, reps: 0, lapses: 0, last: 0, due: 0, boost: 0 };
  }

  function get(id) {
    var r = mem[id];
    if (!r) return blank();
    // Copy: callers must not mutate the store behind our back.
    return {
      s: r.s, d: r.d, reps: r.reps, lapses: r.lapses,
      last: r.last, due: r.due, boost: r.boost || 0
    };
  }

  function set(id, st) {
    mem[id] = st;
    save();
  }

  function clear() {
    mem = {};
    try { localStorage.removeItem(LS_KEY); } catch (e) { /* nothing to do */ }
  }

  /* ---- the model -------------------------------------------------------- */
  function clampD(d) { return Math.min(10, Math.max(1, d)); }
  function clampS(s) { return Math.max(S_MIN, s); }

  /* Grades are the standard four: 1 Again, 2 Hard, 3 Good, 4 Easy. */
  function initS(g) { return clampS(W[g - 1]); }
  function initD(g) { return clampD(W[4] - Math.exp(W[5] * (g - 1)) + 1); }

  function retrievability(s, elapsedDays) {
    if (!(s > 0)) return 0;
    return Math.pow(1 + FACTOR * Math.max(0, elapsedDays) / s, DECAY);
  }

  /* Difficulty drifts by grade, then reverts a little toward the difficulty an
     Easy first answer would have given it — so one bad day cannot permanently
     brand a card as hard. */
  function nextD(d, g) {
    var dp = d - W[6] * (g - 3) * (10 - d) / 9;
    return clampD(W[7] * initD(4) + (1 - W[7]) * dp);
  }

  /* Stability after a successful recall. The (1 - R) term is the whole point of
     FSRS: reviewing a card you had almost forgotten buys far more stability
     than reviewing one you knew cold. */
  function recallS(d, s, r, g) {
    var hard = g === 2 ? W[15] : 1;
    var easy = g === 4 ? W[16] : 1;
    return clampS(s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) *
                           (Math.exp((1 - r) * W[10]) - 1) * hard * easy));
  }

  /* Stability after a lapse, floored at S_MIN and capped at the old stability —
     forgetting a card never makes it more durable than it already was. */
  function forgetS(d, s, r) {
    var sf = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) *
             Math.exp((1 - r) * W[14]);
    return clampS(Math.min(sf, s));
  }

  /* Reviews inside the same day get their own, much flatter, curve. */
  function shortS(s, g) {
    return clampS(s * Math.exp(W[17] * (g - 3 + W[18])));
  }

  function intervalDays(s) {
    var i = (s / FACTOR) * (Math.pow(TARGET_R, 1 / DECAY) - 1);
    return Math.min(I_MAX, Math.max(I_MIN, i));
  }

  /* Grade one review. Returns the new state; does not store it. */
  function review(st, g, now) {
    var next = blank();
    next.boost = now;

    if (!st.reps) {
      next.d = initD(g);
      next.s = initS(g);
    } else {
      var elapsed = Math.max(0, (now - st.last) / DAY);
      var r = retrievability(st.s, elapsed);
      next.d = nextD(st.d, g);

      if (elapsed >= 1) {
        next.s = g === 1 ? forgetS(next.d, st.s, r) : recallS(next.d, st.s, r, g);
      } else if (g === 1 || now - (st.boost || 0) >= SESSION_MS) {
        next.s = shortS(st.s, g);
      } else {
        next.s = st.s;                  // already credited this sitting
        next.boost = st.boost;
      }
    }

    next.reps   = st.reps + 1;
    next.lapses = st.lapses + (g === 1 ? 1 : 0);
    next.last   = now;
    next.due    = now + Math.round(intervalDays(next.s) * DAY);
    return next;
  }

  window.FSRS = {
    blank: blank,
    get: get,
    set: set,
    clear: clear,
    review: review,
    retrievability: retrievability,
    intervalDays: intervalDays
  };
})();
