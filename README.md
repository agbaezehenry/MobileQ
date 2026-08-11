# Chalkboard

A swipe-based quiz PWA. One question per card, filling the screen: swipe **left** for the
left-hand answer, **right** for the right-hand answer, **up** to skip. Vanilla HTML, CSS
and JS — no framework, no build step, no npm. Push the files, enable Pages, done.

Some cards are not a swipe at all. [**Written** cards](#written-cards) ask for an answer in
your own words and have it marked against the reference answer; [**scenarios**](#scenarios)
are one setup with a chain of follow-ups, each dealt only once you have answered the last.

Cards you miss come back a couple of minutes later and keep coming back until they stick;
[FSRS-5](#spaced-repetition-fsrs-5) schedules everything else across sessions. **Fast** mode
only stops you when you get one wrong. The `←` at the top left reopens anything you have
already answered. The start screen has a [topic picker](#quiz-by-topic), so a run can be the
whole deck or just one subject.

The deck that ships with it is 211 cards over three subjects: **metrics and ML systems**,
**Redis**, and **Elasticsearch**. The metrics half splits into four families:

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

The `redis` and `elasticsearch` families are written cards throughout — every one of them
[wants an answer in your own words](#written-cards), because the point of them is being able
to say *why* you'd pick a Stream over a List, not recognising that you would.

| Family | Groups |
| --- | --- |
| **redis** (30) | caching, strings, hashes, sets, sorted sets, queues, streams, pub/sub, transactions, locks, cluster, replication, durability, memory, performance, architecture |
| **elasticsearch** (10) | distributed search, pagination (`from`/`size`, `search_after`, PIT), the inverted index, scoring, mappings, modelling, architecture |

---

## Quiz by topic

The start screen has a chip per family with its card count, plus **All**. Tapping a family
while everything is selected narrows the run to just it — "quiz me on Redis" being the thing
you usually want — and tapping more adds them. Turning the last one off falls back to All
rather than leaving you with an empty deck. The choice sticks between launches.

Everything downstream follows the selection: the card count under the buttons, **Review due
· N**, and what `Start the deck`, `Shuffle first` and `Run it again` deal.

The chips are built from whatever `questions.js` contains — the family is the part of `topic`
before the `·`, so adding `kafka · consumer groups` cards puts a `kafka` chip on the start
screen with no other change. A stored selection naming a family the deck no longer has is
quietly dropped.

---

## Files

```
index.html      app shell + iOS meta tags
styles.css      chalkboard styling
app.js          swipe gesture, queue, scoring, summary, Ask chat
fsrs.js         FSRS-5 scheduler + the per-card memory it runs on
questions.js    the question bank — edit this, nothing else
manifest.json   PWA manifest
sw.js           service worker (offline cache)
icons/          192, 512, and a maskable 512
```

---

## Pace: slow or fast

Picked on the start screen, and swappable mid-run from the `SLOW` / `FAST` pill in the top
right. It sticks between launches.

| | on a right answer | on a miss or a skip |
| --- | --- | --- |
| **Slow** | verdict sheet, tap to continue | verdict sheet |
| **Fast** | a green tick, then the next card ~0.3s later | verdict sheet |

A written card always shows the marking sheet while it waits on the grader; in fast mode a
**right** mark then flashes the tick and moves on, and a **half** or **wrong** one stops.

Fast mode exists because most of a drill is cards you already know, and reading "Right." on
each of them is pure tax. It stops you exactly where stopping is worth something.

You lose nothing by going fast — the cards that flew past are still in the look-back, Ask
button and all.

## Looking back

The `←` at the top left reopens the card you just answered. From there `←` and `→` page
through everything you have answered this run, and **Resume** drops you back where you were.
On a keyboard: backspace to open, arrows to page, escape to resume.

It is a review, not a second attempt — nothing there changes the score or the schedule. The
**Ask** button works on any card you page to, which is the intended way to interrogate
something fast mode skated past.

## Written cards

Some cards have no left and no right. The rails go dark, the card grows a text box, and the
controls become **Skip** and **Submit answer** — you have to produce the thing rather than
recognise it, which is the difference between having read about NRR and being able to say
what 118% means when somebody asks.

What you write is marked against the `answer` the card ships with. The verdict sheet then
shows your answer, one line of feedback, the model answer, and the usual explanation.

Marks are **right**, **half**, or **wrong**. Half is not a consolation prize: it schedules
exactly like a miss (back in 2 minutes, and it counts toward the three-miss park), and it is
excluded from the accuracy figure on the summary — it just grades **Hard** rather than
**Again** in FSRS, because half-remembering is evidence of a weak memory rather than none.

On a keyboard, `Enter` is a newline and **⌘/Ctrl + Enter** submits.

### The marking call

`claude-haiku-4-5`, one non-streaming call, no thinking. Marking is a comparison, not a
knowledge question — the reference answer travels with the card, so the model is only
judging whether the substance matches. That is a small job, and a card that stalled for
five seconds behind Opus would be worse than no marking at all.

The reply is pinned with [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
to `{verdict, feedback}`, so there is no prose to parse and no way to come back with a mark
the app cannot read. The prompt tells it to mark on substance: a terser answer than the
reference is still correct, and nothing is expected that the question did not ask for.
It lives under the `THE GRADER` banner in `app.js`.

### Without a key

Nothing about the deck depends on the API. With no key stored — or if the call fails, or the
key is rejected, or you are on a plane — the sheet shows you the model answer and three
buttons, **I had it / Half / Missed it**, and you mark yourself. The schedule cares about the
verdict, not about who produced it.

## Scenarios

A scenario is one setup and a chain of follow-ups. The setup rides on every card in the
chain, the tag line reads `STEP 2 OF 3`, and the steps are dealt back to back — nothing
jumps the queue mid-chain, because a follow-up asked after an unrelated detour about ROC
curves is a different and worse question. Steps can be swipe cards or written ones.

Once answered, a step is an ordinary card. It is scheduled under its own id, relearned on
its own, and when it comes back — two minutes later, or in four days from `Review due` — it
comes back **alone**, still carrying its setup. Chains are how the material is first taught,
not a unit that has to be replayed whole forever.

## Active recall

Miss a card and it comes back **2 minutes later**, mid-deck, jumping ahead of new material.
Get it right then and it comes back once more **10 minutes** after that before it graduates.
Miss it again at any point and it drops back to the start of those steps. The `↺` badge in
the top bar counts what is queued, and the counter says `recall · 41 / 160` whenever the card
in front of you is one that came back round.

The run does not end while anything is still owed: once the fresh cards run out, whatever is
left is served early rather than making you wait out the clock. A card missed more than three
times in one sitting stops circling — it is listed under **Still shaky** on the summary and
left for the next session.

Those minute-scale steps are ordinary relearning steps, deliberately kept **in front of**
FSRS rather than inside it — the same split Anki uses.

## Spaced repetition (FSRS-5)

`fsrs.js` is the real thing: stability, difficulty, and the power-law forgetting curve
`R(t) = (1 + (19/81)·t/S)^-0.5`, with the FSRS-5 default weights. Every card carries `{s, d,
reps, lapses, last, due}` in `localStorage` under `metric-board.fsrs.v1`, keyed by question
`id`. Nothing leaves the device.

> **That prefix is not a typo.** The app was called *Metric Board* before it grew past
> metrics, and the four `localStorage` keys — `metric-board.fsrs.v1`, `.mode`, `.topics`,
> `.anthropic-key` — kept the old name on purpose. They hold real review history and a real
> API key; renaming them would silently orphan the lot on the next load, for no benefit
> anyone can see. The prefix is storage, not branding.

Grades come off the swipe. A miss or a skip is **Again**. A correct answer is graded by
hesitation, since that is the only other signal a two-choice card offers: under 4.5s is
**Easy**, over 15s is **Hard**, anything between is **Good**. A written answer marked
**half** is **Hard**, and still relearned like a miss.

Once a card has a review history, the start screen offers **Review due · N**, which deals
only the cards whose due date has passed.

### One stability credit per sitting

The one place this departs from stock FSRS-5, and the reason is specific to a drill app.
FSRS's short-term formula multiplies stability by about 1.4 for every same-day success. That
is fine when a card gets one or two of those; this app hands a missed card two more exposures
inside ten minutes and lets you re-run the whole deck back to back. Compounding it sends a
card you have merely re-swiped out to a months-long interval on no real evidence — ten
repeats in four minutes measured out at a 97-day interval before this was fixed.

So successes less than 30 minutes apart are fully recorded — reps, difficulty, due date — but
do not grow stability. Misses always count, however recent the last look: forgetting is
information no matter what. Come back to the same card half an hour later and it credits
normally.

There is a **Clear the spaced-repetition memory** link at the bottom of the summary screen.

## Run it locally

Service workers need a real origin, so `file://` won't fully work. Any static server does:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

On desktop the arrow keys work as a stand-in for swiping: `←` `→` `↑`, then space for the
next card. Backspace opens the look-back; inside it the arrows page and escape resumes. On a
written card the keyboard belongs to the text box — arrows move the caret, and ⌘/Ctrl+Enter
submits.

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

Everything lives in `questions.js` as one plain array. No app logic in that file. There are
three entry shapes, mixed freely in the same array.

**A swipe card:**

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

**A written card:**

```js
{
  id: "wri-001",
  topic: "offline · classification",
  type: "open",
  question: "A fraud model is reported at 99.4% accuracy … why is that close to useless?",
  answer: "Fraud is a tiny fraction of transactions, so predicting 'not fraud' …",
  keyPoints: ["the classes are imbalanced", "asks for a positive-class metric"],
  explanation: "This is the base-rate trap …"
}
```

`answer` is what the marking model compares against, so write it the way you would want it
said back to you. `keyPoints` is optional and acts as the checklist — it is the lever for
"right idea, but I wanted both halves". Ask for a specific amount (*in a sentence*, *name
two*): an open-ended prompt gets marked against an answer that had a shape in mind.

**A scenario:**

```js
{
  id: "scn-001",
  topic: "monitoring · drift",
  type: "scenario",
  scenario: "A recommender loses 8% of its click-through rate overnight. Nothing shipped.",
  steps: [
    { question: "Where do you look first?",
      optionA: "Offline metrics on the frozen test set",
      optionB: "The features being served to live traffic",
      correct: "B", explanation: "…" },
    { type: "open", question: "What do you add so the next one is caught sooner?",
      answer: "…", keyPoints: ["…"], explanation: "…" }
  ]
}
```

Steps take the same fields as the two shapes above, minus `topic` (inherited) and `id`
(defaults to `scn-001.1`, `scn-001.2`, …). Those generated ids are what FSRS schedules
under, so **renumbering or reordering steps loses their review history** — give a step an
explicit `id` if you expect to move it later.

Keep `scenario` to two or three sentences. It is repeated on every step and the card does
not scroll: the stage owns the touch gesture, so a scroll region inside a card would not
answer to a finger. Long stems are clamped at six lines.

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

The chat also gets the context of a written card: what you wrote and how it was marked, so
"was I close, or thinking about it wrong?" is a question it can actually answer — including
by disagreeing with the mark if you make a fair case.

### It needs your own API key

The same key does both jobs: chatting about a card, and [marking written answers](#the-marking-call).
This is a static site with no backend, so there is nowhere to hide a server-side secret.

It is asked for **at the top of a run**, before the first card, rather than the first time
you reach for Ask — that moment is always mid-thought about a question, and paying attention
to a key field there means losing the thread. The prompt is skippable (**Start without it**);
the deck itself needs nothing. Skipping is remembered for that page load, so it asks once per
launch and never twice in a sitting. Once a key is stored the prompt stops appearing, and the
start screen grows a **replace** link for changing it later.

The key is:

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

Offline, the deck still works: Ask reports that it can't reach the API, and written cards
[fall back to self-marking](#without-a-key).

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

- **Optimised FSRS weights.** `fsrs.js` ships the FSRS-5 defaults, trained on the open Anki
  review-log corpus. Your own review history is being written to `localStorage` already, so
  running it through the FSRS optimiser and pasting the resulting 19 numbers over `W` would
  personalise the schedule. Not worth it until a few hundred reviews have accumulated.
- **Branching scenarios.** Chains are linear: every step follows the last regardless of what
  you answered. Branching on the answer — "you said stale features, so what would you check
  next?" — would mean a `next` map per option and a queue that can walk it, and would need a
  story for what a branch that was never taken means to the scheduler.
- **Confidence tap.** A low/med/high tap before committing, stored alongside the result, so
  the summary can show a calibration curve and a Brier score — which would make the app an
  instance of one of its own questions.
- **Per-topic breakdown on the summary screen.** Accuracy by family would tell you whether
  the gap is in offline eval or in experimentation.
