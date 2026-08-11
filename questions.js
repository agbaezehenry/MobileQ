/* =============================================================================
   questions.js — the question bank.

   This file has NO app logic in it. Edit freely: add, delete, or reorder
   objects in the QUESTIONS array and the app picks up the changes on reload.

   Schema — three shapes, all in the same array
   --------------------------------------------

   1. A swipe card.
   {
     id:          "unique-string",          // used for the missed/skipped list
     topic:       "free text label",        // shown as a chalk tag on the card
     type:        "two-choice" | "true-false",
     question:    "The prompt.",
     optionA:     "Left-swipe label",       // true-false → "False"
     optionB:     "Right-swipe label",      // true-false → "True"
     correct:     "A" | "B",
     explanation: "Why that's the answer. Shown after you commit."
   }

   2. A written card. You type an answer and it is marked against `answer` by a
      small model — on substance, not wording. Without an API key the app shows
      the model answer and you mark yourself.
   {
     id:          "unique-string",
     topic:       "free text label",
     type:        "open",
     question:    "The prompt. Say how much you want — 'in a sentence', 'name two'.",
     answer:      "The reference answer. Written as you'd want it said back.",
     keyPoints:   ["must be mentioned", "…"],   // optional; the marking checklist
     explanation: "The fuller note. Shown after marking, like any other card."
   }

   3. A scenario: one setup, then a chain of follow-ups dealt back to back.
      Steps are `two-choice`, `true-false` or `open` cards — the same fields as
      above, minus `topic` (inherited) and `id` (defaults to "scn-001.1").
      Once answered, a step is an ordinary card: it is scheduled under its own
      id and comes back alone, still carrying the setup text. Keep `scenario`
      to two or three sentences — the card does not scroll.
   {
     id:          "unique-string",
     topic:       "free text label",
     type:        "scenario",
     scenario:    "The setup, repeated on every step of the chain.",
     steps:       [ { question, optionA, optionB, correct, explanation },
                    { type: "open", question, answer, keyPoints, explanation } ]
   }

   Topics
   ------
   The part of `topic` before the `·` is the family, and the start screen builds
   its topic chips from whatever families appear here — so a new subject needs no
   change anywhere else. What the deck currently holds:

     METRICS   four families of them — BUSINESS (money, users, retention),
               OFFLINE (held-out data, before shipping), ONLINE (live traffic and
               experiments) and TRAINING (the loss curve itself) — plus TAXONOMY
               on telling those apart and MONITORING on drift.
     SYSTEMS   the machinery around the model: feature stores, pipelines,
               deployment, failure modes, retrieval architecture, position bias,
               cold start.
     REDIS     data structures, delivery guarantees, clustering, durability.
     ELASTICSEARCH  distributed search, pagination, indexing, document modelling.

   The redis and elasticsearch families are written cards throughout.
   ============================================================================= */

const QUESTIONS = [

  /* ---------------------------------------------------------------------------
     TAXONOMY — telling the four families apart
     ------------------------------------------------------------------------ */
  {
    id: "tax-001",
    topic: "taxonomy",
    type: "two-choice",
    question: "Your fraud model's AUC goes from 0.91 to 0.94 on a frozen test set. Which family of metric just moved?",
    optionA: "Offline metric",
    optionB: "Online metric",
    correct: "A",
    explanation: "Measured on static held-out data, before any user sees it. Offline metrics are cheap, repeatable, and available on every commit — which is exactly why they're proxies, not truth."
  },
  {
    id: "tax-002",
    topic: "taxonomy",
    type: "two-choice",
    question: "Revenue per session rises 2% during a two-week experiment. That is primarily a…",
    optionA: "Training metric",
    optionB: "Business metric",
    correct: "B",
    explanation: "It's denominated in money and it's what leadership actually funds. It's also being read online, which is the usual arrangement: business metrics get measured through online experiments."
  },
  {
    id: "tax-003",
    topic: "taxonomy",
    type: "true-false",
    question: "A model can win on every offline metric and still lose the A/B test.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Routinely. Offline data is logged under the old policy, so it carries position bias and missing counterfactuals; and offline eval ignores latency, UI fit, and feedback loops. The offline–online gap is the central problem of applied ML."
  },
  {
    id: "tax-004",
    topic: "taxonomy",
    type: "two-choice",
    question: "Gradient norm per optimizer step belongs to which family?",
    optionA: "Offline evaluation metric",
    optionB: "Training metric",
    correct: "B",
    explanation: "Training metrics describe the optimization process itself — loss, gradient norm, learning rate, throughput. They tell you whether learning is healthy, not whether the model is good."
  },
  {
    id: "tax-005",
    topic: "taxonomy",
    type: "true-false",
    question: "The OEC (Overall Evaluation Criterion) of an experiment should usually be the model's loss function.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "The OEC is the single number the experiment is decided on, and it should encode long-term user and business value. Cross-entropy is a training convenience, not a statement about what the product is for."
  },
  {
    id: "tax-006",
    topic: "taxonomy",
    type: "two-choice",
    question: "You want a metric cheap enough to run fifty times a day while iterating. Which family?",
    optionA: "Online",
    optionB: "Offline",
    correct: "B",
    explanation: "Offline evaluation exists to buy iteration speed. Online tests cost real traffic and real weeks, so you spend them only on candidates offline eval already liked."
  },
  {
    id: "tax-007",
    topic: "taxonomy",
    type: "two-choice",
    question: "p99 inference latency is best described as…",
    optionA: "A training metric",
    optionB: "An online / system metric",
    correct: "B",
    explanation: "It only exists once real requests are hitting a real service. It's usually run as a guardrail: a quality win that blows the latency budget is not a win."
  },
  {
    id: "tax-008",
    topic: "taxonomy",
    type: "true-false",
    question: "Guardrail metrics exist to confirm that a win on the primary metric didn't come at an unacceptable cost somewhere else.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Latency, crash rate, unsubscribe rate, support tickets, revenue. They aren't expected to improve — they're expected not to break."
  },
  {
    id: "tax-009",
    topic: "taxonomy",
    type: "two-choice",
    question: "Which metric is closest to the business and furthest from the model?",
    optionA: "Customer lifetime value",
    optionB: "Log loss",
    correct: "A",
    explanation: "There's a chain: training loss → offline metric → online engagement metric → business outcome. Every link is a place where an improvement can fail to propagate."
  },
  {
    id: "tax-010",
    topic: "taxonomy",
    type: "two-choice",
    question: "A metric you optimize directly will eventually…",
    optionA: "Stay a good measure of what you meant",
    optionB: "Stop being a good measure of what you meant",
    correct: "B",
    explanation: "Goodhart's law. Optimize click-through and you get clickbait; optimize watch time and you get autoplay traps. This is why you pair a primary metric with guardrails and long-horizon holdouts."
  },

  /* ---------------------------------------------------------------------------
     BUSINESS METRICS
     ------------------------------------------------------------------------ */
  {
    id: "biz-001",
    topic: "business",
    type: "two-choice",
    question: "CAC stands for…",
    optionA: "Cumulative Annual Conversion",
    optionB: "Customer Acquisition Cost",
    correct: "B",
    explanation: "Fully-loaded sales and marketing spend divided by new customers won in the period. The honest version includes salaries and tooling, not just ad spend."
  },
  {
    id: "biz-002",
    topic: "business",
    type: "two-choice",
    question: "An LTV : CAC ratio around 3 : 1 is usually read as…",
    optionA: "Healthy",
    optionB: "A red flag",
    correct: "A",
    explanation: "Rule of thumb: below ~1 you lose money per customer; around 3 is a sustainable engine. Much above 3 can mean you're underinvesting in growth."
  },
  {
    id: "biz-003",
    topic: "business",
    type: "true-false",
    question: "A high LTV is enough to justify high acquisition spend, regardless of payback period.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "LTV ignores time. If payback takes 30 months you're financing every new customer for two and a half years, and you can starve on paper-profitable growth."
  },
  {
    id: "biz-004",
    topic: "business",
    type: "two-choice",
    question: "DAU / MAU is a proxy for…",
    optionA: "Stickiness — how many days a month a user shows up",
    optionB: "Churn",
    correct: "A",
    explanation: "A ratio of 0.2 means the average monthly user visits about 6 days a month. Messaging apps sit high; tax software sits very low, and that's fine."
  },
  {
    id: "biz-005",
    topic: "business",
    type: "two-choice",
    question: "Net revenue retention above 100% means…",
    optionA: "New customer acquisition is accelerating",
    optionB: "Existing customers expand faster than they churn or downgrade",
    correct: "B",
    explanation: "NRR counts upsell, cross-sell, downgrades, and churn within the existing base only. Above 100% the business grows even with zero new logos."
  },
  {
    id: "biz-006",
    topic: "business",
    type: "two-choice",
    question: "For a marketplace, which number does the marketplace actually book as revenue?",
    optionA: "GMV",
    optionB: "Take rate × GMV",
    correct: "B",
    explanation: "GMV is the total value transacted across the platform; the platform keeps only its commission. Quoting GMV as revenue is a classic pitch-deck sleight of hand."
  },
  {
    id: "biz-007",
    topic: "business",
    type: "true-false",
    question: "For the same cohort and the same period, retention rate = 1 − churn rate.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "They're complements by construction. The trap is comparing a monthly churn number against an annual retention number, or mixing logo churn with revenue churn."
  },
  {
    id: "biz-008",
    topic: "business",
    type: "two-choice",
    question: "ARPU divides revenue by…",
    optionA: "All active users",
    optionB: "Only paying users",
    correct: "A",
    explanation: "ARPPU is the paying-users version. In a freemium product the two can differ by 50×, so mixing them up makes monetization look wildly better or worse than it is."
  },
  {
    id: "biz-009",
    topic: "business",
    type: "two-choice",
    question: "NPS is computed as…",
    optionA: "The mean score out of 10",
    optionB: "% promoters (9–10) minus % detractors (0–6)",
    correct: "B",
    explanation: "Scores of 7–8 are 'passives' and are thrown away entirely. That discarding is why NPS is noisy and why moves of a few points usually mean nothing."
  },
  {
    id: "biz-010",
    topic: "business",
    type: "two-choice",
    question: "CAC payback period measures…",
    optionA: "Months of gross profit needed to earn back the acquisition cost",
    optionB: "Months until the average customer churns",
    correct: "A",
    explanation: "It's the cash-flow question LTV can't answer. Under 12 months is generally considered strong for SaaS."
  },
  {
    id: "biz-011",
    topic: "business",
    type: "true-false",
    question: "LTV should be built from gross margin, not from revenue.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Serving a customer costs money — hosting, support, payment fees, and for ML products, inference. Revenue-based LTV systematically flatters low-margin businesses."
  },
  {
    id: "biz-012",
    topic: "business",
    type: "two-choice",
    question: "Your recommender lifts CTR 8% but average order value drops 10%. The right move is…",
    optionA: "Ship it — CTR is the model's metric",
    optionB: "Check revenue per session before shipping anything",
    correct: "B",
    explanation: "Textbook proxy failure: the model learned to surface cheap, clickable items. Whenever a rate metric and a value metric disagree, trust the one denominated in money."
  },
  {
    id: "biz-013",
    topic: "business",
    type: "two-choice",
    question: "Which is the *leading* indicator?",
    optionA: "Activation rate in a user's first session",
    optionB: "Quarterly revenue",
    correct: "A",
    explanation: "Leading indicators move first and are steerable; lagging indicators confirm what already happened. ML teams need leading indicators because revenue arrives too late to iterate on."
  },
  {
    id: "biz-014",
    topic: "business",
    type: "two-choice",
    question: "Contribution margin subtracts…",
    optionA: "All fixed overhead",
    optionB: "The variable costs tied to each unit sold",
    correct: "B",
    explanation: "It's the per-unit money left over to pay for fixed costs. For an ML feature, GPU inference cost is a variable cost and belongs here."
  },
  {
    id: "biz-015",
    topic: "business",
    type: "true-false",
    question: "Cost per 1,000 inferences is a business metric as much as an engineering one.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "It sits directly in contribution margin. A quality win that triples serving cost may be a net loss, which is why cost-per-prediction is usually a hard guardrail."
  },
  {
    id: "biz-016",
    topic: "business",
    type: "two-choice",
    question: "A cohort retention curve that flattens after week 4 suggests…",
    optionA: "The product is dying",
    optionB: "You've found a durable core of users",
    correct: "B",
    explanation: "A curve that flattens has an asymptote — those users stay. A curve that keeps sloping toward zero means everyone eventually leaves, and no amount of acquisition fixes it."
  },
  {
    id: "biz-017",
    topic: "business",
    type: "two-choice",
    question: "Conversion rate and average order value both matter. Revenue per visitor is…",
    optionA: "Their product",
    optionB: "Their average",
    correct: "A",
    explanation: "RPV = conversion rate × AOV. Optimizing either alone lets you win the sub-metric and lose the composite, which is why RPV is the usual e-commerce OEC."
  },

  /* ---------------------------------------------------------------------------
     OFFLINE — CLASSIFICATION
     ------------------------------------------------------------------------ */
  {
    id: "off-001",
    topic: "offline · classification",
    type: "two-choice",
    question: "Precision answers which question?",
    optionA: "Of the real positives, how many did I catch?",
    optionB: "Of the ones I flagged, how many were actually right?",
    correct: "B",
    explanation: "TP / (TP + FP). Precision is about the cost of a false alarm — the denominator is your own predictions."
  },
  {
    id: "off-002",
    topic: "offline · classification",
    type: "two-choice",
    question: "Recall answers which question?",
    optionA: "Of the real positives, how many did I catch?",
    optionB: "Of the ones I flagged, how many were actually right?",
    correct: "A",
    explanation: "TP / (TP + FN). Recall is about the cost of a miss — the denominator is reality, not your predictions."
  },
  {
    id: "off-003",
    topic: "offline · classification",
    type: "true-false",
    question: "F1 is the harmonic mean of precision and recall.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Harmonic, not arithmetic — so it's dragged down hard by whichever is worse. Precision 1.0 with recall 0.02 gives F1 ≈ 0.04, which is the point."
  },
  {
    id: "off-004",
    topic: "offline · classification",
    type: "two-choice",
    question: "1 in 10,000 transactions is fraud. A model that always predicts 'not fraud' gets…",
    optionA: "99.99% accuracy and zero usefulness",
    optionB: "Low accuracy, correctly penalized",
    correct: "A",
    explanation: "The accuracy paradox. Under imbalance, accuracy measures the base rate, not the model. Reach for precision/recall, PR-AUC, or MCC instead."
  },
  {
    id: "off-005",
    topic: "offline · classification",
    type: "two-choice",
    question: "With a 1% positive rate, which curve is more informative?",
    optionA: "ROC",
    optionB: "Precision–Recall",
    correct: "B",
    explanation: "ROC's x-axis is FPR, whose denominator is the huge negative class — so thousands of false positives barely move it. PR curves put those false positives in the numerator's way."
  },
  {
    id: "off-006",
    topic: "offline · classification",
    type: "two-choice",
    question: "ROC-AUC has a clean probabilistic reading. It is…",
    optionA: "The probability a random positive is ranked above a random negative",
    optionB: "The average precision across all thresholds",
    correct: "A",
    explanation: "That's why AUC = 0.5 is coin-flip ranking. It also means AUC says nothing about whether your predicted probabilities are numerically trustworthy."
  },
  {
    id: "off-007",
    topic: "offline · classification",
    type: "true-false",
    question: "ROC-AUC depends on the decision threshold you choose.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "AUC integrates over every threshold, so it's a pure ranking metric. Threshold selection is a separate, business-driven decision made after you like the ranking."
  },
  {
    id: "off-008",
    topic: "offline · classification",
    type: "two-choice",
    question: "Brier score measures…",
    optionA: "Ranking quality only",
    optionB: "The mean squared error of predicted probabilities",
    correct: "B",
    explanation: "It rewards being both discriminative and calibrated, and it decomposes into calibration + refinement terms. Lower is better; 0.25 is what you get by always predicting 0.5."
  },
  {
    id: "off-009",
    topic: "offline · classification",
    type: "two-choice",
    question: "Your model says 70% and the event happens 40% of the time. That's a failure of…",
    optionA: "Calibration",
    optionB: "Discrimination",
    correct: "A",
    explanation: "Ranking can still be perfect while the numbers are meaningless. It matters the moment a downstream system multiplies your probability by a dollar amount — bidding, triage, expected-value routing."
  },
  {
    id: "off-010",
    topic: "offline · classification",
    type: "two-choice",
    question: "ECE stands for…",
    optionA: "Empirical Class Entropy",
    optionB: "Expected Calibration Error",
    correct: "B",
    explanation: "Bin predictions by confidence, compare each bin's average confidence to its observed accuracy, and take the weighted average gap. It's the number behind a reliability diagram."
  },
  {
    id: "off-011",
    topic: "offline · classification",
    type: "two-choice",
    question: "F-beta with β = 2 weights…",
    optionA: "Recall more heavily than precision",
    optionB: "Precision more heavily than recall",
    correct: "A",
    explanation: "β > 1 favors recall, β < 1 favors precision. Pick β from the cost ratio of a miss to a false alarm rather than by habit."
  },
  {
    id: "off-012",
    topic: "offline · classification",
    type: "true-false",
    question: "Matthews Correlation Coefficient uses all four cells of the confusion matrix.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "That's its advantage over F1, which ignores true negatives entirely. MCC ranges −1 to +1 and stays honest under class imbalance."
  },
  {
    id: "off-013",
    topic: "offline · classification",
    type: "two-choice",
    question: "Specificity is…",
    optionA: "TP / (TP + FN)",
    optionB: "TN / (TN + FP)",
    correct: "B",
    explanation: "Specificity is recall on the negative class — the true negative rate. Option A is sensitivity, i.e. ordinary recall."
  },
  {
    id: "off-014",
    topic: "offline · classification",
    type: "two-choice",
    question: "For a cancer screening triage model, the more expensive error is normally…",
    optionA: "A false negative",
    optionB: "A false positive",
    correct: "A",
    explanation: "A missed cancer is far worse than an extra follow-up scan, so you tune for high recall and accept the precision cost. The metric follows the cost structure, never the other way around."
  },
  {
    id: "off-015",
    topic: "offline · classification",
    type: "two-choice",
    question: "The KS statistic in credit scoring measures…",
    optionA: "The maximum separation between the good and bad cumulative distributions",
    optionB: "Accuracy at the optimal threshold",
    correct: "A",
    explanation: "It's a single number for how far apart the two score distributions get. Closely related to Gini, which is just 2·AUC − 1."
  },
  {
    id: "off-016",
    topic: "offline · classification",
    type: "two-choice",
    question: "A lift chart tells you…",
    optionA: "How much better the top decile does than random targeting",
    optionB: "How well probabilities are calibrated",
    correct: "A",
    explanation: "Marketing's favorite framing: if the top 10% by score contains 40% of the responders, lift is 4×. It answers 'who should I contact first', not 'is the model well-specified'."
  },
  {
    id: "off-017",
    topic: "offline · fairness",
    type: "two-choice",
    question: "Equal opportunity requires parity across groups in…",
    optionA: "Positive prediction rate",
    optionB: "True positive rate",
    correct: "B",
    explanation: "Equal opportunity equalizes recall for qualified candidates. Demographic parity equalizes the selection rate itself — and the two are generally mathematically incompatible."
  },

  /* ---------------------------------------------------------------------------
     OFFLINE — REGRESSION & FORECASTING
     ------------------------------------------------------------------------ */
  {
    id: "off-101",
    topic: "offline · regression",
    type: "two-choice",
    question: "Which punishes a few large errors harder?",
    optionA: "MAE",
    optionB: "RMSE",
    correct: "B",
    explanation: "Squaring means one 10-unit error costs as much as a hundred 1-unit errors. Choose RMSE when big misses are disproportionately expensive, MAE when they aren't."
  },
  {
    id: "off-102",
    topic: "offline · regression",
    type: "true-false",
    question: "MAPE becomes unstable when actual values approach zero.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "The actual value is in the denominator, so near-zero truths blow the percentage up to infinity. MAPE also penalizes over-forecasting more than under-forecasting, which quietly biases models low."
  },
  {
    id: "off-103",
    topic: "offline · regression",
    type: "two-choice",
    question: "An R² of 0.0 means the model is…",
    optionA: "Exactly as good as always predicting the mean",
    optionB: "Perfectly and inversely wrong",
    correct: "A",
    explanation: "R² is scored against the mean baseline, and it can go negative when the model is worse than that. It also rises mechanically with more features, which is what adjusted R² corrects."
  },
  {
    id: "off-104",
    topic: "offline · regression",
    type: "two-choice",
    question: "Over-forecasting costs you 3× what under-forecasting costs. The right loss is…",
    optionA: "Symmetric squared error",
    optionB: "Quantile (pinball) loss",
    correct: "B",
    explanation: "Pinball loss lets you target a specific quantile, so asymmetric costs get an asymmetric predictor. Inventory and capacity planning live on this."
  },
  {
    id: "off-105",
    topic: "offline · regression",
    type: "two-choice",
    question: "RMSLE is a good fit when…",
    optionA: "Targets span orders of magnitude and relative error is what matters",
    optionB: "Targets are frequently negative",
    correct: "A",
    explanation: "Taking logs turns ratio errors into additive ones, so being off by 100 on a target of 10 is punished far more than being off by 100 on a target of 100,000. It's undefined for negatives."
  },
  {
    id: "off-106",
    topic: "offline · regression",
    type: "true-false",
    question: "Adjusted R² can decrease when you add a feature that doesn't pull its weight.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "It penalizes parameter count, so noise features cost you. Plain R² can only go up, which makes it useless for model comparison at different complexities."
  },
  {
    id: "off-107",
    topic: "offline · regression",
    type: "two-choice",
    question: "Retail demand forecasters often prefer WAPE over MAPE because it…",
    optionA: "Is differentiable everywhere",
    optionB: "Weights errors by volume instead of averaging per-item percentages",
    correct: "B",
    explanation: "MAPE lets a slow-moving SKU with two units of demand dominate the average. WAPE divides total absolute error by total actuals, so the big sellers count for what they're worth."
  },
  {
    id: "off-108",
    topic: "offline · regression",
    type: "two-choice",
    question: "MASE compares your forecast error against…",
    optionA: "A naive seasonal baseline",
    optionB: "The variance of the target",
    correct: "A",
    explanation: "MASE < 1 means you beat 'predict last period'. It's scale-free, so you can average it across series that live in different units."
  },

  /* ---------------------------------------------------------------------------
     OFFLINE — RANKING, RECSYS, NLP, VISION
     ------------------------------------------------------------------------ */
  {
    id: "off-201",
    topic: "offline · ranking",
    type: "two-choice",
    question: "NDCG rewards…",
    optionA: "Total relevant items retrieved anywhere in the list",
    optionB: "Relevant items placed nearer the top",
    correct: "B",
    explanation: "The logarithmic discount means position 1 is worth far more than position 10, and normalizing by the ideal ordering makes queries comparable. It also handles graded relevance, not just binary."
  },
  {
    id: "off-202",
    topic: "offline · ranking",
    type: "two-choice",
    question: "MRR is driven by…",
    optionA: "The rank of the first correct result",
    optionB: "The mean rank of all correct results",
    correct: "A",
    explanation: "Reciprocal of the first hit's position, averaged over queries. It's the right metric when users stop reading after they find one good answer — navigational search, QA retrieval."
  },
  {
    id: "off-203",
    topic: "offline · ranking",
    type: "true-false",
    question: "Precision@10 is blind to everything below position 10.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Which is a feature when users only see ten results, and a bug when you're evaluating a retriever that feeds a reranker. Match k to what the next stage actually consumes."
  },
  {
    id: "off-204",
    topic: "offline · recsys",
    type: "two-choice",
    question: "Catalog coverage measures…",
    optionA: "The fraction of the item catalog the recommender ever surfaces",
    optionB: "The fraction of users who receive recommendations",
    correct: "A",
    explanation: "A model can hit great accuracy by recommending the same 200 bestsellers forever. Coverage, novelty and intra-list diversity are the counterweights to popularity bias."
  },
  {
    id: "off-205",
    topic: "offline · recsys",
    type: "true-false",
    question: "Offline recsys evaluation is biased because the logs only contain feedback on items the old model chose to show.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "You never observe what would have happened for unshown items — the missing-not-at-random problem. Counterfactual estimators like IPS exist to patch it, and they're why offline recsys gains so often evaporate online."
  },
  {
    id: "off-206",
    topic: "offline · NLP",
    type: "two-choice",
    question: "BLEU is precision-oriented. ROUGE is…",
    optionA: "Recall-oriented",
    optionB: "Also precision-oriented",
    correct: "A",
    explanation: "BLEU asks how much of the candidate appears in the reference (translation); ROUGE asks how much of the reference appears in the candidate (summarization). The task's failure mode picks the metric."
  },
  {
    id: "off-207",
    topic: "offline · NLP",
    type: "two-choice",
    question: "Perplexity is…",
    optionA: "Average per-token accuracy",
    optionB: "The exponential of average negative log-likelihood per token",
    correct: "B",
    explanation: "Read it as the effective number of equally likely choices the model felt it had at each step. Perplexity 20 means it was about as unsure as picking among 20 options."
  },
  {
    id: "off-208",
    topic: "offline · NLP",
    type: "true-false",
    question: "Lower perplexity reliably means a more helpful assistant.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "Perplexity measures next-token prediction on some corpus, not instruction-following, honesty, or usefulness. Post-training frequently raises perplexity while making the model far better to talk to."
  },
  {
    id: "off-209",
    topic: "offline · LLM",
    type: "two-choice",
    question: "pass@k measures…",
    optionA: "The probability at least one of k sampled solutions passes the tests",
    optionB: "The average fraction of tests passed across k samples",
    correct: "A",
    explanation: "It's the natural metric when you can verify and retry. pass@1 and pass@100 can tell very different stories about the same model — sampling budget is part of the claim."
  },
  {
    id: "off-210",
    topic: "offline · LLM",
    type: "two-choice",
    question: "In RAG evaluation, 'groundedness' (faithfulness) asks…",
    optionA: "Whether retrieval returned results fast enough",
    optionB: "Whether every claim in the answer is supported by the retrieved context",
    correct: "B",
    explanation: "It's separate from answer correctness — an answer can be right and ungrounded, or grounded in a wrong passage. Full RAG eval needs retrieval quality, groundedness, and answer relevance as three distinct numbers."
  },
  {
    id: "off-211",
    topic: "offline · LLM",
    type: "true-false",
    question: "LLM-as-judge scores can shift when the judge model is upgraded, even with the same rubric.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Judges have their own biases — position, verbosity, self-preference — and those change across versions. Pin the judge version and keep a human-labeled anchor set to detect judge drift."
  },
  {
    id: "off-212",
    topic: "offline · vision",
    type: "two-choice",
    question: "mAP@[0.5:0.95] averages precision over…",
    optionA: "IoU thresholds from 0.5 to 0.95",
    optionB: "Model checkpoints",
    correct: "A",
    explanation: "The COCO standard. Averaging over stricter and stricter overlap requirements rewards tight boxes, not just roughly-correct ones."
  },
  {
    id: "off-213",
    topic: "offline · vision",
    type: "two-choice",
    question: "The Dice coefficient is the standard metric for…",
    optionA: "Ranking quality",
    optionB: "Segmentation mask overlap",
    correct: "B",
    explanation: "2|A∩B| / (|A|+|B|) — monotonically related to IoU but more forgiving on small objects, which is why medical imaging prefers it."
  },
  {
    id: "off-214",
    topic: "offline · vision",
    type: "two-choice",
    question: "FID compares generated and real images by measuring…",
    optionA: "Distance between feature distributions from a pretrained network",
    optionB: "Pixel-wise mean squared error",
    correct: "A",
    explanation: "It fits Gaussians to Inception features and takes the Fréchet distance, so it scores realism and diversity together. It's also sensitive to sample size, so only compare FIDs computed identically."
  },
  {
    id: "off-215",
    topic: "offline · speech",
    type: "two-choice",
    question: "WER is computed as…",
    optionA: "Cosine similarity between transcript embeddings",
    optionB: "(insertions + deletions + substitutions) / reference words",
    correct: "B",
    explanation: "It's edit distance normalized by reference length, so it can exceed 100% when the model hallucinates extra words. CER is the same idea at character level, useful for languages without clean word boundaries."
  },
  {
    id: "off-216",
    topic: "offline · clustering",
    type: "two-choice",
    question: "Silhouette score compares each point's distance to its own cluster against…",
    optionA: "The nearest other cluster",
    optionB: "The global centroid",
    correct: "A",
    explanation: "Ranges −1 to 1; negative means the point probably belongs elsewhere. Adjusted Rand Index and NMI are the alternatives when you do have ground-truth labels."
  },

  /* ---------------------------------------------------------------------------
     ONLINE — EXPERIMENTATION
     ------------------------------------------------------------------------ */
  {
    id: "onl-001",
    topic: "online · experiments",
    type: "two-choice",
    question: "Sample Ratio Mismatch means…",
    optionA: "The realized traffic split doesn't match the intended allocation",
    optionB: "Your metric's variance is higher than planned",
    correct: "A",
    explanation: "You asked for 50/50 and got 50.6/49.4 with millions of users — that's a p-value of ~0 on the split itself. It means assignment or logging is broken."
  },
  {
    id: "onl-002",
    topic: "online · experiments",
    type: "true-false",
    question: "A small SRM is usually safe to ignore.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "SRM is a bug signal, not a noise signal. Whatever caused users to be dropped or double-counted is almost certainly correlated with the outcome, so the entire result is untrustworthy. Debug, don't adjust."
  },
  {
    id: "onl-003",
    topic: "online · experiments",
    type: "two-choice",
    question: "A novelty effect typically appears as…",
    optionA: "A flat result that grows over time",
    optionB: "A strong early lift that decays",
    correct: "B",
    explanation: "Users click the new thing because it's new. The mirror image is a primacy effect, where habituated users hate a change at first and adapt. Both argue for running long enough to see the curve flatten."
  },
  {
    id: "onl-004",
    topic: "online · experiments",
    type: "two-choice",
    question: "CUPED is a technique for…",
    optionA: "Reducing variance using pre-experiment data",
    optionB: "Correcting for multiple comparisons",
    correct: "A",
    explanation: "Regress out each user's pre-period behavior, and the residual metric has much lower variance — often cutting required runtime by half at the same power."
  },
  {
    id: "onl-005",
    topic: "online · experiments",
    type: "two-choice",
    question: "MDE stands for…",
    optionA: "Mean Deviation Estimate",
    optionB: "Minimum Detectable Effect",
    correct: "B",
    explanation: "The smallest true effect your sample size can reliably detect. Compute it before launch: if the MDE is 5% and a realistic win is 1%, the experiment cannot answer your question."
  },
  {
    id: "onl-006",
    topic: "online · experiments",
    type: "true-false",
    question: "Checking results daily and stopping the moment p < 0.05 inflates your false positive rate.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Continuous peeking with a fixed-horizon test can push the real Type I error well past 30%. Use sequential testing or always-valid confidence intervals if you want to look early."
  },
  {
    id: "onl-007",
    topic: "online · experiments",
    type: "two-choice",
    question: "In a two-sided marketplace, the main threat to a naive user-level A/B test is…",
    optionA: "Interference between arms — one violation of SUTVA",
    optionB: "Insufficient traffic",
    correct: "A",
    explanation: "Treatment users consuming scarce supply changes what control users see, so the arms aren't independent. Cannibalization makes the treatment look better than the global effect would be."
  },
  {
    id: "onl-008",
    topic: "online · experiments",
    type: "two-choice",
    question: "Switchback experiments randomize…",
    optionA: "Individual users",
    optionB: "Time slices within a region",
    correct: "B",
    explanation: "When units interfere — ride-hailing pricing, delivery dispatch — you flip the whole market between treatment and control on a schedule and compare periods."
  },
  {
    id: "onl-009",
    topic: "online · experiments",
    type: "two-choice",
    question: "Interleaving is popular in search ranking because…",
    optionA: "It is dramatically more sensitive per unit of traffic",
    optionB: "It removes the need for a control condition",
    correct: "A",
    explanation: "Blending both rankers' results into one list makes every user their own control, killing between-user variance. Teams report 10–100× sensitivity over A/B — at the cost of only answering ranking questions."
  },
  {
    id: "onl-010",
    topic: "online · experiments",
    type: "true-false",
    question: "Statistical significance implies practical significance.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "With enough traffic a 0.02% lift becomes significant and still isn't worth the maintenance cost. Always read the confidence interval against a pre-agreed threshold of what would matter."
  },
  {
    id: "onl-011",
    topic: "online · experiments",
    type: "two-choice",
    question: "A long-run holdout kept off the model for months measures…",
    optionA: "Cumulative long-term impact, including effects short tests can't see",
    optionB: "Day-one novelty",
    correct: "A",
    explanation: "Short tests miss learning effects, ad fatigue, and content-ecosystem shifts. Holdouts are how you find out whether a year of shipped 'wins' actually added up."
  },
  {
    id: "onl-012",
    topic: "online · experiments",
    type: "two-choice",
    question: "You evaluate 20 metrics at α = 0.05 on a null treatment. On average you'd expect…",
    optionA: "No false positives",
    optionB: "About one metric to look significant",
    correct: "B",
    explanation: "The multiple comparisons problem. Designate one primary metric in advance and treat the rest as exploratory, or control the false discovery rate."
  },
  {
    id: "onl-013",
    topic: "online · experiments",
    type: "two-choice",
    question: "A canary release is…",
    optionA: "Rolling out to a small traffic slice first while watching guardrails",
    optionB: "Testing offline before deploying",
    correct: "A",
    explanation: "It's a safety mechanism, not a measurement one — sized to detect catastrophes fast, not to detect 1% lifts. Ramping 1% → 5% → 25% → 100% is the usual shape."
  },
  {
    id: "onl-014",
    topic: "online · experiments",
    type: "two-choice",
    question: "Statistical power is the probability of…",
    optionA: "Rejecting a true null hypothesis",
    optionB: "Detecting an effect that is genuinely there",
    correct: "B",
    explanation: "1 − β, conventionally targeted at 80%. Underpowered tests don't just fail to find wins — the wins they do find are systematically overstated."
  },

  /* ---------------------------------------------------------------------------
     ONLINE — PRODUCT & SYSTEM METRICS
     ------------------------------------------------------------------------ */
  {
    id: "onl-101",
    topic: "online · product",
    type: "two-choice",
    question: "CTR alone is a risky north star for a feed because…",
    optionA: "It's too hard to measure reliably",
    optionB: "It rewards whatever provokes a click, not what satisfies",
    correct: "B",
    explanation: "The standard fix is a composite: pair CTR with dwell time, completion rate, and explicit signals like hides and 'not interested', so bait costs you somewhere."
  },
  {
    id: "onl-102",
    topic: "online · system",
    type: "two-choice",
    question: "Why do teams monitor p99 latency rather than the mean?",
    optionA: "The mean hides a slow tail that a meaningful share of requests actually experience",
    optionB: "p99 is cheaper to compute",
    correct: "A",
    explanation: "A page that fans out to 10 backend calls hits the p99 of at least one of them surprisingly often. Tail latency is what users feel."
  },
  {
    id: "onl-103",
    topic: "online · system",
    type: "true-false",
    question: "Throughput (QPS) and latency can be traded against each other via batching.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Bigger inference batches raise GPU utilization and QPS while adding queueing delay per request. The batch-size knob is exactly where this trade-off is set."
  },
  {
    id: "onl-104",
    topic: "online · system",
    type: "two-choice",
    question: "For a streaming LLM endpoint, the metric users feel first is…",
    optionA: "Total generation time",
    optionB: "Time to first token",
    correct: "B",
    explanation: "TTFT governs perceived responsiveness; inter-token latency governs whether the stream reads smoothly. Total time matters much less once text is moving."
  },
  {
    id: "onl-105",
    topic: "online · product",
    type: "two-choice",
    question: "D7 retention means…",
    optionA: "The share of a cohort still active on day 7 after signup",
    optionB: "The share of users active 7 days in a row",
    correct: "A",
    explanation: "Cohort-anchored, not streak-based. D1/D7/D30 is the standard shape check on whether the product has a habit in it."
  },
  {
    id: "onl-106",
    topic: "online · product",
    type: "true-false",
    question: "Session length is always a metric you want to increase.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "For a support search tool, a long session means the user couldn't find the answer. Always ask whether more time on task is success or failure for this particular product."
  },

  /* ---------------------------------------------------------------------------
     MONITORING & DRIFT
     ------------------------------------------------------------------------ */
  {
    id: "mon-001",
    topic: "monitoring · drift",
    type: "two-choice",
    question: "PSI (Population Stability Index) detects…",
    optionA: "Overfitting during training",
    optionB: "A shift in a feature's or score's distribution versus a reference window",
    correct: "B",
    explanation: "Common rules of thumb: under 0.1 is stable, 0.1–0.25 warrants a look, above 0.25 is a real shift. It's a binned relative-entropy measure under a friendlier name."
  },
  {
    id: "mon-002",
    topic: "monitoring · drift",
    type: "two-choice",
    question: "Concept drift is…",
    optionA: "P(y | x) changes — the input-to-label relationship itself moves",
    optionB: "P(x) changes while the relationship holds",
    correct: "A",
    explanation: "Fraud tactics adapting to your detector is concept drift, and no amount of reweighting old data fixes it. Option B is covariate shift."
  },
  {
    id: "mon-003",
    topic: "monitoring · drift",
    type: "two-choice",
    question: "Covariate shift is…",
    optionA: "P(y | x) changes",
    optionB: "P(x) changes while P(y | x) stays put",
    correct: "B",
    explanation: "You expanded to a new region, so the input mix moved but the underlying physics didn't. Importance weighting can help here in a way it can't for concept drift."
  },
  {
    id: "mon-004",
    topic: "monitoring · drift",
    type: "true-false",
    question: "You can monitor prediction drift even when ground-truth labels arrive weeks later.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Input distributions and output score distributions are available in real time; labels aren't. That's why unsupervised drift signals are the first line of defense in long-feedback-loop systems like credit and churn."
  },
  {
    id: "mon-005",
    topic: "monitoring",
    type: "two-choice",
    question: "Training–serving skew most often comes from…",
    optionA: "Two separately implemented feature pipelines that quietly disagree",
    optionB: "A learning rate set too low",
    correct: "A",
    explanation: "Batch SQL for training, streaming Java for serving, and one of them handles nulls or timezones differently. A shared feature store exists mostly to make this class of bug impossible."
  },
  {
    id: "mon-006",
    topic: "monitoring · drift",
    type: "two-choice",
    question: "The KS statistic compares…",
    optionA: "Two confusion matrices",
    optionB: "Two cumulative distribution functions",
    correct: "B",
    explanation: "The maximum vertical gap between two CDFs — nonparametric and easy to run per feature. On huge samples it flags trivial differences, so pair it with an effect-size threshold."
  },
  {
    id: "mon-007",
    topic: "monitoring",
    type: "true-false",
    question: "A model whose input distributions look perfectly stable can still be silently failing.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Concept drift, label leakage that only shows at serving time, and feedback loops all leave input distributions untouched. Stable inputs are a necessary but nowhere near sufficient health signal."
  },
  {
    id: "mon-008",
    topic: "monitoring",
    type: "two-choice",
    question: "A recommender's own outputs shaping the training data it later learns from is called…",
    optionA: "A feedback loop",
    optionB: "Covariate shift",
    correct: "A",
    explanation: "The model teaches itself that whatever it promoted is popular, and the rich get richer. Randomized exploration traffic is the standard antidote — a small permanent tax for unbiased data."
  },

  /* ---------------------------------------------------------------------------
     TRAINING METRICS
     ------------------------------------------------------------------------ */
  {
    id: "trn-001",
    topic: "training",
    type: "two-choice",
    question: "Training loss falling while validation loss climbs means…",
    optionA: "Overfitting",
    optionB: "Underfitting",
    correct: "A",
    explanation: "The model is memorizing the training set. Reach for more data, augmentation, regularization, or early stopping — not more parameters."
  },
  {
    id: "trn-002",
    topic: "training",
    type: "two-choice",
    question: "The generalization gap is…",
    optionA: "Test accuracy minus human accuracy",
    optionB: "Validation loss minus training loss",
    correct: "B",
    explanation: "It's the number that tells you whether your remaining error is a capacity problem or a data problem. A tiny gap with high error means underfitting; a large gap means the opposite."
  },
  {
    id: "trn-003",
    topic: "training",
    type: "true-false",
    question: "A gradient norm spiking right before a loss spike is a classic instability signature.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "It's why grad-norm is plotted next to loss on every large training run. The usual responses are tighter clipping, a lower learning rate, skipping the offending batch, or rolling back a few hundred steps."
  },
  {
    id: "trn-004",
    topic: "training",
    type: "two-choice",
    question: "Gradient clipping constrains…",
    optionA: "The learning rate schedule",
    optionB: "The magnitude of the update, leaving its direction alone",
    correct: "B",
    explanation: "Norm-based clipping rescales the whole gradient vector when it exceeds a threshold. It's a stability guardrail, not a convergence-speed knob."
  },
  {
    id: "trn-005",
    topic: "training · efficiency",
    type: "two-choice",
    question: "MFU (Model FLOPs Utilization) is…",
    optionA: "Achieved FLOPs as a fraction of the hardware's theoretical peak",
    optionB: "GPU memory in use versus memory available",
    correct: "A",
    explanation: "Large transformer runs typically land in the 35–55% range. Low MFU points to communication overhead, pipeline bubbles, or a data loader that can't keep up."
  },
  {
    id: "trn-006",
    topic: "training",
    type: "two-choice",
    question: "The update-to-weight ratio is a healthy diagnostic when it sits around…",
    optionA: "1e-1",
    optionB: "1e-3",
    correct: "B",
    explanation: "Karpathy's rule of thumb: updates should be about a thousandth of the weight magnitude. Much larger and you're thrashing; much smaller and that layer is barely learning."
  },
  {
    id: "trn-007",
    topic: "training · efficiency",
    type: "two-choice",
    question: "Tokens per second is primarily a…",
    optionA: "Throughput metric",
    optionB: "Quality metric",
    correct: "A",
    explanation: "It sets how much compute your budget buys. Pair it with MFU: tokens/sec tells you the rate, MFU tells you whether the rate is close to what the hardware could do."
  },
  {
    id: "trn-008",
    topic: "training",
    type: "true-false",
    question: "Learning rate warmup mainly exists to stop large early updates from destabilizing training.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "At step zero the adaptive optimizer's variance estimates are garbage and the weights are random, so full-size steps can wreck the run. Ramping over a few hundred to few thousand steps fixes it."
  },
  {
    id: "trn-009",
    topic: "training",
    type: "two-choice",
    question: "Bits-per-byte is preferred over perplexity when…",
    optionA: "Comparing models that use different tokenizers",
    optionB: "Comparing checkpoints of a single model",
    correct: "A",
    explanation: "Perplexity is per-token, so a model with a bigger vocabulary gets a free-looking win. Normalizing by raw bytes puts everyone on the same denominator."
  },
  {
    id: "trn-010",
    topic: "training",
    type: "two-choice",
    question: "Early stopping monitors…",
    optionA: "Training loss",
    optionB: "A validation metric, with patience before it halts",
    correct: "B",
    explanation: "Training loss almost always keeps improving, so it can never tell you to stop. Note the leakage risk: the validation set you stop on has been partly optimized against."
  },
  {
    id: "trn-011",
    topic: "training · RL",
    type: "two-choice",
    question: "In PPO, clip fraction tells you…",
    optionA: "How often the probability ratio hit the clipping boundary",
    optionB: "How much of the reward was clipped",
    correct: "A",
    explanation: "Persistently high clip fraction means the policy is trying to move further per step than PPO permits — usually a signal to lower the learning rate or shrink the update size."
  },
  {
    id: "trn-012",
    topic: "training · RLHF",
    type: "two-choice",
    question: "KL divergence to the reference policy is tracked during RLHF in order to…",
    optionA: "Measure sample throughput",
    optionB: "Catch the policy drifting off and over-optimizing the reward model",
    correct: "B",
    explanation: "Reward models are imperfect proxies, so a policy that wanders far from the reference finds exploits rather than genuine improvements. Rising KL alongside rising reward and falling human ratings is the reward-hacking signature."
  },
  {
    id: "trn-013",
    topic: "training · RL",
    type: "two-choice",
    question: "A value function's explained variance sitting near zero means…",
    optionA: "The critic predicts returns no better than guessing the mean",
    optionB: "The critic is essentially perfect",
    correct: "A",
    explanation: "Explained variance of 1.0 is a perfect critic, 0 is mean-prediction, and negative is worse than that. A useless critic makes your advantage estimates pure noise."
  },
  {
    id: "trn-014",
    topic: "training · RLHF",
    type: "true-false",
    question: "Reward model accuracy on held-out human preference pairs is an offline metric.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "It's held-out data scored before deployment, so it's offline by definition — even though the artifact it validates is part of an online-facing training loop. The families describe when you measure, not what you're measuring."
  },
  {
    id: "trn-015",
    topic: "training",
    type: "two-choice",
    question: "Loss going NaN mid-run most often points to…",
    optionA: "Too much training data",
    optionB: "Numerical overflow — fp16 range, a bad learning rate, or a division by zero",
    correct: "B",
    explanation: "Check the loss-scaler history, the max activation magnitudes, and whether the run has a bad batch. bf16's wider exponent range is why it largely displaced fp16 for large training."
  },
  {
    id: "trn-016",
    topic: "training",
    type: "two-choice",
    question: "Effective batch size = per-device batch × gradient accumulation steps × …",
    optionA: "Number of data-parallel devices",
    optionB: "Number of epochs",
    correct: "A",
    explanation: "Getting this wrong is why a run reproduces differently on a new cluster. Effective batch size, not per-device batch, is what your learning rate should be tuned against."
  },
  {
    id: "trn-017",
    topic: "training",
    type: "two-choice",
    question: "A learning curve where both training and validation loss plateau high suggests…",
    optionA: "Underfitting — capacity, features, or optimization is the limit",
    optionB: "Overfitting",
    correct: "A",
    explanation: "No gap and bad performance means the model can't represent or can't reach the solution. More regularization here makes things strictly worse."
  },
  {
    id: "trn-018",
    topic: "training",
    type: "true-false",
    question: "Validation loss and your target business metric can move in opposite directions.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Cross-entropy weights every example equally; your business doesn't. A model that gets slightly worse on the bulk of easy cases while improving on high-value ones can lose on loss and win on revenue."
  },

  /* ---------------------------------------------------------------------------
     METRIC LAYERS — which of the four is actually moving
     ------------------------------------------------------------------------ */
  {
    id: "tax-011",
    topic: "taxonomy",
    type: "two-choice",
    question: "A bank picks between two fraud models using Precision@5,000 on last quarter's labelled transactions. That number is a…",
    optionA: "Offline metric",
    optionB: "Online metric",
    correct: "A",
    explanation: "Held-out historical data, no live traffic, rerunnable on every commit. Note the 5,000 comes from analyst capacity — the offline metric is shaped by a production constraint even though it never touches production."
  },
  {
    id: "tax-012",
    topic: "taxonomy",
    type: "two-choice",
    question: "After launch the same bank tracks manual-review yield: the share of reviewed alerts that turn out to be real fraud. Which family?",
    optionA: "Offline metric",
    optionB: "Online metric",
    correct: "B",
    explanation: "Live traffic, real analysts, labels arriving late. It is the production echo of Precision@K — and when the two disagree, the held-out set is usually the stale one."
  },
  {
    id: "tax-013",
    topic: "taxonomy",
    type: "two-choice",
    question: "A search team trains with pairwise ranking loss and ships whichever model wins on NDCG@10. Which of the two is the training objective?",
    optionA: "The pairwise ranking loss",
    optionB: "NDCG@10",
    correct: "A",
    explanation: "NDCG contains a sort, so it has no useful gradient. You optimise a differentiable surrogate and let NDCG pick the winner. Training loss and offline metric being different functions is the normal case, not a smell."
  },
  {
    id: "tax-014",
    topic: "taxonomy",
    type: "true-false",
    question: "The cross-entropy minimised by gradient descent and the log loss on your validation set are the same formula.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Same quantity, two jobs. The training loss has to be differentiable; the offline metric only has to answer 'which model is better?'. Two names for one function is habit, not mathematics."
  },
  {
    id: "tax-015",
    topic: "taxonomy",
    type: "true-false",
    question: "Log loss is inherently an offline metric.",
    optionA: "False",
    optionB: "True",
    correct: "A",
    explanation: "Where you measure it decides. On a frozen validation split it is offline; computed weekly against outcomes that actually landed it is online. No formula knows which side of deployment it is sitting on."
  },

  /* ---------------------------------------------------------------------------
     ARITHMETIC — the confusion matrix, done by hand
     ------------------------------------------------------------------------ */
  {
    id: "off-043",
    topic: "offline · classification",
    type: "two-choice",
    question: "A fraud system sees 100,000 legitimate transactions and wrongly flags 300. The false-positive rate is…",
    optionA: "3%",
    optionB: "0.3%",
    correct: "B",
    explanation: "300 / 100,000. The denominator is the legitimate population, not the alert pile — that is what separates FPR from 1 minus precision, and why a 0.3% FPR can still leave most of your alerts junk."
  },
  {
    id: "off-044",
    topic: "offline · classification",
    type: "two-choice",
    question: "500 patients have the disease and the model finds 450. Recall and false-negative rate are…",
    optionA: "90% and 10%",
    optionB: "90% and 90%",
    correct: "A",
    explanation: "FNR is exactly 1 minus recall — the same fact from the other end. Try saying 'we miss one in ten sick patients' in the review instead of '90% recall' and watch the room react differently."
  },
  {
    id: "off-045",
    topic: "offline · classification",
    type: "two-choice",
    question: "Analysts review 2,000 flagged transactions and confirm 360 as fraud. Precision is…",
    optionA: "82%",
    optionB: "18%",
    correct: "B",
    explanation: "360 / 2,000. Four in five reviews are wasted, which sounds fatal until you price it: at $8 a review and $4,000 a catch, that queue prints money."
  },
  {
    id: "off-046",
    topic: "offline · classification",
    type: "two-choice",
    question: "Precision is 0.80 and recall is 0.50. F1 is closest to…",
    optionA: "0.62",
    optionB: "0.65",
    correct: "A",
    explanation: "2(0.8)(0.5) / 1.3 is about 0.615. The 0.65 is the arithmetic mean — the trap. F1 is harmonic, so it gets dragged toward the weaker number and strong precision cannot buy its way out."
  },
  {
    id: "off-047",
    topic: "offline · classification",
    type: "two-choice",
    question: "A missed fraud costs about $4,000; a false alert costs about $8. Reporting F1 as the headline metric…",
    optionA: "buries a 500:1 cost asymmetry",
    optionB: "balances the two errors correctly",
    correct: "A",
    explanation: "Weighting precision and recall equally is a claim about costs, and here it is off by a factor of five hundred. Score on expected dollars instead: cost of a miss times misses, plus cost of an alert times false alerts."
  },
  {
    id: "off-042",
    topic: "offline · regression",
    type: "two-choice",
    question: "You are predicting hotel prices in dollars and a teammate proposes cross-entropy as the loss. The objection is…",
    optionA: "It scores probabilities, not magnitudes",
    optionB: "It converges too slowly on skewed targets",
    correct: "A",
    explanation: "Cross-entropy asks how much probability mass you put on the true class, and a price has no classes. Reach for MSE, MAE, Huber, or quantile loss depending on whether outliers and asymmetry matter."
  },
  {
    id: "off-048",
    topic: "offline · regression",
    type: "true-false",
    question: "The quantile loss a forecaster trains on and the pinball loss it is scored with are the same function.",
    optionA: "False",
    optionB: "True",
    correct: "B",
    explanation: "Same function, two names — the training and evaluation split again. The real decision is which quantile: the 90th for staffing and inventory, where running out costs more than overshooting."
  },

  /* ---------------------------------------------------------------------------
     SYSTEMS — feature stores and pipelines
     ------------------------------------------------------------------------ */
  {
    id: "sys-001",
    topic: "systems · feature stores",
    type: "two-choice",
    question: "The architectural split between an online and an offline feature store is really about…",
    optionA: "Streaming versus batch processing",
    optionB: "Millisecond single-entity reads versus high-throughput scans",
    correct: "B",
    explanation: "Redis-style online stores answer 'features for this one user, now' in single-digit milliseconds. Warehouse-style offline stores scan billions of rows to build a training set. Either can be fed by batch or stream — the access pattern is what differs."
  },
  {
    id: "sys-006",
    topic: "systems · feature stores",
    type: "two-choice",
    question: "Point-in-time correctness in an offline feature store exists to…",
    optionA: "Stop training features containing post-event information",
    optionB: "Speed up queries by partitioning on date",
    correct: "A",
    explanation: "Join naively and 'total clicks' for a Tuesday event quietly includes Wednesday's clicks. The model looks brilliant offline and collapses in production, because at serving time the future is not available."
  },
  {
    id: "sys-022",
    topic: "systems · feature stores",
    type: "two-choice",
    question: "A central feature registry prevents training–serving skew by…",
    optionA: "Storing model weights alongside the features",
    optionB: "Defining each feature once and compiling it for both paths",
    correct: "B",
    explanation: "The skew comes from a human rewriting a pandas transformation in Java and getting a null default or a rounding rule slightly wrong. One declarative definition, two generated implementations, no translation step left to get wrong."
  },
  {
    id: "sys-011",
    topic: "systems · pipelines",
    type: "two-choice",
    question: "'Clicks in the last five minutes' as a serving feature is typically produced by…",
    optionA: "A nightly warehouse batch job",
    optionB: "A stream engine reading a broker, writing to the online store",
    correct: "B",
    explanation: "Kafka carries the events, Flink holds the rolling window, the result lands in Redis before the next request needs it. A nightly job cannot express 'last five minutes' at all."
  },
  {
    id: "sys-015",
    topic: "systems · pipelines",
    type: "two-choice",
    question: "An on-demand feature is one that…",
    optionA: "Gets refreshed hourly by a stream job",
    optionB: "Must be computed at request time from data unique to that request",
    correct: "B",
    explanation: "Distance between the user's live GPS ping and the restaurant cannot exist before the request arrives. These are also the features most prone to training–serving skew, since the offline version has to reconstruct what the request would have carried."
  },

  /* ---------------------------------------------------------------------------
     SYSTEMS — deployment and failure modes
     ------------------------------------------------------------------------ */
  {
    id: "sys-003",
    topic: "systems · deployment",
    type: "two-choice",
    question: "In a shadow deployment, what happens to the new model's prediction?",
    optionA: "It is shown to a small slice of live users",
    optionB: "It is logged for analysis and never shown to anyone",
    correct: "B",
    explanation: "Requests are mirrored to V2 while V1 still answers. You get production traffic, production features and real latency numbers at zero blast radius. What you cannot get is user response — nobody ever saw V2's output."
  },
  {
    id: "sys-020",
    topic: "systems · deployment",
    type: "two-choice",
    question: "A canary release typically starts by routing what share of traffic to the new model?",
    optionA: "1–5%",
    optionB: "About 50%",
    correct: "A",
    explanation: "Small enough that a catastrophic bug is a rounding error, large enough to surface one. You ramp on the way up. Fifty-fifty is an A/B test — a different tool answering a different question."
  },
  {
    id: "sys-010",
    topic: "systems · deployment",
    type: "two-choice",
    question: "The distinctive risk of A/B testing a model, versus shadow or canary, is…",
    optionA: "A bad model hits real business metrics for a large cohort",
    optionB: "It cannot measure revenue",
    correct: "A",
    explanation: "That exposure is the whole point — it is the only way to read causal business impact. But a 50/50 split means half your users live with V2's mistakes for the length of the test, which is why you canary first and A/B second."
  },
  {
    id: "sys-008",
    topic: "systems · deployment",
    type: "two-choice",
    question: "You are canarying a loan-default model whose real label takes six months. You evaluate it using…",
    optionA: "Short-term proxy labels, like a missed first payment",
    optionB: "Data drift metrics alone",
    correct: "A",
    explanation: "A correlated early signal catches a catastrophically broken model in days. It is a proxy and it will drift from the real thing — you still reconcile against true defaults later, you just do not block the release on them."
  },
  {
    id: "sys-002",
    topic: "systems · failures",
    type: "two-choice",
    question: "Your inference server slows down and callers start piling up on it. The pattern that stops the cascade is…",
    optionA: "A circuit breaker with a fallback",
    optionB: "Gradient accumulation",
    correct: "A",
    explanation: "Once latency or error rate crosses a threshold the breaker trips and traffic goes straight to something cheap and safe — cached popular items, a heuristic, last known good. Serving something mediocre instantly beats hanging every upstream service."
  },
  {
    id: "sys-013",
    topic: "systems · failures",
    type: "two-choice",
    question: "Your recommender runs out of memory during live inference. The usual culprit is…",
    optionA: "The training batch size is set too high",
    optionB: "Unbounded feature history pulled in for a single request",
    correct: "B",
    explanation: "One bot or power user with a million logged events, no truncation rule in the feature fetch, and the container dies. Cap history length at retrieval time — the model almost never needs more than the recent window."
  },
  {
    id: "sys-017",
    topic: "systems · failures",
    type: "two-choice",
    question: "Monitoring and feature logging are kept off the synchronous inference path so that…",
    optionA: "Drift detection becomes more accurate",
    optionB: "Logging problems cannot add latency or fail the prediction",
    correct: "B",
    explanation: "Write to a broker and let the monitoring pipeline consume at its own pace. Otherwise a slow analytics sink becomes a user-facing outage — the observability system taking down the thing it observes."
  },
  {
    id: "sys-023",
    topic: "systems · failures",
    type: "two-choice",
    question: "Gradient accumulation is the fix for…",
    optionA: "Latency spikes at serving time",
    optionB: "Training OOM when the batch you want exceeds VRAM",
    correct: "B",
    explanation: "Run four micro-batches of 32, sum the gradients, step once — near-equivalent to a batch of 128 without ever holding it in memory. It buys memory with wall-clock time, and does nothing whatsoever for inference."
  },

  /* ---------------------------------------------------------------------------
     SYSTEMS — architecture and retrieval
     ------------------------------------------------------------------------ */
  {
    id: "sys-007",
    topic: "systems · architecture",
    type: "two-choice",
    question: "A brand-new item with zero interactions arrives in a two-tower retrieval system. What happens?",
    optionA: "It waits for the overnight retrain",
    optionB: "The item tower embeds its metadata and it is immediately scorable",
    correct: "B",
    explanation: "That is the main reason to pay the two-tower tax. If the item tower consumes title, description and image rather than an ID lookup, a cold item lands in the same vector space as everything else the moment it exists."
  },
  {
    id: "sys-016",
    topic: "systems · architecture",
    type: "two-choice",
    question: "Pulling 1,000 candidates from a 10-million-item catalogue in under 100 ms calls for…",
    optionA: "Scoring every item with a light model",
    optionB: "Approximate nearest-neighbour search over embeddings",
    correct: "B",
    explanation: "Ten million scores per request is not happening at any model size. ANN indexes trade exactness for sub-linear lookup — you accept missing a few true neighbours to get the shortlist the expensive ranker then re-scores."
  },
  {
    id: "sys-009",
    topic: "systems · architecture",
    type: "two-choice",
    question: "Ad CTR prediction under a 50 ms budget. Which stack?",
    optionA: "An LLM doing zero-shot classification",
    optionB: "A factorisation-machine hybrid with features from an in-memory store",
    correct: "B",
    explanation: "DeepFM-style models are built for exactly this: sparse categorical crosses at tiny inference cost. The latency usually is not the model anyway — it is the feature fetch, which is why those features live in Redis."
  },
  {
    id: "sys-024",
    topic: "systems · architecture",
    type: "two-choice",
    question: "In a RAG pipeline, the cross-encoder re-ranker exists to…",
    optionA: "Precisely re-order the top few dozen retrieved chunks",
    optionB: "Fetch the initial thousands of candidates",
    correct: "A",
    explanation: "Bi-encoders embed query and document separately, which is what makes them indexable and approximate. A cross-encoder reads both together — far more accurate, far too slow for the whole corpus, exactly right for a shortlist."
  },

  /* ---------------------------------------------------------------------------
     SYSTEMS — feedback loops, bias, and cold start
     ------------------------------------------------------------------------ */
  {
    id: "sys-004",
    topic: "systems · bias",
    type: "two-choice",
    question: "Inverse propensity weighting corrects position bias by…",
    optionA: "Dividing a clicked item's loss by the chance it was examined",
    optionB: "Dropping all rank-1 clicks from training",
    correct: "A",
    explanation: "A click at rank 9 is rare because fewer people look that far, not because the item is worse. Dividing by the examination probability scales those clicks back up to what they would have been had everyone seen them."
  },
  {
    id: "sys-025",
    topic: "systems · bias",
    type: "two-choice",
    question: "IPW destabilises training when propensities get tiny. The standard fix is…",
    optionA: "Add more RAM",
    optionB: "Clip propensities at a floor",
    correct: "B",
    explanation: "A propensity of 0.001 turns one click into a 1000x weight, and takes the gradient step with it. Clipping caps the multiplier — you trade a little residual bias for a model that actually converges."
  },
  {
    id: "sys-012",
    topic: "systems · bias",
    type: "two-choice",
    question: "Randomising the order of identical items is the gold standard for measuring position bias because…",
    optionA: "It isolates position from relevance",
    optionB: "It requires no engineering work",
    correct: "A",
    explanation: "If two items are interchangeable and swapping their slots changes CTR, the difference is position and nothing else. It costs you some ranking quality on the randomised traffic — that is the price of an unbiased estimate."
  },
  {
    id: "sys-018",
    topic: "systems · bias",
    type: "two-choice",
    question: "Expectation-maximisation estimates position bias from historical logs by…",
    optionA: "Shuffling live results for real users",
    optionB: "Iteratively separating probability of examination from relevance",
    correct: "B",
    explanation: "You observe clicks; you never observe whether the user looked. EM alternates between guessing examination probabilities and re-estimating relevance until it settles. Cheaper than randomisation because it touches no live traffic — and it leans harder on its own assumptions."
  },
  {
    id: "sys-014",
    topic: "systems · bias",
    type: "two-choice",
    question: "The long-run damage from a feed that only exploits known preferences is…",
    optionA: "New content starves and users eventually get bored",
    optionB: "Inference latency climbs",
    correct: "A",
    explanation: "Pure exploitation looks excellent on next-session engagement while hollowing out the catalogue underneath it. Nothing new gets impressions, so nothing new gets data, so the model never learns that it was any good."
  },
  {
    id: "sys-005",
    topic: "systems · cold start",
    type: "two-choice",
    question: "You need CTR data for items nobody has ever seen. The deliberate strategy is…",
    optionA: "Matrix factorisation over the existing interaction matrix",
    optionB: "Bandit exploration — spend a slice of traffic on unknowns",
    correct: "B",
    explanation: "Factorisation can only interpolate from interactions that exist, and a brand-new item has none. Epsilon-greedy or UCB pays a small, bounded engagement cost now to buy the data that makes the item rankable later."
  },
  {
    id: "sys-019",
    topic: "systems · cold start",
    type: "two-choice",
    question: "Asking a new user to pick five artists at signup solves user cold start by…",
    optionA: "Falling back to device metadata",
    optionB: "Buying an explicit preference vector before the first feed",
    correct: "B",
    explanation: "It converts an unanswerable question into a short form. The cost is friction at the highest-drop-off moment in the funnel, which is why it is usually five taps and skippable."
  },

  /* ---------------------------------------------------------------------------
     MORE METRIC CHOICES — picking the right one for the job
     ------------------------------------------------------------------------ */
  {
    id: "off-217",
    topic: "offline · ranking",
    type: "two-choice",
    question: "You need one offline metric for a search system where the order of the top results is the whole game. Reach for…",
    optionA: "ROC-AUC",
    optionB: "NDCG",
    correct: "B",
    explanation: "AUC scores whether relevant beats irrelevant anywhere in the list. NDCG discounts by position, so the same good result counts for far less at rank 8 than at rank 1. Accuracy and MSE are not in the conversation — nothing here is a class or a magnitude."
  },
  {
    id: "off-218",
    topic: "offline · ranking",
    type: "two-choice",
    question: "'People you may know' graph recommendations often weight recall heavily because…",
    optionA: "A missed real-world friend costs network growth",
    optionB: "Precision cannot be computed on graphs",
    correct: "A",
    explanation: "An irrelevant suggestion is a shrug; a connection never surfaced may never happen at all. Social products compound on graph density, so false negatives get charged against long-term growth, not just this session."
  },
  {
    id: "onl-107",
    topic: "online · product",
    type: "two-choice",
    question: "Your business metric is ad revenue on a video feed. Which model-facing metric tracks it best?",
    optionA: "CTR alone",
    optionB: "Total watch time",
    correct: "B",
    explanation: "CTR only buys the start of a session; mid-roll inventory scales with minutes watched. Optimising clicks alone reliably produces thumbnail bait — high CTR, short sessions, less revenue than you started with."
  },
  {
    id: "mon-009",
    topic: "monitoring · drift",
    type: "two-choice",
    question: "Which kind of drift can you only confirm once ground-truth labels arrive?",
    optionA: "Covariate shift",
    optionB: "Concept drift",
    correct: "B",
    explanation: "Input and prediction distributions are observable the moment traffic lands. Concept drift is a change in P(y|x) — the relationship itself — and you cannot see that the mapping moved until you learn what actually happened."
  },

  /* ---------------------------------------------------------------------------
     WRITTEN — answered in your own words, marked against the reference answer.

     These exist because recognising the right option and being able to say the
     thing are different skills, and only one of them survives contact with a
     design review. Ask for a specific amount ("in a sentence", "name two") —
     an open-ended prompt is marked against an answer that had a shape in mind.
     ------------------------------------------------------------------------ */
  {
    id: "wri-001",
    topic: "offline · classification",
    type: "open",
    question: "A fraud model is reported at 99.4% accuracy on last month's traffic. In a sentence: why is that number close to useless, and what would you ask for instead?",
    answer: "Fraud is a tiny fraction of transactions, so predicting 'not fraud' every time scores about the same. Ask for precision and recall on the fraud class — or PR-AUC — because only the positive class carries any information.",
    keyPoints: [
      "the classes are heavily imbalanced, so accuracy is dominated by the majority class",
      "asks for a positive-class metric: precision, recall, F1 or PR-AUC"
    ],
    explanation: "This is the base-rate trap. At 0.6% fraud, the all-negative model scores 99.4% and catches nothing. Any metric that averages over both classes will be swamped by the majority; the ones worth reporting condition on the class you actually care about."
  },
  {
    id: "wri-002",
    topic: "taxonomy",
    type: "open",
    question: "A model wins on every offline metric and still loses the A/B test. Name two mechanisms that produce that.",
    answer: "The held-out set no longer matches live traffic, so offline gains do not transfer. The offline metric is a proxy that has come apart from the business metric — better ranking that surfaces less profitable items, say. The training labels came from the old model's own exposure, so the gain is partly logging artefact. Or the new model is slower, and the latency costs more than the quality wins.",
    keyPoints: [
      "two distinct mechanisms, not one restated",
      "each one explains a gap between the offline measurement and live outcomes"
    ],
    explanation: "Offline metrics are cheap, repeatable proxies measured on a frozen snapshot. Every one of these failures is the same shape: something true of the snapshot is not true of live traffic. That is why the A/B test is the arbiter and the offline suite is the filter."
  },
  {
    id: "wri-003",
    topic: "online · experiments",
    type: "open",
    question: "What is sample ratio mismatch, and why does seeing one stop you reading the rest of the results?",
    answer: "The observed split between arms differs from the designed split by more than chance would explain — 50/50 comes out 52/48 on a million users. It means assignment or logging is broken, so the two groups are no longer comparable, and any lift you read could be that bug rather than the treatment.",
    keyPoints: [
      "the realised allocation differs from the designed one beyond chance",
      "randomisation or logging is broken, so the groups are not comparable"
    ],
    explanation: "SRM is the smoke alarm of experimentation. The whole inference rests on the two arms differing only in the treatment; a mismatch is direct evidence that something else differs too. Common causes: a redirect that drops users, arm-specific errors, bot filtering applied after assignment."
  },
  {
    id: "wri-004",
    topic: "business",
    type: "open",
    question: "A SaaS business reports net revenue retention of 118%. Say what that means and what it implies about growth.",
    answer: "The cohort of customers they already had a year ago is now paying 18% more, after churn and downgrades are subtracted from upgrades and expansion. Revenue grows even if they sell to nobody new, so new sales compound on a base that is itself rising.",
    keyPoints: [
      "expansion from existing customers exceeds churn and contraction",
      "the existing base grows without any new acquisition"
    ],
    explanation: "NRR above 100% is the one number that separates a durable subscription business from a leaky one. Below 100% you are running to stand still: acquisition has to refill the bucket before it can grow. It is also why NRR gets read alongside CAC payback — cheap growth is expansion, not acquisition."
  },
  {
    id: "wri-005",
    topic: "training",
    type: "open",
    question: "Training loss is still falling; validation loss has risen for three epochs. Name what you are looking at and one thing you would do about it.",
    answer: "Overfitting — the model is now memorising the training set rather than learning anything that transfers. Stop at the validation minimum (early stopping and keep that checkpoint), or add regularisation, augmentation or data, or cut model capacity.",
    keyPoints: [
      "identifies overfitting from the diverging train/val gap",
      "one concrete remedy: early stopping, regularisation, more data, or less capacity"
    ],
    explanation: "The gap between the two curves is the quantity of interest, not either curve alone. A rising validation loss with falling training loss is the textbook signature; the checkpoint you want is the one at the validation minimum, not the one at the end of the run."
  },
  {
    id: "wri-006",
    topic: "monitoring · drift",
    type: "open",
    question: "Input distributions look identical to training, but accuracy has fallen. Which kind of drift is that, and how would you confirm it?",
    answer: "Concept drift: P(y|x) has moved, so the same inputs now imply different outcomes. Confirming it needs labels — score a freshly labelled sample from the current period and compare against the same model's performance on older labelled data.",
    keyPoints: [
      "concept drift — the input-to-label relationship changed, not the inputs",
      "confirmation requires ground-truth labels from the current period"
    ],
    explanation: "Covariate shift is visible the moment traffic lands, because inputs are observable. Concept drift is invisible until the world tells you what actually happened, which is exactly why label latency is a monitoring problem and not just a training one."
  },
  {
    id: "wri-007",
    topic: "offline · calibration",
    type: "open",
    question: "In a sentence or two: what does it mean for a model to be well calibrated, and when would you care about that more than about AUC?",
    answer: "Among the cases it scores at 0.3, close to 30% actually happen — the numbers mean what they say. It matters more than AUC whenever the probability itself feeds a decision: expected-value thresholds, pricing, triage, anything where you multiply by a cost.",
    keyPoints: [
      "predicted probabilities match observed frequencies",
      "matters when the probability is consumed as a number, not just as a ranking"
    ],
    explanation: "AUC only knows about order. A model that outputs every probability at half its true value can have a perfect AUC and be useless for deciding anything — the ranking survives the distortion, the arithmetic does not."
  },
  {
    id: "wri-008",
    topic: "systems · architecture",
    type: "open",
    question: "Why does two-tower retrieval keep the user and item towers separate instead of running one cross-encoder over each pair?",
    answer: "Separate towers mean the item embeddings can be computed in advance and put in an ANN index, and the user tower runs once per request — so scoring millions of items is a nearest-neighbour lookup. A cross-encoder has to see both sides together, which is one forward pass per candidate. It gets used to rerank the few hundred that retrieval returns.",
    keyPoints: [
      "item embeddings are precomputed and indexed; the user side runs once per request",
      "a cross-encoder cannot be precomputed, so it does not scale to the full catalogue"
    ],
    explanation: "This is the retrieval/ranking split in one sentence of architecture. Two towers buy sublinear search at the cost of never letting the two sides interact before the dot product; the cross-encoder buys that interaction back at a price you can only pay on a shortlist."
  },

  /* ---------------------------------------------------------------------------
     SCENARIOS — one setup, then follow-ups that only make sense after the last
     answer. This is where the deck stops testing definitions and starts testing
     whether you can carry a diagnosis forward.
     ------------------------------------------------------------------------ */
  {
    id: "scn-001",
    topic: "monitoring · drift",
    type: "scenario",
    scenario: "A recommender that has been stable for months loses 8% of its click-through rate overnight. No model, code or config shipped, and the drop is the same on every device and in every country.",
    steps: [
      {
        question: "Where do you look first?",
        optionA: "Offline metrics on the frozen test set",
        optionB: "The features being served to live traffic",
        correct: "B",
        explanation: "The frozen test set cannot have changed — that is what frozen means, and re-running it tells you about a model nobody touched. An overnight, uniform, deploy-free drop points at an input that moved, and the inputs live in the serving path."
      },
      {
        question: "The job that writes the user-history feature failed at midnight, and the online store has been serving yesterday's values ever since. What is that, precisely?",
        optionA: "Training–serving skew",
        optionB: "Concept drift",
        correct: "A",
        explanation: "The model is being fed something different in production from what it was trained on — stale values where fresh ones were assumed. The world has not changed and neither has P(y|x); the pipeline has. Skew is a defect, drift is a fact of life, and they get fixed by different teams."
      },
      {
        type: "open",
        question: "The pipeline is repaired and CTR recovers. What do you add so that the next silent feature failure is caught before users are?",
        answer: "Monitor the features themselves, not just the model: alert on staleness — the age of the newest row in the online store, per feature — plus null rate and a distribution check against the training reference. Freshness is the one that catches this, because a stale feature is perfectly well-formed.",
        keyPoints: [
          "monitoring on the features/pipeline rather than only on model or business metrics",
          "feature freshness or staleness specifically, since the values stayed valid"
        ],
        explanation: "CTR did notice, eventually, and that is the problem — a business metric is a lagging, noisy, low-resolution alarm for a plumbing failure. Staleness is the direct signal: it fires at 00:05, names the feature, and does not need a week of traffic to reach significance."
      }
    ]
  },
  {
    id: "scn-002",
    topic: "online · experiments",
    type: "scenario",
    scenario: "A checkout redesign shows a 12% lift in conversion after four days of testing. It is the biggest win the team has had all year, and they want to ship it on Monday.",
    steps: [
      {
        question: "What do you check before you believe the number at all?",
        optionA: "Whether the arms are split the way the design says",
        optionB: "Whether the lift beats last quarter's best test",
        correct: "A",
        explanation: "A sample ratio mismatch invalidates everything downstream of it, so it is the first check and a hard stop. Comparing the lift against other experiments is a story about your team, not evidence about this treatment."
      },
      {
        question: "The split is clean. The test ran Thursday to Sunday. What specifically is wrong with that window?",
        optionA: "It is not a whole number of weeks, so the arms are being read on an unrepresentative mix of days",
        optionB: "Four days is never enough to compute a p-value",
        correct: "A",
        explanation: "Checkout behaviour has a strong weekly shape — weekend traffic converts differently from Tuesday's. Both arms see the same days, so this is not bias between arms; it is a lift measured on a slice of the week and quietly generalised to all of it. You can compute a p-value on four days; it just answers a narrower question than the one being asked."
      },
      {
        type: "open",
        question: "It holds over two full weeks and you ship it. What do you keep running afterwards, and why?",
        answer: "A long-term holdout: a small slice of traffic that never gets the new checkout, left running for months. Short experiments cannot see novelty wearing off, users learning the new flow, or the win being taken from some other surface rather than created — the holdout measures the change against a real counterfactual long after the test ended.",
        keyPoints: [
          "a long-term holdout or reserved control group kept after launch",
          "a reason a two-week result can decay: novelty, learning effects, or cannibalisation"
        ],
        explanation: "Two weeks measures the launch, not the change. Effects that decay and effects that are stolen from elsewhere both look identical to a win at short horizons, and the only instrument that separates them is a control group that outlives the experiment."
      }
    ]
  },
  {
    id: "scn-003",
    topic: "business · decisions",
    type: "scenario",
    scenario: "Your fraud model scores every transaction. Blocking a fraudulent one saves the average chargeback of $180. Blocking a legitimate one costs you a customer whose remaining lifetime value averages $400.",
    steps: [
      {
        type: "open",
        question: "You have a well-calibrated probability p that a transaction is fraud. Write the rule that decides whether to block it.",
        answer: "Block when the expected saving beats the expected cost: 180·p > 400·(1 − p), which solves to p > 400/580 ≈ 0.69. The cut-off comes out of the two costs, not out of the habit of using 0.5.",
        keyPoints: [
          "weighs the two errors by their costs rather than thresholding at 0.5",
          "arrives at a threshold near 0.69 (or the equivalent inequality)"
        ],
        explanation: "A classifier's default 0.5 is an assumption that the two mistakes cost the same, which they almost never do. Here a false positive is more than twice as expensive as a false negative is, so the bar for blocking has to sit well above half."
      },
      {
        question: "Which offline metric tells you whether that rule can work at all?",
        optionA: "Calibration — say, ECE or a reliability curve",
        optionB: "ROC-AUC",
        correct: "A",
        explanation: "The rule consumes p as a number and multiplies it by dollars. AUC would be satisfied by any monotone distortion of those probabilities — perfect ranking, arithmetic that lies. Calibration is the property the threshold is standing on."
      },
      {
        question: "Six months on, chargebacks average $95 while lifetime value is unchanged. What has to move?",
        optionA: "The threshold",
        optionB: "The model's weights",
        correct: "A",
        explanation: "The model's probabilities are still correct — nothing about predicting fraud changed. What moved is the economics, so the cut-off moves with them: p > 400/495 ≈ 0.81, and you now block considerably less. Retraining here would be answering a question nobody asked."
      }
    ]
  },

  /* ---------------------------------------------------------------------------
     REDIS — data structures, delivery guarantees, clustering and the failure
     modes that make each choice a real decision rather than a lookup.
     ------------------------------------------------------------------------ */
  {
    id: "red-001",
    topic: "redis · caching",
    type: "open",
    question: "Your product API reads product 123 out of PostgreSQL over and over, and the row only changes every few minutes. How would you use Redis to cut the database traffic? Name the key, the value, and how you stop it serving stale data forever.",
    answer: "Cache it under a key like product:123, storing the row as JSON or as a Hash. On a read, check Redis first; on a miss, read PostgreSQL, write the result into Redis, and return it. Give the key a TTL — five minutes, say — so a stale copy can only ever be stale for that long.",
    keyPoints: [
      "a key namespaced by id, e.g. product:123",
      "the row stored as JSON or a Hash",
      "a TTL (or explicit invalidation) bounding how stale it can get"
    ],
    explanation: "This is the cache-aside pattern: the application owns the read-through, not Redis. The TTL is doing something subtler than saving memory — it bounds how wrong you are willing to be. Five minutes of staleness on a description is fine; five minutes on a price might not be, and that is how you pick the number."
  },
  {
    id: "red-002",
    topic: "redis · strings",
    type: "open",
    question: "A news site counts views of article 456. There are 100 application servers and thousands of simultaneous readers. How does Redis count them without losing increments, and why do you not need a lock of your own?",
    answer: "Use a String counter, article:456:views, and call INCR. INCR is atomic, so two hundred concurrent increments produce two hundred increments. You need no lock because the read, the add and the write all happen inside Redis as one command — there is no window in which another client can interleave.",
    keyPoints: [
      "INCR on a String key",
      "INCR is atomic, so concurrent increments cannot overwrite one another",
      "no lock needed: the read-modify-write happens inside Redis, not in your process"
    ],
    explanation: "The bug you are avoiding is GET 41 → add one → SET 42, run twice at once, landing on 42 instead of 43. Redis commands are atomic because the server works through them one at a time, so anything expressible as a single command needs no coordination from you. That is the shape of most good Redis solutions: find the one command that already does it."
  },
  {
    id: "red-003",
    topic: "redis · hashes",
    type: "open",
    question: "You have 50 stateless application servers, and a logged-in user may hit a different one on every request. How would a Redis Hash hold that user's session, and why prefer a Hash over storing the whole session as one serialised JSON string?",
    answer: "Store session:abc123 as a Hash with fields like userId, role and lastSeen. Any server can HGET or HSET it, so the session lives beside the fleet rather than inside one machine. A Hash lets you read or write one field without fetching, parsing, re-serialising and writing back the whole blob — cheaper, and free of the lost-update race two servers hit when they each rewrite the same JSON.",
    keyPoints: [
      "session:<id> as a Hash that any server can read",
      "read or update individual fields instead of rewriting the whole object",
      "avoids the read-modify-write race on a serialised blob"
    ],
    explanation: "Statelessness is the whole point: the servers stay interchangeable because none of them owns the session. And the Hash-versus-JSON argument is the same story as INCR — updating one field of a JSON string means two servers can each write back a copy missing the other's change."
  },
  {
    id: "red-004",
    topic: "redis · sets",
    type: "open",
    question: "You are building a social network and need to answer 'does user 123 follow user 456?' very quickly. How would a Redis Set represent that, and what other queries do set operations give you for free?",
    answer: "Keep user:123:following as a Set of the ids that user follows; SISMEMBER user:123:following 456 answers the question in constant time. Because it is a set, SINTER across two users' following sets gives people they both follow, intersecting one user's following with another's followers gives mutuals, and SDIFF gives suggestions — people your friend follows and you do not.",
    keyPoints: [
      "a Set per user holding the ids they follow",
      "SISMEMBER for the membership check",
      "intersection/difference for mutuals, shared follows or suggestions"
    ],
    explanation: "The win is that the data is stored in the shape the question is asked in — the structure is the index. The cost is that you now hold the graph twice if you also want followers, and Redis will not keep the two directions consistent for you."
  },

  {
    id: "red-scn-001",
    topic: "redis · queues",
    type: "scenario",
    scenario: "Your web servers produce image-processing jobs and five workers consume them. You are building the queue on Redis.",
    steps: [
      {
        id: "red-005",
        type: "open",
        question: "Implement a simple FIFO work queue with a Redis List. Which side do producers push to, and which side do workers pop from?",
        answer: "Producers RPUSH the job onto the right of a jobs list and workers LPOP from the left — or better, BLPOP, which parks the worker until something arrives instead of polling. Pushing and popping at opposite ends is what makes it first-in-first-out; using the same end would give you a stack.",
        keyPoints: [
          "push and pop at opposite ends — e.g. RPUSH then LPOP",
          "opposite ends is precisely what makes it FIFO"
        ],
        explanation: "BLPOP is the version you actually want in production: blocking beats spinning on an empty list. Note what this queue does not give you — no acknowledgement, no retry, no way to see who is working on what."
      },
      {
        id: "red-006",
        type: "open",
        question: "A worker pops a job and crashes one millisecond later. What problem do you now have, and why might Redis Streams be a better choice?",
        answer: "The job is gone. LPOP removed it and nothing recorded that a worker had taken it, so there is no way to tell a job that finished from a job that vanished with the process. A Stream read through a consumer group keeps the entry after delivery and tracks it as pending against that consumer until it is acknowledged, so unfinished work stays visible and recoverable.",
        keyPoints: [
          "the job is lost — popping removes it with no record of who took it",
          "Streams retain the entry and track delivery until it is acknowledged"
        ],
        explanation: "This is the difference between a queue and a log with delivery state. RPOPLPUSH into a processing list is the classic List-based patch and it does work, but you end up hand-building what a consumer group already provides: pending entries, ownership, idle time and claiming."
      },
      {
        id: "red-007",
        type: "open",
        question: "You switch to a Stream with a consumer group. Worker A is delivered job 928 and crashes before finishing it. What does Redis know about that job, and how does Worker B eventually process it?",
        answer: "The entry is still in the stream, and the group's pending entries list records that 928 was delivered to A, when, and how many times — it is unacknowledged, not gone. Worker B can find it with XPENDING and take ownership with XCLAIM, or let XAUTOCLAIM sweep anything idle past a threshold. B processes it and calls XACK, which is what finally clears it from the pending list.",
        keyPoints: [
          "the entry remains, tracked in the group's pending entries list against A",
          "another consumer claims it with XCLAIM/XAUTOCLAIM and acknowledges with XACK"
        ],
        explanation: "The pending entries list is the entire feature: delivery and completion are separate events and the gap between them is queryable. The idle threshold is a real judgement call — set it too short and you hand a job to a second worker while the first is merely slow, which is exactly the situation idempotency exists to survive."
      }
    ]
  },

  {
    id: "red-008",
    topic: "redis · streams",
    type: "open",
    question: "A network problem causes a Stream message to be processed twice. The message says 'charge customer $100'. Why is that dangerous, and what property does your worker need?",
    answer: "The customer is charged twice for one order. The worker needs to be idempotent: processing the same logical job any number of times has the same effect as processing it once. In practice that means carrying a stable id — the job id, or an idempotency key on the charge — and having the payment provider or your own database reject the second attempt, rather than trusting that delivery never repeats.",
    keyPoints: [
      "a duplicate charge — real money, taken twice",
      "idempotency: repeated processing has the same effect as processing once",
      "implemented with a unique job or idempotency key checked where the effect lands"
    ],
    explanation: "At-least-once is what almost every queue actually offers, Streams included: a crash between doing the work and acknowledging it is indistinguishable from a crash before doing it. So exactly-once is not a delivery guarantee you buy, it is a property you build at the point of effect. 'Set the balance to X' is naturally idempotent; 'add X to the balance' is not."
  },
  {
    id: "red-009",
    topic: "redis · pub/sub",
    type: "open",
    question: "You are building a live sports dashboard: when a score changes, connected users should see it immediately, and you do not care whether someone offline gets the old updates on reconnect. Pub/Sub or Streams, and why?",
    answer: "Pub/Sub. It is fire-and-forget broadcast to whoever is subscribed at that instant, which is exactly the requirement — only currently-connected users matter, and a client that reconnects can simply fetch the current score rather than replay a history it does not need. A Stream would make you pay for retention, consumer groups and acknowledgement to deliver messages nobody wants.",
    keyPoints: [
      "Pub/Sub",
      "the requirement is delivery to whoever is connected now; a missed message is worthless",
      "current state can be re-fetched, so there is nothing to replay"
    ],
    explanation: "The deciding question is what a missed message costs. Here it costs nothing, because the message is a notification about state you can read at any time. When the message *is* the state — a payment, an order, a job — a missed one costs you everything, and you want a log."
  },
  {
    id: "red-010",
    topic: "redis · pub/sub",
    type: "open",
    question: "A subscriber disconnects at 10:00:00. A publisher sends three messages at 10:00:05. The subscriber reconnects at 10:00:10. What happens to those three messages under Pub/Sub? How does the answer change with Streams?",
    answer: "Under Pub/Sub they are gone for that subscriber. Redis delivers to whoever is connected at publish time and keeps nothing — there is no buffer and no replay, so reconnecting gets you messages from 10:00:10 onward and nothing earlier. With a Stream those three entries are still in the stream, and the consumer resumes from its last id and reads all three, limited only by the stream's retention.",
    keyPoints: [
      "Pub/Sub: the three are lost for that subscriber; Redis never replays",
      "Streams: the entries persist and the consumer catches up from its last position, subject to retention"
    ],
    explanation: "Pub/Sub has no memory at all — it is not a queue with an unlucky delivery policy, it is a broadcast bus. That is also why it handles slow subscribers badly: with no buffer to fall back on, a subscriber that cannot keep up is disconnected once its output buffer limit is reached."
  },
  {
    id: "red-011",
    topic: "redis · sorted sets",
    type: "open",
    question: "A game has millions of players, each with a score, and you constantly need the top 100. Design it with a Sorted Set: what is the member and what is the score?",
    answer: "One Sorted Set, game:leaderboard, with the player id as the member and their points as the score. The top 100 is a single ZREVRANGE 0 99 — logarithmic in the size of the set plus the hundred you asked for, so it costs the same with a million players as with a thousand. A player's own position is ZREVRANK.",
    keyPoints: [
      "member = player id, score = points",
      "top-N with ZREVRANGE (or ZRANGE … REV)",
      "the cost does not grow with the number of players"
    ],
    explanation: "The reason this beats ORDER BY over a table is that the ordering is maintained on write rather than computed on read. You pay a little on every score update to make every leaderboard read cheap, which is the right trade when reads vastly outnumber writes — the shape of essentially every leaderboard."
  },
  {
    id: "red-012",
    topic: "redis · sorted sets",
    type: "open",
    question: "Henry has 7,000 points and is ranked 500th. He earns another 5,000. Conceptually, what happens when you update his score in the Sorted Set? Do you have to remove and reinsert everyone whose ranking changed?",
    answer: "You issue one command — ZADD with the new score, or ZINCRBY 5000 — and Redis moves that one member to its new position. Nobody else is touched. Rank is not stored on a player, it is derived from position, so the players Henry overtook simply answer differently the next time anyone asks.",
    keyPoints: [
      "one ZADD/ZINCRBY moves the member; Redis maintains the ordering",
      "no manual reinsertion — ranks are derived, not stored"
    ],
    explanation: "This is what makes the structure worth using. A rank column in a table means one player's gain is an UPDATE across every row above them; here the sorted set holds the order and rank is a query. The move costs logarithmic time in the number of players, not linear in the number of ranks crossed."
  },

  {
    id: "red-scn-002",
    topic: "redis · rate limiting",
    type: "scenario",
    scenario: "Your API allows each user 100 requests during any rolling 60-second period.",
    steps: [
      {
        id: "red-013",
        type: "open",
        question: "Implement that with a Sorted Set. What is the member, what is the score, what do you remove, and what do you count?",
        answer: "A Sorted Set per user, ratelimit:123. Each request adds a member unique to that request — a uuid, or a timestamp plus counter — scored by the current timestamp. On each request: ZREMRANGEBYSCORE from -inf up to now minus 60 seconds to drop what has aged out, ZCARD what remains, reject if that is already 100, otherwise ZADD the new request. Put a 60-second TTL on the key so idle users cost nothing.",
        keyPoints: [
          "member = a unique per-request id; score = the request timestamp",
          "ZREMRANGEBYSCORE drops entries older than the window",
          "ZCARD counts what is left and gates the request"
        ],
        explanation: "The member has to be unique per request rather than the timestamp itself — two requests in the same millisecond would otherwise collide into one member and you would undercount. The price of that precision is one entry stored per request per window, which is why the TTL matters and why generous limits get expensive."
      },
      {
        id: "red-014",
        type: "open",
        question: "Another engineer proposes INCR user:123:10:30 for a fixed one-minute window instead. What is simpler about that, and what boundary problem does a fixed window introduce that a sliding one avoids?",
        answer: "It is one integer per user per minute: INCR, compare, EXPIRE — constant time, a few bytes, nothing to sweep. The problem is the boundary. A user can send 100 requests at 10:30:59 and 100 more at 10:31:00 — 200 requests in about a second — because the counter resets on a wall-clock edge rather than following the user. A rolling window has no edge to exploit.",
        keyPoints: [
          "one counter per bucket: far cheaper in memory, and O(1)",
          "the boundary burst — up to twice the limit across the edge between two windows"
        ],
        explanation: "Both are defensible; you are choosing what you are protecting. Fixed windows protect a budget, sliding windows protect an instantaneous rate. The middle ground people actually ship is a sliding-window counter: keep two fixed buckets and weight the previous one by how far into the current minute you are — most of the smoothing, almost none of the memory."
      }
    ]
  },

  {
    id: "red-015",
    topic: "redis · locks",
    type: "open",
    question: "Two application servers try to sell the last concert ticket at the same moment. How does a Redis distributed lock coordinate them, and what exactly does SET lock:ticket:123 <token> NX EX 30 accomplish?",
    answer: "Both try to set the same key. NX means 'only if it does not already exist', so exactly one SET succeeds and that server holds the lock; the loser gets nil and retries or gives up. EX 30 makes the lock expire on its own so a holder that dies cannot block everyone forever, and the token is a value unique to the holder so it can later prove the lock is still its own before releasing it.",
    keyPoints: [
      "NX makes acquisition atomic — exactly one setter can win",
      "EX 30 bounds how long a dead holder can keep it",
      "the token identifies the owner, for a safe release"
    ],
    explanation: "It is the occupied sign on a cubicle door: one person flips it, everyone else waits, it flips back when they leave — with a caretaker who opens the door if nobody comes out in thirty seconds. Worth knowing the limit: a single-instance Redis lock is an optimisation, not a correctness guarantee. If two servers must never both sell the ticket, the database has to enforce that too."
  },
  {
    id: "red-016",
    topic: "redis · locks",
    type: "open",
    question: "Server A obtains a Redis lock and immediately crashes. Why is having an expiration on the lock essential?",
    answer: "Because nothing else will ever remove it. The process that would have released it is gone, so without a TTL the key sits there forever and every other server waits on a lock whose owner no longer exists — a deadlock that outlives the incident and needs a human with redis-cli to clear. The expiry turns that into a bounded stall that heals itself.",
    keyPoints: [
      "a crashed holder never releases, so the lock is held forever",
      "the TTL makes recovery automatic rather than manual"
    ],
    explanation: "The uncomfortable part is choosing the number. The TTL has to exceed the longest legitimate hold or you will expire a lock out from under a worker that is merely slow — which is the setup for the next failure. Real implementations answer this by renewing the lock while the work is still running rather than guessing generously up front."
  },
  {
    id: "red-017",
    topic: "redis · locks",
    type: "open",
    question: "Server A holds a lock with token ABC. Its lock expires while A is stalled, and Server B then acquires the same lock with token XYZ. A wakes up and blindly runs DEL lock. What catastrophic mistake just happened, and how does checking the token first prevent it?",
    answer: "A deleted B's lock. A believed it still held the lock, but ownership had already expired and passed on, so the DEL released a lock A did not own — and now a third server can acquire it while B is still working, so two holders run at once. The fix is a conditional release: delete only if the stored value still equals your own token. That compare-and-delete has to be atomic — a Lua script — or you have just moved the same race into the gap between the GET and the DEL.",
    keyPoints: [
      "A released a lock owned by B, so two holders can now run concurrently",
      "delete only if the value still matches your token",
      "the check and the delete must be atomic, e.g. via Lua"
    ],
    explanation: "This is the standard argument for why a lock is not merely a key. Notice, though, that the token check makes the *release* safe without making A's *work* safe: A was stalled past its lease and may still be mid-transaction. A fencing token — a number that increases on each acquisition and is checked by the resource being protected — is what actually stops the stalled holder from writing."
  },
  {
    id: "red-018",
    topic: "redis · transactions",
    type: "open",
    question: "Conflicts are rare, so rather than locking a value before modifying it you decide to verify at commit time. Describe the workflow with WATCH, MULTI and EXEC, and say what happens if another client changes the watched key first.",
    answer: "WATCH the key, read it, compute the new value in your own code, then MULTI, queue the write, and EXEC. If any watched key was modified by anyone between the WATCH and the EXEC, EXEC applies nothing and returns nil — so you never commit a decision based on a value that has since moved. You re-read and retry the whole sequence.",
    keyPoints: [
      "WATCH the key, read, compute, MULTI, queue, EXEC",
      "EXEC aborts and returns nil if a watched key changed",
      "the client retries the read-compute-commit cycle"
    ],
    explanation: "This is compare-and-swap with the comparison delegated to the server. Two things to remember: nothing is blocked, so a hot key under contention can starve a client that keeps retrying, and MULTI/EXEC is not a rollback — it is a batch that runs entirely or not at all, with no way to abort partway through on an error."
  },
  {
    id: "red-019",
    topic: "redis · transactions",
    type: "open",
    question: "One approach acquires a lock before touching anything; the other reads freely and only verifies at commit time that nobody interfered. Which is pessimistic concurrency and which is optimistic, and why do those names make sense?",
    answer: "Taking the lock first is pessimistic: it assumes a conflict is likely enough to be worth preventing, so it excludes everyone else up front. The WATCH-and-verify approach is optimistic: it assumes a conflict probably will not happen, does the work without coordinating, and checks at the end whether that assumption held — accepting a retry as the price when it did not.",
    keyPoints: [
      "lock first = pessimistic; verify at commit = optimistic",
      "the names describe each one's assumption about how likely a conflict is"
    ],
    explanation: "The choice follows contention rather than taste. Under low contention optimistic wins outright — no lock traffic, no leases, no stalled-holder problem. Under high contention it degrades badly, because every retry is work thrown away, and the pessimistic version's queueing starts to look like a feature."
  },
  {
    id: "red-020",
    topic: "redis · transactions",
    type: "open",
    question: "Your rate limiter needs to remove old requests, count what is left, and possibly insert the new one. Why could running those as three unrelated Redis commands introduce concurrency problems, and why might a Lua script help?",
    answer: "Because other clients run in between. Two requests from the same user can both trim, both count 99, and both add — letting 101 through a limit of 100. The three commands are individually atomic but the decision spanning them is not. A Lua script is sent as one unit and runs to completion with no other command interleaving, so trim, count and conditional add become a single atomic operation.",
    keyPoints: [
      "another client can interleave between the steps, so the count you acted on is already stale",
      "the sequence, not each command, is what needs to be atomic",
      "EVAL runs the whole script without interleaving"
    ],
    explanation: "The general lesson is that atomic commands do not compose into atomic transactions. Redis offers three ways out — MULTI/EXEC when the steps do not depend on each other's results, WATCH when you can afford to retry, and Lua when you need to branch on a value mid-sequence. A rate limiter needs the third, because 'maybe add' depends on the count."
  },
  {
    id: "red-021",
    topic: "redis · cluster",
    type: "open",
    question: "You have three Redis primaries and your application asks for user:123. Walk the chain: key → hash → hash slot → node. Why does Redis introduce hash slots instead of having the client search every node?",
    answer: "CRC16 of the key modulo 16384 gives a slot number; each primary owns a range of those 16,384 slots; so the client computes the slot itself and goes straight to the one node that owns it — one hop, no search. Slots exist as a layer of indirection: ownership is assigned per slot rather than per key, so a whole slot can move between nodes without the client knowing anything about individual keys.",
    keyPoints: [
      "CRC16(key) mod 16384 → slot → the node owning that slot range",
      "the client computes it locally and goes direct, rather than asking every node",
      "slots decouple key placement from node count, so ownership can move in bulk"
    ],
    explanation: "The alternatives are worse: a directory mapping a hundred million keys to nodes is enormous and constantly changing, and broadcasting to every node makes every request as slow as the slowest node. 16,384 fixed buckets is small enough for every client to hold the whole map and fine-grained enough to divide among nodes. Hash tags — user:{123}:profile — let you force related keys into the same slot when you need them together."
  },
  {
    id: "red-022",
    topic: "redis · cluster",
    type: "open",
    question: "Your three-node cluster is running out of capacity, so you add a fourth node. Does Redis need to move individual requests around? Explain what happens to the hash slots and their keys.",
    answer: "No. Some slots are reassigned from the existing nodes to the new one and the keys hashing into those slots migrate with them — roughly a quarter of the slots move, so roughly a quarter of the keys do. Everything else stays exactly where it was. Clients pick up the new map, and during the migration a MOVED or ASK redirection points them at the right node.",
    keyPoints: [
      "slots are reassigned in bulk and their keys migrate with them",
      "only a fraction of keys move — nothing is relocated per key or per request",
      "clients follow MOVED/ASK redirects and refresh their slot map"
    ],
    explanation: "This is the payoff for the slot layer. Plain modulo-by-node-count hashing would remap nearly every key when the count goes from three to four — a full cache invalidation and a stampede against your database. Fixed slots turn resharding into an ownership change over a small, movable unit."
  },
  {
    id: "red-023",
    topic: "redis · replication",
    type: "open",
    question: "Your Redis primary accepts a write and tells the client it succeeded. Immediately afterward the machine dies, before the replica received that write, and the replica is promoted. What happened to the write, and what does that teach you about Redis as a system of record?",
    answer: "It is gone. Redis replication is asynchronous by default: the primary answers the client as soon as it has applied the write locally, without waiting for any replica, so a failover between the acknowledgement and the propagation loses it — and the client was told it succeeded, so the loss is silent. Treat Redis as a cache or a derived view and keep the authoritative copy somewhere that only acknowledges after a durable, replicated commit.",
    keyPoints: [
      "the acknowledged write is lost, because replication is asynchronous",
      "the client was told it succeeded, so nothing surfaces the loss",
      "Redis is not a system of record; authority belongs in a durable store"
    ],
    explanation: "WAIT lets you block until N replicas have acknowledged, which narrows the window without closing it — it is not a synchronous commit and it does not help in a partition where the old primary keeps taking writes. The general lesson travels well beyond Redis: 'the server said OK' means exactly as much as whatever the server checked before saying it."
  },
  {
    id: "red-024",
    topic: "redis · replication",
    type: "open",
    question: "Your Redis primary is overwhelmed by reads but handles writes comfortably. How could replicas help, and what consistency tradeoff do you accept by reading from them?",
    answer: "Send read traffic to the replicas and keep writes on the primary; each replica holds a full copy, so read capacity scales with the number of replicas while write capacity stays where it is. The tradeoff is stale reads: replication is asynchronous, so a replica can lag, and a client that writes and then immediately reads from a replica may not see its own write.",
    keyPoints: [
      "reads go to replicas, writes stay on the primary — read throughput scales out",
      "stale reads, because replicas lag the primary",
      "read-your-own-writes is not guaranteed"
    ],
    explanation: "Read-after-write is the failure users actually notice: they change a setting, the page reloads off a lagging replica, and it looks like the change was lost. The usual fixes are to route reads to the primary for a short window after a write, or to pin a session to the primary while it matters. And note this scales reads only — sharding is what scales writes."
  },
  {
    id: "red-025",
    topic: "redis · durability",
    type: "open",
    question: "Explain the conceptual difference between Redis RDB snapshots and AOF. If the machine crashes, why might either configuration lose recently acknowledged writes, depending on its settings?",
    answer: "RDB writes a point-in-time snapshot of the whole dataset every so often; AOF appends each write command to a log that can be replayed on restart. A crash under RDB loses everything since the last snapshot, which can be minutes. AOF loses less, but only as little as its fsync policy allows: the default flushes about once a second, so roughly a second of acknowledged writes can still be sitting in the OS buffer. Flushing on every write is the durable setting and costs a great deal of throughput.",
    keyPoints: [
      "RDB = periodic point-in-time snapshot; AOF = append-only log of write commands",
      "RDB loses everything since the last snapshot",
      "AOF's loss window is set by its fsync policy — one second by default"
    ],
    explanation: "The knob is the one every storage system has: how long you are willing to hold an acknowledged write in volatile memory before it reaches disk. Redis defaults to fast rather than durable, which is right for a cache and wrong for a ledger. Most production setups run both — AOF for recovery granularity, RDB for fast restarts and backups."
  },
  {
    id: "red-026",
    topic: "redis · caching",
    type: "open",
    question: "You cache product:123 for five minutes. What does the TTL accomplish, and what should happen when someone requests that product after the TTL has expired?",
    answer: "It bounds staleness — a promise that the cached copy is never more than five minutes behind PostgreSQL, which buys you correctness without having to invalidate on every write. Once it expires the key is simply gone: a read behaves exactly as it would for a key that never existed, so the application takes the miss, reads the source of truth, repopulates Redis and returns the fresh value.",
    keyPoints: [
      "the TTL bounds how stale the cached value can be",
      "after expiry the key behaves as though it does not exist",
      "the read falls through to the database and repopulates the cache"
    ],
    explanation: "Worth knowing how expiry actually happens: Redis removes an expired key lazily when it is next touched, plus a background sampler — 'expired' is about what reads see, not a scheduled deletion. And the miss path is not free. If a popular key expires with a thousand requests in flight, they all miss at once and hit the database together; that is the thundering herd, and it is why hot keys often get early or jittered refresh."
  },
  {
    id: "red-027",
    topic: "redis · memory",
    type: "open",
    question: "Your Redis cache has 64 GB of RAM and eventually fills it. Explain why TTL expiration and memory eviction are different ideas. What does an eviction strategy such as LRU try to accomplish?",
    answer: "TTL expiry is about time and correctness: the key goes because it is too old to trust, whether or not memory is tight. Eviction is about space: Redis has hit maxmemory and must delete something to accept the next write, so it removes keys that have not expired and would otherwise still be perfectly valid. LRU picks the least recently used key on the bet that what has not been read lately will not be read soon — keeping the hot working set resident and giving up the cold tail.",
    keyPoints: [
      "TTL removes a key for being stale; eviction removes it because memory is needed",
      "eviction deletes valid, unexpired data",
      "LRU keeps the hot working set and discards what has not been used recently"
    ],
    explanation: "The policy matters more than people expect: allkeys-lru will evict anything, volatile-lru only touches keys that carry a TTL, and noeviction turns a full cache into write errors — which is the right setting when Redis holds something you cannot afford to drop. Redis's LRU is sampled rather than exact, and LFU is often the better bet when a small set of keys is read far more often than the rest."
  },
  {
    id: "red-028",
    topic: "redis · cluster",
    type: "open",
    question: "You have a 100-node Redis cluster holding 100 million products. A celebrity mentions one, and suddenly 40% of all cache traffic goes to product:8675309. Why does having 100 nodes not solve this, and what would you do about it?",
    answer: "Because that key hashes to one slot, which lives on one node. Sharding spreads keys, not requests for a single key, so one shard takes 40% of your traffic while the other 99 idle — and adding nodes cannot split a key that is already alone. Remedies: cache the value in the application process for a second or two so most requests never reach Redis; serve its reads from replicas; or write it under N suffixed keys that land in different slots and have clients read one at random.",
    keyPoints: [
      "the key lives on a single shard, so sharding cannot spread requests for one key",
      "at least one remedy: in-process caching, read replicas, or copies across several keys"
    ],
    explanation: "Local caching is usually the biggest and cheapest win, since a one-second in-process TTL collapses thousands of requests per server into one. The N-copies trick works but you now own the write fan-out and the fact that the copies can disagree briefly. Detection matters too — redis-cli --hotkeys and the LFU-based OBJECT FREQ will tell you which key is on fire."
  },
  {
    id: "red-029",
    topic: "redis · performance",
    type: "open",
    question: "Your application needs 100 independent Redis values. If you send one request, wait for the response, then send the next, 100 times over, what is likely to dominate the latency? How does pipelining improve this without making any individual command faster?",
    answer: "Network round trips. Redis will service each command in microseconds, but each one costs a full round trip — at half a millisecond that is 50 ms of waiting and almost no work. Pipelining writes all 100 commands to the socket without waiting for replies, then reads the 100 replies, so you pay roughly one round trip instead of a hundred. Each command still takes exactly as long as before; what you removed was the idle time between them.",
    keyPoints: [
      "round-trip latency dominates — the commands themselves take microseconds",
      "pipelining sends many commands without waiting, then reads all the replies",
      "it removes waiting, not per-command execution time"
    ],
    explanation: "MGET does the same thing for the special case of plain string reads, and is better still. Two limits worth knowing: pipelined commands are not atomic — other clients interleave between them — and a pipeline of a hundred thousand commands holds a large reply buffer in memory, so batch in chunks."
  },
  {
    id: "red-030",
    topic: "redis · architecture",
    type: "open",
    question: "Design the Redis layer for an Uber-like service. Pick a structure or capability for each of these, and say why:\n· fast driver-session lookups\n· nearby-driver search\n· API rate limiting\n· real-time location notifications that can be missed\n· reliable background payment jobs that cannot disappear\n· a counter for rides completed today\n· coordination so two workers never claim the same scarce resource",
    answer: "Driver sessions → a Hash per session, so any stateless server can read it and update one field. Nearby drivers → a geospatial index (GEOADD/GEOSEARCH), which is a Sorted Set scored by geohash and answers radius queries directly. Rate limiting → a Sorted Set per user for a rolling window, or a String counter per bucket if a fixed window is good enough. Live location notifications → Pub/Sub, since they are disposable and only current subscribers matter. Payment jobs → a Stream with a consumer group, so a job stays pending until acknowledged and can be claimed by another worker after a crash. Rides today → a String with INCR on a date-keyed counter. Scarce-resource coordination → a distributed lock with SET NX EX and a token, remembering that the authoritative store should still enforce the invariant.",
    keyPoints: [
      "driver sessions → Hash",
      "nearby drivers → geospatial index / GEOSEARCH",
      "rate limiting → Sorted Set (sliding) or String counter (fixed)",
      "missable location notifications → Pub/Sub",
      "payment jobs → Stream with a consumer group",
      "rides completed today → String with INCR",
      "scarce-resource coordination → distributed lock (SET NX EX)"
    ],
    explanation: "The through-line is what a lost message costs, and the shape of the read. Locations are disposable and constantly replaced, so a bus is fine; payments are not, so you need a log with acknowledgements. Note where the answer hedges: the ride counter wants the date in the key — rides:completed:2026-08-11 — so 'today' is well defined and old counters expire, and the lock is an optimisation. If two workers claiming one resource would be a real correctness failure, a unique constraint in the database is what actually prevents it."
  },

  /* ---------------------------------------------------------------------------
     ELASTICSEARCH — distributed search, what the index does at write time versus
     read time, and how documents get modelled for the queries you actually run.
     ------------------------------------------------------------------------ */
  {
    id: "els-001",
    topic: "elasticsearch · distributed search",
    type: "open",
    question: "You have 3 shards. A user searches for 'machine learning books' and asks for the top 10. Walk through what happens from the moment Elasticsearch receives the query until those 10 documents come back. Where does scoring happen, and who decides the global top 10?",
    answer: "The node that receives the request becomes the coordinator and fans the query out to all three shards. Each shard searches only its own documents, scores the matches with the same scoring logic, sorts them locally and returns its own top candidates — ids and sort values, not whole documents. The coordinator merges those three ranked lists into one global ordering, keeps the best 10, and then fetches the actual documents for just those 10. So scoring happens on each shard, and only the coordinator can know the global ranking.",
    keyPoints: [
      "the coordinating node fans out to all shards; each searches only its own documents",
      "scoring happens locally on each shard",
      "the coordinator merges the shard-level lists to produce the global top 10"
    ],
    explanation: "This is the query-then-fetch split, and it exists to move as little data as possible: the scatter phase moves ids and scores, and only the surviving ten documents are actually retrieved. One consequence worth knowing — because each shard scores using its own local term statistics, scores are not strictly comparable across shards. With a reasonable number of documents this washes out, and dfs_query_then_fetch is the fix when it does not."
  },
  {
    id: "els-002",
    topic: "elasticsearch · pagination",
    type: "open",
    question: "You have 5 shards and a page size of 20. A user requests from: 9980, size: 20. Explain why that is substantially more expensive than from: 0, size: 20. What work does each shard do, what does the coordinator do, and what gets thrown away?",
    answer: "To know which documents are globally 9,981st to 10,000th, every shard has to return its own top 10,000 — because any of them could contain all of them. So five shards each build and sort a 10,000-entry list and ship it to the coordinator, which merges 50,000 entries, discards the first 9,980 of the merged order, and returns 20. Almost all of that sorting, transferring and merging is thrown away, and the cost grows with the page number rather than the page size.",
    keyPoints: [
      "each shard must return from + size — its own top 10,000, not just 20",
      "the coordinator merges shards × (from + size) entries and discards the first 9,980",
      "the work scales with how deep the page is, not with how many results are wanted"
    ],
    explanation: "This is why index.max_result_window defaults to 10,000 — it is a guardrail, not an arbitrary limit, and raising it moves the memory pressure onto the coordinator. The deeper problem is that offset pagination asks a question no distributed system answers cheaply: 'skip the first N of a global order' requires materialising that global order first."
  },
  {
    id: "els-003",
    topic: "elasticsearch · pagination",
    type: "open",
    question: "The product team replaces deep from/size pagination with search_after. What must the client send with its next request, and why does that let Elasticsearch avoid most of the work above?",
    answer: "The client sends back the sort values of the last document on the previous page — and the sort must be deterministic, so it needs a tiebreaker such as _id or _shard_doc. Those values act as a cursor: each shard seeks to that position in its sorted order and collects only the next 20, so no shard builds a 10,000-entry list and the coordinator merges 5 × 20 instead of 5 × 10,000. The cost is the same on page 500 as on page 1.",
    keyPoints: [
      "the sort values of the last document from the previous page, with a tiebreaker for a total order",
      "shards resume from that cursor rather than rebuilding and discarding everything before it",
      "cost becomes independent of how deep you are"
    ],
    explanation: "The trade you are making is that you can no longer jump: search_after gives sequential paging only, which is why it fits infinite scroll and not a page-number bar. It is the same reason keyset pagination beats OFFSET in SQL — 'continue after this value' is answerable from an index, 'skip 9,980 rows' is not."
  },
  {
    id: "els-004",
    topic: "elasticsearch · pagination",
    type: "open",
    question: "You are using search_after, but documents are being added and updated while a user pages, and they start seeing duplicates and missing results. Why does that happen, and what does a Point-in-Time snapshot change? What does PIT solve that search_after alone does not?",
    answer: "search_after does not freeze anything — each request runs against whatever the index looks like at that moment. A document inserted before your cursor pushes everything down, so a result you already saw shifts past the cursor and appears again; a deletion or a re-scored update pulls things up, so a result you had not reached yet slides above the cursor and is skipped. A PIT pins every request in the sequence to one consistent view of the index, so the ordering the cursor is walking stops moving underneath it. search_after solves efficiency; PIT solves consistency.",
    keyPoints: [
      "the index keeps changing between requests, so positions shift under the cursor",
      "shifts cause both duplicates and skipped results",
      "PIT pins all requests to one consistent view — search_after is about cost, PIT is about consistency"
    ],
    explanation: "The two are complementary rather than alternatives, which is the thing to keep. Note what a PIT costs: it holds the underlying segments open for its keep_alive, so the disk they occupy cannot be reclaimed while it lives — long-lived PITs are a real resource commitment, and you close them when the user stops scrolling."
  },
  {
    id: "els-005",
    topic: "elasticsearch · inverted index",
    type: "open",
    question: "Your cluster contains 100 million books and someone searches for 'distributed systems'. Explain why Elasticsearch does not need to scan 100 million documents. What work done at indexing time makes the query possible?",
    answer: "At indexing time Elasticsearch built an inverted index: rather than only mapping each document to its terms, it maps each term to the sorted list of documents containing it. So the query looks up the posting list for 'distributed' and the one for 'systems', intersects or unions those two lists, and works only from that candidate set — which might be a few thousand books. The 100 million documents that contain neither term are never examined, because nothing ever points at them.",
    keyPoints: [
      "an inverted index built at index time maps term → the documents containing it",
      "the query reads the posting lists for the query terms and works from those candidates only",
      "documents that match nothing are never touched"
    ],
    explanation: "The trade is stated plainly by the name: you did the work up front, at write time, so reads are cheap. That is also why indexing is the expensive half of Elasticsearch, why reindexing hurts, and why a field you never search should not be indexed at all. Posting lists being sorted is what makes the intersection a merge rather than a lookup per document."
  },
  {
    id: "els-006",
    topic: "elasticsearch · scoring",
    type: "open",
    question: "A developer says: 'BM25 ranks our documents, so Elasticsearch must calculate BM25 scores when documents are indexed.' Do you agree? Separate what Elasticsearch does at indexing time from what it does at query time.",
    answer: "No. A BM25 score is a property of a document-query pair, and the query does not exist yet at indexing time. What indexing does is prepare the inputs: analyse and tokenise the text, normalise the terms, build the posting lists, and store the statistics BM25 needs — term frequency per document, document length, and the document frequency of each term. At query time Elasticsearch takes the query's terms, pulls those precomputed statistics for the candidate documents, and computes the score then. Indexing prepares the ingredients; querying computes the score.",
    keyPoints: [
      "no — scoring is per document-query pair and happens at query time",
      "indexing analyses text and stores term frequencies, document lengths and document frequencies",
      "the query supplies the terms; the score is computed from the stored statistics"
    ],
    explanation: "A good way to see it is that changing the query changes every score without touching a single document, while changing the similarity settings requires a reindex only because the stored statistics change. It also explains the cross-shard scoring wrinkle: document frequency is a per-shard statistic, so the same document can score slightly differently depending on which shard it landed in."
  },
  {
    id: "els-007",
    topic: "elasticsearch · mappings",
    type: "open",
    question: "Your Book object has 120 fields, but users only search, filter, sort or aggregate on 15 of them. Someone proposes dynamically indexing all 120 because 'we might need them someday'. What are the tradeoffs, and how would you decide what actually gets indexed?",
    answer: "Every indexed field costs disk, indexing CPU and heap, and the mapping itself becomes hard to change later. I would decide from the query patterns: a field that is searched needs a text mapping with an analyser, one that is filtered, sorted or aggregated needs a keyword or numeric doc-values mapping, and the remaining 105 can stay in _source with index: false — still returned with the document, just not searchable. Turning dynamic mapping off, or setting it to strict, stops the other 105 from quietly becoming indexed fields the first time someone sends an unexpected key.",
    keyPoints: [
      "indexed fields cost storage, indexing CPU, memory, and mapping rigidity",
      "decide from the query pattern: searched vs filtered/sorted/aggregated vs merely returned",
      "unsearched fields can live in _source with index: false; disable or restrict dynamic mapping"
    ],
    explanation: "The 'someday' argument is weaker than it sounds, because you can reindex when someday arrives — you already have the source of truth. What you cannot easily undo is a mapping explosion: dynamic mapping over user-supplied keys is the classic way to end up with tens of thousands of fields and a cluster state nobody can update."
  },

  {
    id: "els-scn-001",
    topic: "elasticsearch · modelling",
    type: "scenario",
    scenario: "You are designing the Elasticsearch document for a book. Whenever users retrieve a book, they also need related data alongside it, and you are deciding what to embed in the book document and what to keep separate.",
    steps: [
      {
        id: "els-008",
        type: "open",
        question: "The related data is publisher information, which almost never changes. Would you embed it in the book document or keep it separate? Answer in terms of read and update patterns, not just 'denormalisation is faster'.",
        answer: "Embed it. The read pattern is that publisher data is needed on essentially every book retrieval, and Elasticsearch has no join, so keeping it separate means a second lookup or an application-side stitch on every search. The update pattern is what makes that safe: publisher data almost never changes, so the duplication you are taking on is rarely invalidated — and when a publisher does change, reindexing the affected books is a rare, batchable job rather than continuous churn.",
        keyPoints: [
          "embed it",
          "read pattern: needed on every book read, and there is no join to fall back on",
          "update pattern: it changes rarely, so the duplicated copy is rarely invalidated"
        ],
        explanation: "The reason to phrase it as read pattern versus update pattern is that denormalisation is not a speed trick, it is a bet: you are trading write amplification for read simplicity. The bet pays when reads are frequent and writes are rare, which is exactly this case — and it is the same bet with the opposite answer when the embedded data is volatile."
      },
      {
        id: "els-009",
        type: "open",
        question: "Now the same question for reviews instead. A popular book gets 100 new reviews a minute, and reviews can be edited independently. Why does embedding every review inside the book document become a problem, and what changes when reviews get their own index?",
        answer: "Because Elasticsearch documents are immutable — an update rewrites and reindexes the whole document. Embedding reviews means one new review on a popular book rewrites the entire book document, including all its existing reviews, a hundred times a minute; the document grows without bound, every rewrite invalidates segments and feeds merge pressure, and concurrent edits to different reviews conflict at the document level. Moving reviews to their own index makes each review its own small document that can be written or edited independently, leaves the book document stable, and lets the two scale separately. The cost is that book-plus-reviews now takes a second query and application-side composition.",
        keyPoints: [
          "documents are immutable, so every new review rewrites the whole book document",
          "write amplification, unbounded document growth, merge pressure and update conflicts",
          "a separate index makes reviews independently writable; the price is a second lookup"
        ],
        explanation: "This is the same decision as the publisher one with the update pattern reversed, which is why the two make sense as a pair rather than as separate rules. Worth knowing the middle options: nested fields keep the data in one document but still rewrite it on every change, and join fields avoid the rewrite at real query cost — neither rescues you from a hundred writes a minute."
      }
    ]
  },

  {
    id: "els-010",
    topic: "elasticsearch · architecture",
    type: "open",
    question: "Design book search for an Amazon-like application. PostgreSQL is the source of truth. Users need full-text search, filtering by category and price, sorting, reviews, and infinite-scroll pagination. Cover: what gets indexed, how PostgreSQL changes reach Elasticsearch, how you model books versus reviews, how a search executes across shards, and which pagination strategy you choose.",
    answer: "PostgreSQL stays authoritative for books, prices, inventory, reviews and anything transactional; Elasticsearch is a search-optimised read model that can be rebuilt from it. Changes flow one way — CDC off the write-ahead log into Kafka, or an outbox table drained by an indexer — into denormalised book documents holding the fields needed for search (title, author, description), for filtering and sorting (category as a keyword, price as a numeric), and the handful of fields the results list displays. Books and reviews are separate indices, because reviews change constantly and books do not; a review count and an average rating are denormalised onto the book so results can be filtered and sorted without a join. A search fans out from the coordinating node to every shard, each scoring its own documents locally and returning candidates, and the coordinator merges them into the global ranking. For infinite scroll, search_after with a tiebreaker, and a PIT when the catalogue is being reindexed while a user scrolls.",
    keyPoints: [
      "PostgreSQL is the source of truth; Elasticsearch is a rebuildable read model",
      "changes propagate via CDC / an outbox / an indexing pipeline, one direction only",
      "index only what is searched, filtered, sorted or displayed — denormalised into a book document",
      "books and reviews in separate indices, with rating aggregates denormalised onto the book",
      "query-then-fetch across shards, merged into a global ranking by the coordinator",
      "search_after (with PIT) for infinite scroll rather than deep from/size"
    ],
    explanation: "The load-bearing decision is the first one: naming Elasticsearch a derived index rather than a database means you can always drop and rebuild it, which is what makes mapping changes and reindexes routine instead of frightening. The parts most people leave out are the propagation lag — search is eventually consistent with checkout, so the price shown may need re-validating at purchase — and what happens when the pipeline stalls, which is the failure that quietly serves a stale catalogue for hours."
  }

];

/* Expose for the plain <script> tag in index.html (no modules, no build step). */
window.QUESTIONS = QUESTIONS;
