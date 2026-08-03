# Metric Board

A swipe-based quiz PWA. One question per card, filling the screen: swipe **left** for the
left-hand answer, **right** for the right-hand answer, **up** to skip. Vanilla HTML, CSS
and JS — no framework, no build step, no npm. Push the files, enable Pages, done.

The deck that ships with it is a 154-card drill on **metrics and ML systems**. The metrics
half splits into four families:

| Family | What it measures | Examples in the deck |
| --- | --- | --- |
| **Business** | Money and users | CAC, LTV, NRR, DAU/MAU, contribution margin, take rate, payback period |
| **Offline** | Model quality on held-out data | precision/recall, ROC-AUC vs PR-AUC, Brier, ECE, MCC, RMSE/MAE/WAPE, NDCG, MRR, BLEU/ROUGE, perplexity, pass@k, mAP, Dice, FID, WER |
| **Online** | Live traffic and experiments | SRM, CUPED, MDE, power, novelty effects, interleaving, switchbacks, holdouts, p99 latency, TTFT, D7 retention |
| **Training** | The optimization run itself | train/val gap, gradient norm, clipping, MFU, update:weight ratio, warmup, bits-per-byte, PPO clip fraction, RLHF KL, explained variance |

Plus a `taxonomy` group on telling the four families apart, and a `monitoring` group on
drift (PSI, concept vs covariate shift, training–serving skew, feedback loops).

The `systems` family covers the machinery around the model rather than the model itself:

| Group | What it drills |
| --- | --- |
| `systems · feature stores` | online vs offline stores, point-in-time correctness, the feature registry |
| `systems · pipelines` | streaming features via broker → stream engine → online store, on-demand features |
| `systems · deployment` | shadow, canary, A/B blast radius, proxy labels for delayed ground truth |
| `systems · failures` | circuit breakers, inference OOM, decoupled monitoring, gradient accumulation |
| `systems · architecture` | two-tower retrieval, ANN search, DeepFM under a latency budget, RAG cross-encoders |
| `systems · bias` | position bias, IPW and propensity clipping, FairPairs, EM, filter bubbles |
| `systems · cold start` | bandit exploration for items, explicit onboarding for users |

---

## Files

```
index.html      app shell + iOS meta tags
styles.css      chalkboard styling
app.js          swipe gesture, scoring, summary, Ask chat
questions.js    the question bank — edit this, nothing else
manifest.json   PWA manifest
sw.js           service worker (offline cache)
icons/          192, 512, and a maskable 512
```

## Run it locally

Service workers need a real origin, so `file://` won't fully work. Any static server does:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

On desktop the arrow keys work as a stand-in for swiping: `←` `→` `↑`, then space for the
next card.

---

## Deploy to GitHub Pages

1. Create a repo and push these files to the root of the default branch.
2. **Settings → Pages → Build and deployment → Deploy from a branch**, pick your branch
   and the `/ (root)` folder. Save.
3. Wait for the green check, then open `https://<username>.github.io/<repo-name>/`.

### The subpath gotcha

Project pages live at `/<repo-name>/`, not at the domain root. Every path in this project
is therefore **relative** — `./app.js`, `./sw.js`, `"start_url": "./"` — and the service
worker is registered with `{ scope: './' }`. If you ever change a path to a leading-slash
absolute one (`/styles.css`), it will resolve to `username.github.io/styles.css` and 404.

Two other things that bite here:

- **GitHub Pages caches aggressively.** After editing `questions.js`, bump `CACHE_VERSION`
  in `sw.js` (e.g. `metric-board-v1` → `v2`). Otherwise installed phones keep serving the
  old cached copy forever.
- **HTTPS is required** for service workers. Pages gives you that automatically.

---

## Add to home screen

**iOS / Safari** (it must be Safari — Chrome on iOS can't install PWAs):
open the URL → Share button → scroll down → **Add to Home Screen** → Add.
Launch from the new icon and it opens full-screen with no browser chrome.

**Android / Chrome:**
open the URL → ⋮ menu → **Add to Home screen** (or **Install app**) → Install.
Chrome often also shows an install prompt in the address bar.

After the first load the service worker has the whole app cached, so it works on a plane.

---

## Editing the deck

Everything lives in `questions.js` as one plain array. No app logic in that file.

```js
{
  id: "off-001",                       // unique; used in the review list
  topic: "offline · classification",   // shown as the chalk tag on the card
  type: "two-choice",                  // or "true-false"
  question: "Precision answers which question?",
  optionA: "Of the real positives, how many did I catch?",   // ← swipe left
  optionB: "Of the ones I flagged, how many were right?",    // → swipe right
  correct: "B",
  explanation: "TP / (TP + FP) …"      // revealed after you commit
}
```

For `true-false` cards, set `optionA: "False"` and `optionB: "True"` — left is false,
right is true, which matches the ✗/✓ muscle memory.

Two things worth keeping up as you add cards: vary which side is correct (the current deck
is 52 A / 62 B, so you can't swipe one direction and coast), and keep option labels short
enough to read on the card edge and in the tap buttons.

---

## Asking about a card

After you commit an answer, the verdict sheet has an **Ask** button next to *Next card*.
It opens a chat with Claude about the card you just did. The question, both options, which
one you picked, the right answer and the explanation are already loaded as the system
prompt — so the first thing you say can be "why?" rather than a restatement of the card.
The thread resets with each new card.

### It needs your own API key

This is a static site with no backend, so there is nowhere to hide a server-side secret.
The first time you tap Ask it asks for an Anthropic API key, which is:

- stored in that browser's `localStorage` under `metric-board.anthropic-key`
- sent to `api.anthropic.com` and nowhere else
- **never committed** — it lives on the device, not in this repo

Get one at [console.anthropic.com](https://console.anthropic.com) → API keys. Usage bills to
that account. There's a **Forget key** link at the bottom of the panel.

The tradeoff to be aware of: a key in `localStorage` is readable by anything running on this
origin and by anyone holding the unlocked phone. That's an acceptable deal for a personal
drill on your own device. It is *not* the right model if you hand this URL to other people —
for that, put a proxy (a Cloudflare Worker holding the key as a secret) in front of the API
and point `ASK_URL` in `app.js` at it instead.

### The call

`claude-opus-5`, streamed, at `effort: "low"` — these are short tutoring answers, not deep
reasoning, and low effort keeps them fast and cheap on a phone. Thinking is left on (it's the
default on Opus 5); the SSE reader only renders `text_delta`, so reasoning never reaches the
bubble. Browser calls are opted into CORS with the `anthropic-dangerous-direct-browser-access`
header. All of it lives under the `ASK —` banner in `app.js`, behind one `askStream()`
function — swap that one function to move to a proxy.

Offline, the deck still works; Ask just reports that it can't reach the API.

---

## Design notes

Chalkboard: slate-green board, chalk-white type, a fine dust texture, and a handwriting
font stack (`Bradley Hand` / `Chalkduster` / `Segoe Print`, falling back to system cursive)
so nothing has to be fetched from a font CDN — which is also what lets it work offline on
first launch.

The signature element is the **chalk rails**: the two answers are written down the left and
right edges of the board and brighten as you drag toward them, so the direction-to-answer
mapping is visible mid-gesture instead of being something you memorize.

One deliberate departure from the brief: the drag tints are **chalk blue (left)** and
**chalk amber (right)** rather than green/red. On a quiz, a green tint on one side reads as
"this is the correct one" before you've answered. Green and red are reserved for the
verdict sheet, where they actually mean right and wrong.

Gesture details: pointer events with a touch fallback, axis lock after 8px of movement so a
diagonal swipe doesn't count as both an answer and a skip, a commit threshold of
`max(100px, 25% of card width)`, and a velocity shortcut so a fast flick commits at 45px.
Only `transform` and `opacity` animate. `prefers-reduced-motion` is respected.

---

## Deliberately left out of v1

- **Spaced repetition (FSRS).** Persist per-card stability/difficulty/due-date in
  `localStorage` keyed by question `id`, grade each swipe as Again/Hard/Good (skip → Again),
  and add a "Review due" entry point on the start screen that filters the deck to cards due
  today. The `id` field is already stable and unique, which is the only thing v1 needed to
  get right for this to be additive later.
- **Confidence tap.** A low/med/high tap before committing, stored alongside the result, so
  the summary can show a calibration curve and a Brier score — which would make the app an
  instance of one of its own questions.
- **Multiple decks with a topic filter.** `topic` is already on every card; a start-screen
  chip row that filters `QUESTIONS` before the deck is built would be maybe 30 lines.
- **Per-topic breakdown on the summary screen.** Accuracy by family would tell you whether
  the gap is in offline eval or in experimentation.
